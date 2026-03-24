import { AuthUser } from "@/types";
import crypto from "crypto";

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return secret;
};

// Sign a JWT token manually — no jsonwebtoken dependency
export function signToken(user: AuthUser): string {
  const secret = getSecret();
  const jti = crypto.randomUUID();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 7 * 24 * 60 * 60; // 7 days

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      id: user.id,
      firmId: user.firmId,
      name: user.name,
      email: user.email,
      role: user.role,
      jti,
      iat,
      exp,
    }),
  );

  const signature = sign(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
}

// Verify and decode a JWT token — works in both Node.js and Edge runtime
export function verifyToken(
  token: string,
): AuthUser & { jti: string; exp: number } {
  const secret = getSecret();
  const parts = token.split(".");

  if (parts.length !== 3) throw new Error("Invalid token format");

  const [header, payload, signature] = parts;

  // Verify signature
  const expected = sign(`${header}.${payload}`, secret);
  if (!timingSafeEqual(signature, expected)) {
    throw new Error("Invalid token signature");
  }

  // Decode payload
  const decoded = JSON.parse(base64urlDecode(`${payload}`));

  // Check expiry
  if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return decoded as AuthUser & { jti: string; exp: number };
}

export function extractTokenFromHeader(
  authHeader: string | null,
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

// ─── Helpers ─────────────────────────────────────────────

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
