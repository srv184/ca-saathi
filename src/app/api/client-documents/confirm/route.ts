import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { err, ok, validationError } from "@/lib/utils/api";
import { ConfirmClientDocumentsUploadSchema } from "@/lib/utils/validators";
import { enqueueClientDocument } from "@/lib/client-documents/queue";

export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);
    const parsed = ConfirmClientDocumentsUploadSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    const documents = await prisma.clientDocument.findMany({
      where: {
        id: { in: parsed.data.documentIds },
        client: { firm_id: firmId, deleted_at: null },
        extraction_status: "PENDING",
      },
      select: { id: true },
    });
    await Promise.all(documents.map((document) => enqueueClientDocument(document.id)));
    return ok({ queuedDocumentIds: documents.map((document) => document.id) });
  } catch (error) {
    console.error("[client-documents/confirm]", error);
    return err("Files were stored but could not be queued for extraction. Please retry.", 503);
  }
}
