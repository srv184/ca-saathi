import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err, validationError } from "@/lib/utils/api";
import { VerifyOtpSchema } from "@/lib/utils/validators";
import { hashField, generateSecureToken } from "@/lib/utils/crypto";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifyOtpSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { phone, otp } = parsed.data;
    const phoneHash = hashField(phone);

    // Find the most recent unused OTP
    const otpRecord = await prisma.portalOtp.findFirst({
      where: {
        phone_hash: phoneHash,
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    if (!otpRecord) {
      return err("OTP expired or not found. Please request a new one.", 400);
    }

    // Check attempt count
    if (otpRecord.attempt_count >= 5) {
      return err("Too many wrong attempts. Please request a new OTP.", 400);
    }

    // Verify OTP
    const valid = await bcrypt.compare(otp, otpRecord.otp_hash);

    if (!valid) {
      // Increment attempt count
      await prisma.portalOtp.update({
        where: { id: otpRecord.id },
        data: { attempt_count: { increment: 1 } },
      });
      const remaining = 5 - (otpRecord.attempt_count + 1);
      return err(`Wrong OTP. ${remaining} attempts remaining.`, 400);
    }

    // Mark OTP as used
    await prisma.portalOtp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Find client by phone — look for portal session
    const session = await prisma.clientPortalSession.findFirst({
      where: { phone_hash: phoneHash },
      include: { client: true },
    });

    // Generate a temporary setup token
    const setupToken = generateSecureToken(32);
    const setupTokenHash = hashField(setupToken);

    if (session) {
      // Existing user — generate pin reset token
      await prisma.clientPortalSession.update({
        where: { id: session.id },
        data: {
          pin_reset_token_hash: setupTokenHash,
          pin_reset_expires_at: new Date(Date.now() + 5 * 60 * 1000),
          last_seen_at: new Date(),
        },
      });

      return ok({
        type: "existing",
        setupToken,
        clientName: session.client.name,
        message: "OTP verified successfully",
      });
    }

    // New user — store setup token temporarily in OTP record
    // Will be used when PIN is set
    return ok({
      type: "new",
      setupToken,
      phoneHash,
      message: "OTP verified. Please set your PIN.",
    });
  } catch (error) {
    console.error("[portal/verify-otp]", error);
    return err("Something went wrong", 500);
  }
}
