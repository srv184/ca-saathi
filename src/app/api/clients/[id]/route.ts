import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err, validationError } from "@/lib/utils/api";
import { UpdateClientSchema } from "@/lib/utils/validators";
import { encryptField } from "@/lib/utils/crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const client = await prisma.client.findFirst({
      where: {
        id: params.id,
        firm_id: firmId,
        deleted_at: null,
      },
      include: {
        assigned_ca: { select: { name: true } },
        _count: {
          select: {
            documents: true,
            notices: true,
            invoices: true,
          },
        },
      },
    });

    if (!client) return err("Client not found", 404);

    return ok(client);
  } catch (error) {
    console.error("[clients/[id]/GET]", error);
    return err("Something went wrong", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const client = await prisma.client.findFirst({
      where: { id: params.id, firm_id: firmId, deleted_at: null },
    });
    if (!client) return err("Client not found", 404);

    const body = await req.json();
    const parsed = UpdateClientSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const {
      name,
      entityType,
      pan,
      gstin,
      email,
      phone,
      whatsappNumber,
      portalEnabled,
      servicesEngaged,
      financialYear,
      address,
    } = parsed.data;

    const panEncrypted = pan ? encryptField(pan) : undefined;

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...(name ? { name } : {}),
        ...(panEncrypted ? { pan_encrypted: panEncrypted } : {}),
        ...(gstin ? { gstin } : {}),
        ...(entityType ? { entity_type: entityType as never } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(whatsappNumber ? { whatsapp_number: whatsappNumber } : {}),
        ...(portalEnabled !== undefined
          ? { portal_enabled: portalEnabled }
          : {}),
        ...(servicesEngaged ? { services_engaged: servicesEngaged } : {}),
        ...(financialYear ? { financial_year: financialYear } : {}),
        ...(address ? { address } : {}),
      },
    });

    return ok(updated);
  } catch (error) {
    console.error("[clients/[id]/PATCH]", error);
    return err("Something went wrong", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const firmId = req.headers.get("x-firm-id");
    const role = req.headers.get("x-user-role");
    if (!firmId) return err("Unauthorized", 401);

    if (!["OWNER", "SENIOR_CA"].includes(role ?? "")) {
      return err("Only Senior CA or Owner can delete clients", 403);
    }

    const client = await prisma.client.findFirst({
      where: { id: params.id, firm_id: firmId, deleted_at: null },
    });
    if (!client) return err("Client not found", 404);

    await prisma.client.update({
      where: { id: params.id },
      data: { deleted_at: new Date() },
    });

    return ok({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("[clients/[id]/DELETE]", error);
    return err("Something went wrong", 500);
  }
}
