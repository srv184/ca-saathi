import { NextRequest, after } from "next/server";
import prisma from "@/lib/db/prisma";
import { err, ok } from "@/lib/utils/api";
import { processClientDocument } from "@/lib/client-documents/process";

export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);
    const document = await prisma.clientDocument.findFirst({
      where: { id, client: { firm_id: firmId, deleted_at: null } },
      select: { id: true, extraction_status: true },
    });
    if (!document) return err("Document not found", 404);
    if (document.extraction_status !== "FAILED") return err("Only failed documents can be retried", 409);

    await prisma.clientDocument.update({
      where: { id: document.id },
      data: { extraction_status: "PENDING", extraction_failure_reason: null },
    });

    after(async () => {
      try {
        await processClientDocument(document.id);
      } catch (processError) {
        console.error(`[client-documents/retry] background extraction failed for ${document.id}:`, processError);
      }
    });

    return ok({ documentId: document.id, extractionStatus: "PENDING" });
  } catch (error) {
    console.error("[client-documents/retry]", error);
    return err("Unable to retry document extraction", 503);
  }
}
