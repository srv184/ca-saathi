import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { getDownloadUrl } from "@/lib/storage/supabase";
import { ok, err } from "@/lib/utils/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const notice = await prisma.notice.findFirst({
      where: {
        id: params.id,
        client: { firm_id: firmId },
      },
      include: {
        client: {
          select: { name: true, pan_encrypted: true, entity_type: true },
        },
        reviewer: { select: { name: true } },
      },
    });

    if (!notice) return err("Notice not found", 404);

    let documentUrl: string | null = null;
    if (notice.document_r2_key) {
      try {
        documentUrl = await getDownloadUrl(notice.document_r2_key);
      } catch (error) {
        // A deleted or temporarily unavailable file must not make the notice
        // record itself inaccessible.
        console.error("[notices/[id]/document-url]", error);
      }
    }

    return ok({ ...notice, documentUrl });
  } catch (error) {
    console.error("[notices/[id]/GET]", error);
    return err("Something went wrong", 500);
  }
}
