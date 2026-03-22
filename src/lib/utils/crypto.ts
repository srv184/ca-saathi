import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(
  process.env.FIELD_ENCRYPTION_KEY || "a".repeat(64),
  "hex",
);

export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("hex"),
    encrypted.toString("hex"),
    tag.toString("hex"),
  ].join(".");
}

export function decryptField(ciphertext: string): string {
  const [ivHex, encryptedHex, tagHex] = ciphertext.split(".");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

export function maskPan(pan: string | null): string | null {
  if (!pan || pan.length !== 10) return pan;
  return pan.slice(0, 5) + "••••" + pan.slice(-1);
}

export function hashField(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
