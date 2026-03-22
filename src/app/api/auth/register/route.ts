import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { ok, err, validationError } from "@/lib/utils/api";
import { RegisterSchema } from "@/lib/utils/validators";
import { generateSecureToken } from "@/lib/utils/crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { firmName, email, password, icaiNumber } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return err("An account with this email already exists", 409);

    const passwordHash = await hashPassword(password);
    const referralCode = generateSecureToken(4).toUpperCase();

    // Create firm + owner user + onboarding + referral in one transaction
    const { firm, user } = await prisma.$transaction(async (tx) => {
      const firm = await tx.firm.create({
        data: {
          name: firmName,
          email,
          icai_number: icaiNumber,
          plan_type: "BETA",
        },
      });

      const user = await tx.user.create({
        data: {
          firm_id: firm.id,
          name: firmName,
          email,
          password_hash: passwordHash,
          role: "OWNER",
        },
      });

      await tx.onboardingState.create({
        data: { firm_id: firm.id },
      });

      await tx.subscription.create({
        data: {
          firm_id: firm.id,
          plan_type: "BETA",
          status: "TRIAL",
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      await tx.referral.create({
        data: {
          referrer_firm_id: firm.id,
          referral_code: referralCode,
        },
      });

      return { firm, user };
    });

    const token = signToken({
      id: user.id,
      firmId: firm.id,
      name: user.name,
      email: user.email,
      role: user.role as "OWNER",
    });

    const response = ok(
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        firm: {
          id: firm.id,
          name: firm.name,
          plan_type: firm.plan_type,
        },
      },
      201,
    );

    response.cookies.set("ca_saathi_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[auth/register]", error);
    return err("Something went wrong. Please try again.", 500);
  }
}
