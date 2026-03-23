import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err } from "@/lib/utils/api";
import { generateSecureToken, hashField } from "@/lib/utils/crypto";

export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const { clientId } = await req.json();
    if (!clientId) return err("Client ID is required", 400);

    // Verify client belongs to firm
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        firm_id: firmId,
        deleted_at: null,
      },
    });

    if (!client) return err("Client not found", 404);

    // Generate invite token
    const token = generateSecureToken(16);
    const tokenHash = hashField(token);

    // Invalidate any existing unused invites for this client
    await prisma.portalInvite.updateMany({
      where: { client_id: clientId, used: false },
      data: { used: true },
    });

    // Create new invite
    await prisma.portalInvite.create({
      data: {
        client_id: clientId,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        used: false,
      },
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/join/${token}`;

    // Mark onboarding step
    await prisma.onboardingState.updateMany({
      where: { firm_id: firmId },
      data: { step_invite_client: true },
    });

    return ok({
      inviteUrl,
      token,
      expiresIn: "7 days",
      message: `Portal invite link created for ${client.name}`,
    });
  } catch (error) {
    console.error("[portal/invite]", error);
    return err("Something went wrong", 500);
  }
}
