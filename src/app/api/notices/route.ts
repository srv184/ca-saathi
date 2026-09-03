import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, created, err, validationError } from "@/lib/utils/api";
import { CreateNoticeSchema } from "@/lib/utils/validators";
import { generateNoticeReply } from "@/lib/ai/index";
import { aiRatelimit } from "@/lib/utils/ratelimit";
import { downloadBuffer, hashBuffer } from "@/lib/storage/supabase";
import { extractNoticeText } from "@/lib/notices/extract-text";

// OCR uses worker_threads and WASM, which require the Node.js serverless runtime.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const reviewStatus = searchParams.get("reviewStatus");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") ?? "20"),
      100,
    );

    const where: Record<string, unknown> = {
      client: { firm_id: firmId },
      ...(clientId ? { client_id: clientId } : {}),
      ...(reviewStatus ? { review_status: reviewStatus } : {}),
    };

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: { select: { name: true, pan_encrypted: true } },
          reviewer: { select: { name: true } },
        },
      }),
      prisma.notice.count({ where }),
    ]);

    return ok({
      data: notices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[notices/GET]", error);
    return err("Something went wrong", 500);
  }
}

// Add at start of POST after getting firmId:
export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    // A rate-limit outage must not prevent a notice from being processed.
    try {
      const { success: aiAllowed } = await aiRatelimit.limit(firmId);
      if (!aiAllowed)
        return err("AI rate limit exceeded. Try again in 1 hour.", 429);
    } catch (error) {
      console.error(
        "[notices/POST] rate limit service unavailable; allowing request",
        error,
      );
    }

    const body = await req.json();
    const parsed = CreateNoticeSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const {
      clientId,
      noticeType,
      portal,
      section,
      assessmentYear,
      referenceNumber,
      dueDate,
      r2Key,
      contentType,
      fileHash,
    } = parsed.data;

    // Verify client belongs to firm
    const client = await prisma.client.findFirst({
      where: { id: clientId, firm_id: firmId, deleted_at: null },
      include: { firm: { select: { name: true } } },
    });
    if (!client) return err("Client not found", 404);

    const expectedPrefix = `firms/${firmId}/clients/${clientId}/`;
    if (!r2Key.startsWith(expectedPrefix)) {
      return err("Invalid notice storage key", 400);
    }

    const fileBuffer = await downloadBuffer(r2Key);
    if ((await hashBuffer(fileBuffer)) !== fileHash.toLowerCase()) {
      return err("Uploaded notice file could not be verified", 400);
    }

    const ocrText = await extractNoticeText({ buffer: fileBuffer, contentType });
    if (!ocrText) {
      return err("Could not extract text from the uploaded notice", 422);
    }

    // Create notice with PENDING status
    const notice = await prisma.notice.create({
      data: {
        client_id: clientId,
        notice_type: noticeType as never,
        portal: portal as never,
        reference_number: referenceNumber,
        section,
        assessment_year: assessmentYear,
        due_date: dueDate ? new Date(dueDate) : undefined,
        document_r2_key: r2Key,
        ocr_text: ocrText,
        ai_status: "PENDING",
        review_status: "DRAFT",
      },
    });

    // Mark onboarding step
    await prisma.onboardingState.updateMany({
      where: { firm_id: firmId },
      data: { step_upload_notice: true },
    });

    // Process AI in background — do not await
    // This returns immediately to the CA
    processNoticeAi({
      noticeId: notice.id,
      noticeText: ocrText,
      noticeType,
      clientName: client.name,
      firmName: client.firm.name,
      assessmentYear,
    }).catch((error) => {
      console.error("[notices/ai-process]", error);
    });

    return created(notice);
  } catch (error) {
    console.error("[notices/POST]", error);
    return err("Something went wrong", 500);
  }
}

async function processNoticeAi(params: {
  noticeId: string;
  noticeText: string;
  noticeType: string;
  clientName: string;
  firmName: string;
  assessmentYear?: string;
}) {
  try {
    // Mark as processing
    await prisma.notice.update({
      where: { id: params.noticeId },
      data: { ai_status: "PROCESSING" },
    });

    const result = await generateNoticeReply({
      noticeText: params.noticeText,
      noticeType: params.noticeType,
      clientName: params.clientName,
      firmName: params.firmName,
      assessmentYear: params.assessmentYear,
    });

    // Save AI draft
    await prisma.notice.update({
      where: { id: params.noticeId },
      data: {
        ai_status: "COMPLETED",
        ai_draft: result.draft,
        ai_summary: result.summary,
        ai_citations: result.citations,
        review_status: "DRAFT",
      },
    });
  } catch (error) {
    await prisma.notice.update({
      where: { id: params.noticeId },
      data: { ai_status: "FAILED" },
    });
    throw error;
  }
}
