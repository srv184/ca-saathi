import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, created, err, validationError } from "@/lib/utils/api";
import { ConfirmUploadSchema } from "@/lib/utils/validators";

export async function GET(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const docType = searchParams.get("docType");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") ?? "20"),
      100,
    );

    const where: Record<string, unknown> = {
      client: { firm_id: firmId },
      deleted_at: null,
      ...(clientId ? { client_id: clientId } : {}),
      ...(docType ? { doc_type: docType } : {}),
    };

    const [docs, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: { select: { name: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return ok({
      data: docs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[documents/GET]", error);
    return err("Something went wrong", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    const userId = req.headers.get("x-user-id");
    if (!firmId) return err("Unauthorized", 401);

    const body = await req.json();
    const parsed = ConfirmUploadSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const {
      clientId,
      r2Key,
      filename,
      fileSize,
      contentType,
      docType,
      fileHash,
      financialYear,
    } = parsed.data;

    // Verify client belongs to this firm
    const client = await prisma.client.findFirst({
      where: { id: clientId, firm_id: firmId, deleted_at: null },
    });
    if (!client) return err("Client not found", 404);

    // Duplicate detection via file hash
    if (fileHash) {
      const existing = await prisma.document.findFirst({
        where: { file_hash: fileHash, deleted_at: null },
      });
      if (existing) {
        return err("This exact file has already been uploaded", 409);
      }
    }

    const doc = await prisma.document.create({
      data: {
        client_id: clientId,
        uploaded_by: userId ?? undefined,
        name: filename,
        r2_key: r2Key,
        file_size: fileSize,
        mime_type: contentType,
        file_hash: fileHash,
        doc_type: docType as never,
        source: "CA_UPLOAD",
        financial_year: financialYear,
      },
    });

    // Mark onboarding step complete
    await prisma.onboardingState.updateMany({
      where: { firm_id: firmId },
      data: { step_upload_document: true },
    });

    return created(doc);
  } catch (error) {
    console.error("[documents/POST]", error);
    return err("Something went wrong", 500);
  }
}
