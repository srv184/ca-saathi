import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, created, err, validationError } from "@/lib/utils/api";
import { CreateClientSchema } from "@/lib/utils/validators";
import { encryptField } from "@/lib/utils/crypto";

export async function GET(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") ?? "20"),
      100,
    );

    const where: Record<string, unknown> = {
      firm_id: firmId,
      deleted_at: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { gstin: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assigned_ca: { select: { name: true } },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return ok({
      data: clients,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[clients/GET]", error);
    return err("Something went wrong", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const body = await req.json();
    const parsed = CreateClientSchema.safeParse(body);
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

    // Encrypt PAN before storing
    const panEncrypted = pan ? encryptField(pan) : null;

    const client = await prisma.client.create({
      data: {
        firm_id: firmId,
        name,
        pan_encrypted: panEncrypted,
        gstin: gstin || null,
        entity_type: entityType as never,
        email: email || null,
        phone: phone || null,
        whatsapp_number: whatsappNumber || null,
        portal_enabled: portalEnabled,
        services_engaged: servicesEngaged,
        financial_year: financialYear,
        address: address || null,
      },
    });

    // Mark onboarding step complete
    await prisma.onboardingState.updateMany({
      where: { firm_id: firmId },
      data: { step_add_client: true },
    });

    return created(client);
  } catch (error) {
    console.error("[clients/POST]", error);
    return err("Something went wrong", 500);
  }
}
