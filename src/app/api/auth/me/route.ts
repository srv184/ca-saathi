import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err } from "@/lib/utils/api";
import { verifyRequest } from "@/lib/auth/verify-request";

export async function GET(req: NextRequest) {
  try {
    const verified = verifyRequest(req);
    if (!verified) return err("Unauthorized", 401);

    const { firmId, userId } = verified;

    const user = await prisma.user.findFirst({
      where: { id: userId, firm_id: firmId },
      include: {
        firm: {
          include: {
            subscription: true,
            onboarding: true,
          },
        },
      },
    });

    if (!user) return err("User not found", 404);

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
      },
      firm: {
        id: user.firm.id,
        name: user.firm.name,
        email: user.firm.email,
        icai_number: user.firm.icai_number,
        pan: user.firm.pan,
        gstin: user.firm.gstin,
        phone: user.firm.phone,
        logo_url: user.firm.logo_url,
        address: user.firm.address,
        plan_type: user.firm.plan_type,
        subscription: user.firm.subscription,
        onboarding: user.firm.onboarding,
      },
    });
  } catch (error) {
    console.error("[auth/me]", error);
    return err("Something went wrong", 500);
  }
}
