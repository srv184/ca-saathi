import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { err, ok } from "@/lib/utils/api";
import { enqueueClientDocument } from "@/lib/client-documents/queue";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);
    const document = await prisma.clientDocument.findFirst({
      where: { id: params.id, client: { firm_id: firmId, deleted_at: null } },
      select: { id: true, extraction_status: true },
    });
    if (!document) return err("Document not found", 404);
    if (document.extraction_status !== "FAILED") return err("Only failed documents can be retried", 409);

    await prisma.clientDocument.update({
      where: { id: document.id },
      data: { extraction_status: "PENDING", extraction_failure_reason: null },
    });
    await enqueueClientDocument(document.id);
    return ok({ documentId: document.id, extractionStatus: "PENDING" });
  } catch (error) {
    console.error("[client-documents/retry]", error);
    return err("Unable to retry document extraction", 503);
  }
}
