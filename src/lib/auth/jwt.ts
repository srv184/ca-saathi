import jwt from "jsonwebtoken";
import { AuthUser } from "@/types";
import crypto from "crypto";

const SECRET = process.env.JWT_SECRET!;

if (!SECRET || SECRET.length < 32) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
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
    SECRET,
    { expiresIn: "7d" },
  );
}

export function verifyToken(token: string): AuthUser & { jti: string } {
  const payload = jwt.verify(token, SECRET) as AuthUser & { jti: string };
  return payload;
}

export function extractTokenFromHeader(
  authHeader: string | null,
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
