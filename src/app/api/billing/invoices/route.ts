import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, created, err, validationError } from "@/lib/utils/api";
import { CreateInvoiceSchema } from "@/lib/utils/validators";

export async function GET(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") ?? "20"),
      100,
    );

    const where: Record<string, unknown> = {
      client: { firm_id: firmId },
      ...(status ? { status } : {}),
      ...(clientId ? { client_id: clientId } : {}),
    };

    const [invoices, total, totals] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: { select: { name: true, email: true } },
        },
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({
        where: { client: { firm_id: firmId } },
        _sum: { total_amount: true },
      }),
    ]);

    const outstanding = await prisma.invoice.aggregate({
      where: {
        client: { firm_id: firmId },
        status: { in: ["SENT", "OVERDUE"] },
      },
      _sum: { total_amount: true },
    });

    return ok({
      data: invoices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary: {
        totalBilled: totals._sum.total_amount ?? 0,
        totalOutstanding: outstanding._sum.total_amount ?? 0,
      },
    });
  } catch (error) {
    console.error("[billing/invoices/GET]", error);
    return err("Something went wrong", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const body = await req.json();
    const parsed = CreateInvoiceSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { clientId, description, amount, dueDate, notes } = parsed.data;

    // Verify client belongs to firm
    const client = await prisma.client.findFirst({
      where: { id: clientId, firm_id: firmId, deleted_at: null },
    });
    if (!client) return err("Client not found", 404);

    // Auto-generate invoice number
    const count = await prisma.invoice.count({
      where: { client: { firm_id: firmId } },
    });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Calculate GST
    const gstAmount = Math.round(amount * 0.18 * 100) / 100;
    const totalAmount = amount + gstAmount;

    const invoice = await prisma.invoice.create({
      data: {
        client_id: clientId,
        invoice_number: invoiceNumber,
        description,
        amount,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        due_date: new Date(dueDate),
        notes,
        status: "DRAFT",
      },
    });

    return created(invoice);
  } catch (error) {
    console.error("[billing/invoices/POST]", error);
    return err("Something went wrong", 500);
  }
}
