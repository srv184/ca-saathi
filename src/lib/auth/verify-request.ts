import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";
import { AuthUser } from "@/types";

export interface VerifiedRequest {
  user: AuthUser & { jti: string };
  firmId: string;
  userId: string;
  role: string;
}

export function verifyRequest(req: NextRequest): VerifiedRequest | null {
  try {
    const token =
      req.cookies.get("ca_saathi_token")?.value ??
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) return null;

    const payload = verifyToken(token);

    return {
      user: payload,
      firmId: payload.firmId,
      userId: payload.id,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
