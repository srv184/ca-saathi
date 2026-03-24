import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err, validationError } from "@/lib/utils/api";
import { RequestOtpSchema } from "@/lib/utils/validators";
import { hashField, generateSecureToken } from "@/lib/utils/crypto";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { otpRatelimit, getIp } from "@/lib/utils/ratelimit";

async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    // In development — just log the OTP
    console.log(`[OTP] Phone: ${phone} OTP: ${otp}`);
    return;
  }

  await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "otp",
      variables_values: otp,
      numbers: phone,
    }),
  });
}

// Add at start of POST:
const ip = getIp(req);
const { success } = await otpRatelimit.limit(ip);
if (!success) return err("Too many OTP requests. Try again in 1 hour.", 429);
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestOtpSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { phone, inviteToken } = parsed.data;

    // Verify invite token exists and is valid
    const tokenHash = hashField(inviteToken);
    const invite = await prisma.portalInvite.findFirst({
      where: {
        token_hash: tokenHash,
        used: false,
        expires_at: { gt: new Date() },
      },
      include: { client: true },
    });

    if (!invite) {
      return err("Invalid or expired invite link", 400);
    }

    const phoneHash = hashField(phone);

    // Rate limit — max 3 OTPs per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtps = await prisma.portalOtp.count({
      where: {
        phone_hash: phoneHash,
        created_at: { gte: oneHourAgo },
      },
    });

    if (recentOtps >= 3) {
      return err("Too many OTP requests. Please try again in 1 hour.", 429);
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);

    // Save OTP
    await prisma.portalOtp.create({
      data: {
        phone_hash: phoneHash,
        otp_hash: otpHash,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Send SMS
    await sendOtpSms(phone, otp);

    // Return masked phone
    const masked = `••••${phone.slice(-4)}`;

    return ok({
      message: `OTP sent to ${masked}`,
      maskedPhone: masked,
      expiresIn: 600,
    });
  } catch (error) {
    console.error("[portal/request-otp]", error);
    return err("Something went wrong", 500);
  }
}
