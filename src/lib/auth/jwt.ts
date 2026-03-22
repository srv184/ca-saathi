import jwt from "jsonwebtoken";
import { AuthUser } from "@/types";
import crypto from "crypto";

// Get secret at runtime instead of module load time
// This ensures it's available in Edge Runtime (middleware)
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable not configured");
  }
  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return secret;
}

export function signToken(user: AuthUser): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    {
      id: user.id,
      firmId: user.firmId,
      name: user.name,
      email: user.email,
      role: user.role,
      jti,
    },
    getSecret(),
    { expiresIn: "7d" },
  );
}

export function verifyToken(token: string): AuthUser & { jti: string } {
  const payload = jwt.verify(token, getSecret()) as AuthUser & { jti: string };
  return payload;
}

export function extractTokenFromHeader(
  authHeader: string | null,
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
