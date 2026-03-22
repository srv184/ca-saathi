import { NextRequest } from "next/server";
import { ok } from "@/lib/utils/api";

export async function POST(req: NextRequest) {
  const response = ok({ message: "Logged out successfully" });

  // Clear the auth cookie
  response.cookies.set("ca_saathi_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
}
