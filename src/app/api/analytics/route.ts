import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last12 = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const [
      totalClients,
      newClientsThisMonth,
      totalNotices,
      noticesCompleted,
      totalRecons,
      reconsCompleted,
      totalInvoices,
      invoiceStats,
      complianceTasks,
      complianceFiled,
    ] = await Promise.all([
      // Total clients
      prisma.client.count({
        where: { firm_id: firmId, deleted_at: null },
      }),

      // New clients this month
      prisma.client.count({
        where: {
          firm_id: firmId,
          deleted_at: null,
          created_at: { gte: thisMonth },
        },
      }),

      // Total notices
      prisma.notice.count({
        where: { client: { firm_id: firmId } },
      }),

      // Notices with AI completed
      prisma.notice.count({
        where: {
          client: { firm_id: firmId },
          ai_status: "COMPLETED",
        },
      }),

      // Total GST recons
      prisma.gstReconciliation.count({
        where: { client: { firm_id: firmId } },
      }),

      // Completed GST recons
      prisma.gstReconciliation.count({
        where: {
          client: { firm_id: firmId },
          status: "COMPLETED",
        },
      }),

      // Total invoices
      prisma.invoice.count({
        where: { client: { firm_id: firmId } },
      }),

      // Invoice amounts
      prisma.invoice.aggregate({
        where: { client: { firm_id: firmId } },
        _sum: { total_amount: true },
      }),

      // Compliance tasks this month
      prisma.complianceTask.count({
        where: {
          client: { firm_id: firmId },
          due_date: { gte: thisMonth },
        },
      }),

      // Compliance tasks filed this month
      prisma.complianceTask.count({
        where: {
          client: { firm_id: firmId },
          status: "FILED",
          filed_at: { gte: thisMonth },
        },
      }),
    ]);

    // Monthly revenue for last 12 months
    const monthlyRevenue = await Promise.all(
      Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        return prisma.invoice
          .aggregate({
            where: {
              client: { firm_id: firmId },
              status: "PAID",
              paid_at: { gte: monthStart, lte: monthEnd },
            },
            _sum: { total_amount: true },
          })
          .then((r) => ({
            month: monthStart.toLocaleDateString("en-IN", {
              month: "short",
              year: "2-digit",
            }),
            revenue: r._sum.total_amount ?? 0,
          }));
      }),
    );

    return ok({
      overview: {
        totalClients,
        newClientsThisMonth,
        totalNotices,
        noticesCompleted,
        totalRecons,
        reconsCompleted,
        totalInvoices,
        totalRevenue: invoiceStats._sum.total_amount ?? 0,
        complianceTasks,
        complianceFiled,
        complianceRate:
          complianceTasks > 0
            ? Math.round((complianceFiled / complianceTasks) * 100)
            : 0,
      },
      monthlyRevenue: monthlyRevenue.reverse(),
    });
  } catch (error) {
    console.error("[analytics/GET]", error);
    return err("Something went wrong", 500);
  }
}
