import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err, validationError } from "@/lib/utils/api";
import { ReviewNoticeSchema } from "@/lib/utils/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const firmId = req.headers.get("x-firm-id");
    const userId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");
    if (!firmId || !userId) return err("Unauthorized", 401);

    // Only OWNER and SENIOR_CA can mark as reviewed
    if (!["OWNER", "SENIOR_CA"].includes(role ?? "")) {
      return err("Only Senior CA or Owner can review notices", 403);
    }

    const notice = await prisma.notice.findFirst({
      where: {
        id: params.id,
        client: { firm_id: firmId },
      },
    });

    if (!notice) return err("Notice not found", 404);

    if (notice.ai_status !== "COMPLETED") {
      return err("AI processing is not complete yet", 400);
    }

    if (
      notice.review_status === "REVIEWED" ||
      notice.review_status === "FILED"
    ) {
      return err("Notice has already been reviewed", 400);
    }

    const body = await req.json();
    const parsed = ReviewNoticeSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updated = await prisma.notice.update({
      where: { id: params.id },
      data: {
        review_status: "REVIEWED",
        reviewed_by: userId,
        reviewed_at: new Date(),
        ca_edited_reply: parsed.data.editedReply,
      },
    });

    return ok({
      message: "Notice marked as reviewed. You can now download the PDF.",
      notice: updated,
    });
  } catch (error) {
    console.error("[notices/[id]/review]", error);
    return err("Something went wrong", 500);
  }
}
