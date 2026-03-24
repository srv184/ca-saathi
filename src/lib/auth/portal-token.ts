import crypto from "crypto";

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET!;
  return secret;
};

export interface PortalPayload {
  clientId: string;
  firmId: string;
  iat: number;
  exp: number;
}

function base64url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlDecode(str: string): string {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(
    padded.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
}

function sign(data: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function signPortalToken(clientId: string, firmId: string): string {
  const secret = getSecret();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 30 * 24 * 60 * 60; // 30 days

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "PORTAL" }));
  const payload = base64url(JSON.stringify({ clientId, firmId, iat, exp }));
  const sig = sign(`${header}.${payload}`, secret);

  return `${header}.${payload}.${sig}`;
}

export function verifyPortalToken(token: string): PortalPayload {
  const secret = getSecret();
  const parts = token.split(".");

  if (parts.length !== 3) throw new Error("Invalid portal token");

  const [header, payload, signature] = parts;
  const expected = sign(`${header}.${payload}`, secret);

  if (!timingSafeEqual(signature, expected)) {
    throw new Error("Invalid portal token signature");
  }

  const decoded = JSON.parse(base64urlDecode(payload)) as PortalPayload;

  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Portal token expired");
  }

  return decoded;
}
