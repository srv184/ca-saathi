import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { ok, err, validationError } from "@/lib/utils/api";
import { LoginSchema } from "@/lib/utils/validators";
import { authRatelimit, getIp } from "@/lib/utils/ratelimit";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = getIp(req);
    const { success } = await authRatelimit.limit(ip);
    if (!success)
      return err("Too many login attempts. Try again in 15 minutes.", 429);

    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { firm: true },
    });

    const INVALID_MSG = "Invalid email or password";
    if (!user) return err(INVALID_MSG, 401);
    if (!user.is_active) return err("Your account has been deactivated", 401);

    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) return err(INVALID_MSG, 401);

    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const token = signToken({
      id: user.id,
      firmId: user.firm_id,
      name: user.name,
      email: user.email,
      role: user.role as "OWNER" | "SENIOR_CA" | "JUNIOR_CA" | "ARTICLE",
    });

    const response = ok({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      firm: {
        id: user.firm.id,
        name: user.firm.name,
        plan_type: user.firm.plan_type,
      },
    });

    response.cookies.set("ca_saathi_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[auth/login]", error);
    return err("Something went wrong. Please try again.", 500);
  }
}
