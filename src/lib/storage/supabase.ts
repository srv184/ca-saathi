import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "documents";

export function buildStorageKey(
  firmId: string,
  clientId: string,
  filename: string,
): string {
  const ext = filename.split(".").pop() ?? "bin";
  const unique = crypto.randomBytes(8).toString("hex");
  return `firms/${firmId}/clients/${clientId}/${unique}.${ext}`;
}

export async function getUploadUrl(key: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(key);

  if (error) throw new Error(`Upload URL failed: ${error.message}`);
  return data.signedUrl;
}

export async function getDownloadUrl(key: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, 900); // 15 minutes

  if (error) throw new Error(`Download URL failed: ${error.message}`);
  return data.signedUrl;
}

export async function deleteFile(key: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([key]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

export async function hashBuffer(buffer: Buffer): Promise<string> {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);
}

export async function downloadBuffer(key: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(key);
  if (error) throw new Error(`Download failed: ${error.message}`);

  return Buffer.from(await data.arrayBuffer());
}
