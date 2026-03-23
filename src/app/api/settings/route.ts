import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    const userId = req.headers.get("x-user-id");
    if (!firmId || !userId) return err("Unauthorized", 401);

    const [firm, users] = await Promise.all([
      prisma.firm.findUnique({
        where: { id: firmId },
      }),
      prisma.user.findMany({
        where: { firm_id: firmId, is_active: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          is_active: true,
          last_login_at: true,
          created_at: true,
        },
        orderBy: { created_at: "asc" },
      }),
    ]);

    if (!firm) return err("Firm not found", 404);

    return ok({ firm, users });
  } catch (error) {
    console.error("[settings/GET]", error);
    return err("Something went wrong", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    const role = req.headers.get("x-user-role");
    if (!firmId) return err("Unauthorized", 401);

    if (!["OWNER", "SENIOR_CA"].includes(role ?? "")) {
      return err("Only Owner or Senior CA can update firm settings", 403);
    }

    const body = await req.json();

    const updated = await prisma.firm.update({
      where: { id: firmId },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.address ? { address: body.address } : {}),
        ...(body.website ? { website: body.website } : {}),
        ...(body.gstin ? { gstin: body.gstin } : {}),
        ...(body.pan ? { pan: body.pan } : {}),
        ...(body.icai_number ? { icai_number: body.icai_number } : {}),
      },
    });

    return ok(updated);
  } catch (error) {
    console.error("[settings/PATCH]", error);
    return err("Something went wrong", 500);
  }
}
