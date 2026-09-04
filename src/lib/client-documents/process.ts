import prisma from "@/lib/db/prisma";
import { classifyClientDocument } from "@/lib/ai";
import { extractDocumentText } from "@/lib/notices/extract-text";
import {
  buildClientDocumentStorageKey,
  copyFile,
  deleteFile,
  downloadBuffer,
  hashBuffer,
} from "@/lib/storage/supabase";

const PERIOD_REQUIRED_TYPES = new Set(["GST_RETURN", "INVOICE", "BANK_STATEMENT"]);

function safeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "document";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 1000) : "Unknown extraction failure";
}

function needsReview(documentType: string, period: string | null, date: string | null, confidence: number): boolean {
  return confidence < 0.6 || (!period && !date && PERIOD_REQUIRED_TYPES.has(documentType));
}

async function markFailed(documentId: string, reason: string): Promise<void> {
  await prisma.clientDocument.update({
    where: { id: documentId },
    data: {
      extraction_status: "FAILED",
      extraction_failure_reason: reason,
      is_latest_version: false,
    },
  });
}

export async function updateLatestDocumentVersion(documentId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        const document = await tx.clientDocument.findUnique({ where: { id: documentId } });
        if (!document || document.extraction_status !== "DONE" || !document.document_period) return;

        const documents = await tx.clientDocument.findMany({
          where: {
            client_id: document.client_id,
            document_type: document.document_type,
            document_period: document.document_period,
            extraction_status: "DONE",
          },
          orderBy: { uploaded_at: "desc" },
        });
        if (!documents.length) return;

        const newest = [...documents].sort((a, b) => {
          if (
            a.extracted_document_date &&
            b.extracted_document_date &&
            a.extracted_document_date.getTime() !== b.extracted_document_date.getTime()
          ) {
            return b.extracted_document_date.getTime() - a.extracted_document_date.getTime();
          }
          return b.uploaded_at.getTime() - a.uploaded_at.getTime();
        })[0];
        const previousLatest = documents.find((candidate) => candidate.is_latest_version);
        await tx.clientDocument.updateMany({
          where: { id: { in: documents.map((candidate) => candidate.id) } },
          data: { is_latest_version: false },
        });
        await tx.clientDocument.update({
          where: { id: newest.id },
          data: {
            is_latest_version: true,
            ...(previousLatest && previousLatest.id !== newest.id
              ? { supersedes_document_id: previousLatest.id }
              : {}),
          },
        });
      }, { isolationLevel: "Serializable" });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}

export async function processClientDocument(documentId: string): Promise<void> {
  const claimed = await prisma.clientDocument.updateMany({
    where: { id: documentId, extraction_status: "PENDING" },
    data: { extraction_status: "PROCESSING", extraction_failure_reason: null },
  });
  if (!claimed.count) return;

  const document = await prisma.clientDocument.findUnique({ where: { id: documentId } });
  if (!document) return;

  try {
    const buffer = await downloadBuffer(document.storage_path);
    if ((await hashBuffer(buffer)) !== document.file_hash.toLowerCase()) {
      throw new Error("Stored file hash does not match the upload hash");
    }

    const extractedText = await extractDocumentText({
      buffer,
      contentType: document.mime_type,
      filename: document.original_filename,
    });
    if (!extractedText.trim()) throw new Error("No readable text could be extracted from this file");

    const classification = await classifyClientDocument(extractedText);
    const status = needsReview(
      classification.documentType,
      classification.documentPeriod,
      classification.extractedDocumentDate,
      classification.confidence,
    ) ? "NEEDS_REVIEW" : "DONE";

    const finalPath = buildClientDocumentStorageKey(
      document.client_id,
      classification.documentType,
      document.id,
      safeFilename(document.original_filename),
    );
    await copyFile(document.storage_path, finalPath);

    await prisma.clientDocument.update({
      where: { id: document.id },
      data: {
        storage_path: finalPath,
        document_type: classification.documentType,
        document_period: classification.documentPeriod,
        extracted_document_date: classification.extractedDocumentDate
          ? new Date(classification.extractedDocumentDate)
          : null,
        extraction_status: status,
        extraction_confidence: classification.confidence,
        extracted_metadata: {
          ...classification,
          extractedTextLength: extractedText.length,
        },
        extraction_failure_reason: null,
        is_latest_version: false,
      },
    });

    try {
      await deleteFile(document.storage_path);
    } catch (cleanupError) {
      console.error("[client-documents] temporary storage cleanup failed", {
        documentId: document.id,
        storagePath: document.storage_path,
        error: errorMessage(cleanupError),
      });
    }

    if (status === "DONE" && classification.documentPeriod) {
      await updateLatestDocumentVersion(document.id);
    }
  } catch (error) {
    console.error("[client-documents] extraction failed", { documentId, error });
    await markFailed(documentId, errorMessage(error));
    throw error;
  }
}
