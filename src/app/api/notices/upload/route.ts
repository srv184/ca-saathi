import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { deleteFile, uploadBuffer } from "@/lib/storage/supabase";
import { err, ok } from "@/lib/utils/api";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const EXTENSION_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function cleanFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "notice";
}

function detectMimeType(file: File) {
  if (MIME_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME_TYPES[ext];
}

function hasExpectedSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") return buffer.subarray(0, 4).toString() === "%PDF";
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8;
  return (
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  );
}

async function verifyClient(clientId: string, firmId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, firm_id: firmId, deleted_at: null },
    select: { id: true },
  });
}

export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const formData = await req.formData();
    const clientId = formData.get("clientId");
    const file = formData.get("file");
    if (typeof clientId !== "string" || !clientId) return err("Client is required", 400);
    if (!(file instanceof File)) return err("Notice file is required", 400);
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return err("Notice must be between 1 byte and 10 MB", 400);
    }

    const mimeType = detectMimeType(file);
    if (!mimeType) return err("Only PDF, JPG, and PNG notices are accepted", 400);

    const client = await verifyClient(clientId, firmId);
    if (!client) return err("Client not found", 404);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedSignature(buffer, mimeType)) {
      return err("The uploaded file does not match its declared type", 400);
    }

    const filename = cleanFilename(file.name);
    const storageKey = `notices/${client.id}/${Date.now()}-${filename}`;
    await uploadBuffer(storageKey, buffer, mimeType);

    return ok({ storageKey, filename, fileSize: file.size, mimeType });
  } catch (error) {
    console.error("[notices/upload]", error);
    return err("Unable to upload notice", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const storageKey = searchParams.get("storageKey");
    if (!clientId || !storageKey) return err("Client and storage key are required", 400);

    const client = await verifyClient(clientId, firmId);
    if (!client) return err("Client not found", 404);
    if (!storageKey.startsWith(`notices/${client.id}/`)) return err("Invalid notice storage key", 400);

    await deleteFile(storageKey);
    return ok({ deleted: true });
  } catch (error) {
    console.error("[notices/upload/DELETE]", error);
    return err("Unable to remove notice upload", 500);
  }
}
