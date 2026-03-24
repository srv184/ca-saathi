import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err } from "@/lib/utils/api";
import { hashField, generateSecureToken } from "@/lib/utils/crypto";
import bcrypt from "bcryptjs";
import { signPortalToken } from "@/lib/auth/portal-token";

export async function POST(req: NextRequest) {
  try {
    const { pin, clientId } = await req.json();

    if (!pin || !clientId) {
      return err("Missing required fields", 400);
    }

    const session = await prisma.clientPortalSession.findFirst({
      where: { client_id: clientId },
      include: { client: true },
    });

    if (!session) return err("Session not found", 404);
    if (!session.pin_hash) return err("PIN not set", 400);

    // Check lockout
    if (session.pin_locked_until && session.pin_locked_until > new Date()) {
      const minutesLeft = Math.ceil(
        (session.pin_locked_until.getTime() - Date.now()) / 60000,
      );
      return err(`Account locked. Try again in ${minutesLeft} minutes.`, 423);
    }

    // Verify PIN
    const valid = await bcrypt.compare(pin, session.pin_hash);

    if (!valid) {
      const newAttempts = session.pin_attempt_count + 1;
      const totalFailed = session.total_failed_attempts + 1;

      let lockedUntil: Date | null = null;
      if (newAttempts >= 10) {
        // Full lockout — require OTP
        await prisma.clientPortalSession.update({
          where: { id: session.id },
          data: {
            pin_attempt_count: newAttempts,
            total_failed_attempts: totalFailed,
          },
        });
        return err("Account locked. Please verify with OTP to unlock.", 423);
      } else if (newAttempts >= 6) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
      } else if (newAttempts >= 3) {
        lockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 min
      }

      await prisma.clientPortalSession.update({
        where: { id: session.id },
        data: {
          pin_attempt_count: newAttempts,
          total_failed_attempts: totalFailed,
          pin_locked_until: lockedUntil,
        },
      });

      const remaining = Math.max(0, 3 - newAttempts);
      return err(
        `Wrong PIN. ${remaining > 0 ? `${remaining} attempts before lockout.` : "Account locked."}`,
        400,
      );
    }

    // PIN correct — reset attempt count
    const portalToken = signPortalToken(
      session.client_id,
      session.client.firm_id,
    );
    const deviceTrustToken = generateSecureToken(32);
    const trustTokenHash = hashField(deviceTrustToken);

    await prisma.clientPortalSession.update({
      where: { id: session.id },
      data: {
        pin_attempt_count: 0,
        pin_locked_until: null,
        device_trust_token_hash: trustTokenHash,
        trust_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        trusted_at: new Date(),
        last_seen_at: new Date(),
      },
    });

    return ok({
      message: "PIN verified successfully",
      portalToken,
      deviceToken: deviceTrustToken,
      clientId: session.client_id,
      clientName: session.client.name,
    });
  } catch (error) {
    console.error("[portal/verify-pin]", error);
    return err("Something went wrong", 500);
  }
}
