import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalClients,
      noticesUnreviewed,
      gstReconsPending,
      invoicesOutstanding,
      outstandingAmount,
      complianceOverdue,
      newClientsThisMonth,
    ] = await Promise.all([
      prisma.client.count({
        where: { firm_id: firmId, deleted_at: null, status: "ACTIVE" },
      }),
      prisma.notice.count({
        where: {
          client: { firm_id: firmId },
          review_status: "DRAFT",
          ai_status: "COMPLETED",
        },
      }),
      prisma.gstReconciliation.count({
        where: {
          client: { firm_id: firmId },
          status: { in: ["PENDING", "PROCESSING"] },
        },
      }),
      prisma.invoice.count({
        where: {
          client: { firm_id: firmId },
          status: { in: ["SENT", "OVERDUE"] },
        },
      }),
      prisma.invoice.aggregate({
        where: {
          client: { firm_id: firmId },
          status: { in: ["SENT", "OVERDUE"] },
        },
        _sum: { total_amount: true },
      }),
      prisma.complianceTask.count({
        where: {
          client: { firm_id: firmId },
          status: "PENDING",
          due_date: { lt: now },
        },
      }),
      prisma.client.count({
        where: {
          firm_id: firmId,
          deleted_at: null,
          created_at: { gte: thisMonth },
        },
      }),
    ]);

    return ok({
      totalClients,
      noticesUnreviewed,
      gstReconsPending,
      invoicesOutstanding,
      outstandingAmount: outstandingAmount._sum.total_amount ?? 0,
      complianceOverdue,
      newClientsThisMonth,
    });
  } catch (error) {
    console.error("[dashboard/stats]", error);
    return err("Something went wrong", 500);
  }
}
