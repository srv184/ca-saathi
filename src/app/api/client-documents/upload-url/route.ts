import crypto from "crypto";
import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { err, ok, validationError } from "@/lib/utils/api";
import { PrepareClientDocumentsUploadSchema } from "@/lib/utils/validators";
import { buildClientDocumentStorageKey, getUploadUrl } from "@/lib/storage/supabase";

function safeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "document";
}

export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    const userId = req.headers.get("x-user-id");
    if (!firmId || !userId) return err("Unauthorized", 401);

    const parsed = PrepareClientDocumentsUploadSchema.safeParse(await req.json());
    if (!parsed.success) return validationError(parsed.error);

    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, firm_id: firmId, deleted_at: null },
      select: { id: true },
    });
    if (!client) return err("Client not found", 404);

    const hashes = parsed.data.files.map((file) => file.fileHash.toLowerCase());
    const existing = await prisma.clientDocument.findMany({
      where: { client_id: client.id, file_hash: { in: hashes } },
      select: { file_hash: true },
    });
    const existingHashes = new Set(existing.map((file) => file.file_hash));
    const seenHashes = new Set<string>();
    const duplicates: { filename: string; reason: string }[] = [];
    const accepted: { documentId: string; filename: string; fileHash: string; uploadUrl: string; storagePath: string }[] = [];

    for (const file of parsed.data.files) {
      const fileHash = file.fileHash.toLowerCase();
      if (existingHashes.has(fileHash) || seenHashes.has(fileHash)) {
        duplicates.push({ filename: file.filename, reason: "This exact file was already selected or uploaded for this client." });
        continue;
      }
      seenHashes.add(fileHash);

      const documentId = crypto.randomUUID();
      const filename = safeFilename(file.filename);
      const storagePath = buildClientDocumentStorageKey(client.id, "OTHER", documentId, filename);
      await prisma.clientDocument.create({
        data: {
          id: documentId,
          client_id: client.id,
          uploaded_by_user_id: userId,
          storage_path: storagePath,
          original_filename: file.filename,
          mime_type: file.contentType || "application/octet-stream",
          file_size_bytes: file.fileSizeBytes,
          file_hash: fileHash,
        },
      });
      accepted.push({
        documentId,
        filename: file.filename,
        fileHash,
        storagePath,
        uploadUrl: await getUploadUrl(storagePath),
      });
    }

    return ok({ accepted, duplicates, maxFileSize: 25 * 1024 * 1024 });
  } catch (error) {
    console.error("[client-documents/upload-url]", error);
    return err("Unable to prepare document upload", 500);
  }
}
