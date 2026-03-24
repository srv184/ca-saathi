import { NextRequest } from "next/server";
import { buildStorageKey, getUploadUrl } from "@/lib/storage/supabase";
import { ok, err, validationError } from "@/lib/utils/api";
import { RequestUploadUrlSchema } from "@/lib/utils/validators";
import prisma from "@/lib/db/prisma";
import { verifyRequest } from "@/lib/auth/verify-request";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

export async function POST(req: NextRequest) {
  try {
    // Verify JWT — works for both CA dashboard and client portal
    const verified = verifyRequest(req);
    const firmId = verified?.firmId ?? req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const body = await req.json();
    const parsed = RequestUploadUrlSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { clientId, filename, contentType, docType } = parsed.data;

    // Validate file type
    if (!ALLOWED_TYPES.includes(contentType)) {
      return err(
        "File type not allowed. Only PDF, images, Excel and CSV are accepted.",
        400,
      );
    }

    // Validate filename
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (cleanFilename.length > 200) {
      return err("Filename too long", 400);
    }

    // Verify client belongs to this firm
    const client = await prisma.client.findFirst({
      where: { id: clientId, firm_id: firmId, deleted_at: null },
    });
    if (!client) return err("Client not found", 404);

    const storageKey = buildStorageKey(firmId, clientId, cleanFilename);
    const uploadUrl = await getUploadUrl(storageKey, contentType);

    return ok({
      uploadUrl,
      storageKey,
      maxFileSize: MAX_FILE_SIZE,
      expiresIn: 300, // 5 minutes
    });
  } catch (error) {
    console.error("[documents/upload-url]", error);
    return err("Something went wrong", 500);
  }
}
