import { NextRequest, after } from "next/server";
import prisma from "@/lib/db/prisma";
import { err, ok, validationError } from "@/lib/utils/api";
import { ConfirmClientDocumentsUploadSchema } from "@/lib/utils/validators";
import { processClientDocument } from "@/lib/client-documents/process";

export const maxDuration = 300;

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

    for (const document of documents) {
      after(async () => {
        try {
          await processClientDocument(document.id);
        } catch (processError) {
          console.error(`[client-documents/confirm] background extraction failed for ${document.id}:`, processError);
        }
      });
    }

    return ok({ queuedDocumentIds: documents.map((document) => document.id) });
  } catch (error) {
    console.error("[client-documents/confirm]", error);
    return err("Files were stored but could not be scheduled for extraction. Please retry.", 503);
  }
}
