import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err } from "@/lib/utils/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        client: { firm_id: firmId },
      },
      include: {
        client: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!invoice) return err("Invoice not found", 404);
    return ok(invoice);
  } catch (error) {
    console.error("[billing/[id]/GET]", error);
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

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        client: { firm_id: firmId },
      },
      include: { client: true },
    });
    if (!invoice) return err("Invoice not found", 404);

    const { action } = await req.json();

    if (action === "send") {
      const updated = await prisma.invoice.update({
        where: { id: params.id },
        data: {
          status: "SENT",
          sent_at: new Date(),
        },
      });
      return ok({ invoice: updated, message: "Invoice marked as sent" });
    }

    if (action === "mark-paid") {
      const updated = await prisma.invoice.update({
        where: { id: params.id },
        data: {
          status: "PAID",
          paid_at: new Date(),
        },
      });
      return ok(updated);
    }

    if (action === "cancel") {
      const updated = await prisma.invoice.update({
        where: { id: params.id },
        data: { status: "CANCELLED" },
      });
      return ok(updated);
    }

    return err("Unknown action", 400);
  } catch (error) {
    console.error("[billing/[id]/PATCH]", error);
    return err("Something went wrong", 500);
  }
}
