import { NextRequest } from "next/server";
import { buildStorageKey, getUploadUrl } from "@/lib/storage/supabase";
import { ok, err, validationError } from "@/lib/utils/api";
import { RequestUploadUrlSchema } from "@/lib/utils/validators";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const body = await req.json();
    const parsed = RequestUploadUrlSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { clientId, filename, contentType } = parsed.data;

    // Verify client belongs to this firm
    const client = await prisma.client.findFirst({
      where: { id: clientId, firm_id: firmId, deleted_at: null },
    });
    if (!client) return err("Client not found", 404);

    const storageKey = buildStorageKey(firmId, clientId, filename);
    const uploadUrl = await getUploadUrl(storageKey, contentType);

    return ok({ uploadUrl, storageKey });
  } catch (error) {
    console.error("[documents/upload-url]", error);
    return err("Something went wrong", 500);
  }
}
