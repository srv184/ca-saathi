import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { generateNoticeReply } from "@/lib/ai/index";
import { err, ok } from "@/lib/utils/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const notice = await prisma.notice.findFirst({
      where: { id: params.id, client: { firm_id: firmId } },
      include: { client: { include: { firm: { select: { name: true } } } } },
    });
    if (!notice) return err("Notice not found", 404);
    if (!notice.ocr_text) return err("Notice text is unavailable", 422);

    await prisma.notice.update({
      where: { id: notice.id },
      data: { ai_status: "PROCESSING" },
    });

    try {
      const result = await generateNoticeReply({
        noticeText: notice.ocr_text,
        noticeType: notice.notice_type,
        clientName: notice.client.name,
        firmName: notice.client.firm.name,
        assessmentYear: notice.assessment_year ?? undefined,
      });

      const updated = await prisma.notice.update({
        where: { id: notice.id },
        data: {
          ai_status: "COMPLETED",
          ai_draft: result.draft,
          ai_summary: result.summary,
          ai_citations: result.citations,
        },
      });
      return ok(updated);
    } catch (error) {
      console.error("[notices/[id]/generate]", error);
      await prisma.notice.update({
        where: { id: notice.id },
        data: { ai_status: "FAILED" },
      });
      return err("AI could not generate a complete reply. Please try again.", 502);
    }
  } catch (error) {
    console.error("[notices/[id]/generate]", error);
    return err("Something went wrong", 500);
  }
}
