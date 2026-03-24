import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err, validationError } from "@/lib/utils/api";
import { SetPinSchema } from "@/lib/utils/validators";
import { hashField, generateSecureToken } from "@/lib/utils/crypto";
import bcrypt from "bcryptjs";
import { signPortalToken } from "@/lib/auth/portal-token";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { pin, setupToken, phoneHash, inviteToken } = body;

    if (!pin || !setupToken) {
      return err("Missing required fields", 400);
    }

    // Validate PIN
    const parsed = SetPinSchema.safeParse({ pin });
    if (!parsed.success) return validationError(parsed.error);

    const pinHash = await bcrypt.hash(pin, 12);

    // Check if this is a new registration via invite
    if (inviteToken) {
      const tokenHash = hashField(inviteToken);
      const invite = await prisma.portalInvite.findFirst({
        where: {
          token_hash: tokenHash,
          used: false,
          expires_at: { gt: new Date() },
        },
        include: { client: true },
      });

      if (!invite) return err("Invalid invite token", 400);

      // Create portal session for this client
      const deviceTrustToken = generateSecureToken(32);
      const deviceTrustTokenHash = hashField(deviceTrustToken);

      const existingSession = await prisma.clientPortalSession.findFirst({
        where: { client_id: invite.client_id },
      });

      if (existingSession) {
        await prisma.clientPortalSession.update({
          where: { id: existingSession.id },
          data: {
            pin_hash: pinHash,
            pin_history: [pinHash],
            pin_attempt_count: 0,
            total_failed_attempts: 0,
            device_trust_token_hash: deviceTrustTokenHash,
            trust_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            trusted_at: new Date(),
            last_seen_at: new Date(),
          },
        });
      } else {
        await prisma.clientPortalSession.create({
          data: {
            client_id: invite.client_id,
            phone_hash: phoneHash ?? hashField("unknown"),
            pin_hash: pinHash,
            pin_history: [pinHash],
            device_trust_token_hash: deviceTrustTokenHash,
            trust_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            trusted_at: new Date(),
          },
        });
      }

      // Mark invite as used
      await prisma.portalInvite.update({
        where: { id: invite.id },
        data: { used: true },
      });

      // Generate portal JWT
      // Generate signed portal token
      const portalToken = signPortalToken(
        invite.client_id,
        invite.client.firm_id,
      );

      return ok({
        message: "PIN set successfully",
        deviceToken: deviceTrustToken,
        portalToken,
        clientName: invite.client.name,
        clientId: invite.client_id,
      });
    }

    return err("Invalid request", 400);
  } catch (error) {
    console.error("[portal/set-pin]", error);
    return err("Something went wrong", 500);
  }
}
