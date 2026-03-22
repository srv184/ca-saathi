import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    database: "connected",
    jwt_secret_exists: !!process.env.JWT_SECRET,
    jwt_secret_length: process.env.JWT_SECRET?.length ?? 0,
    node_env: process.env.NODE_ENV,
  });
}
