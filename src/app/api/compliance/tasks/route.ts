import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err } from "@/lib/utils/api";
import { generateTasksForClient } from "@/lib/compliance/rules";

export async function GET(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    const now = new Date();
    const filterYear = year ? parseInt(year) : now.getFullYear();
    const filterMonth = month ? parseInt(month) : now.getMonth() + 1;

    const where: Record<string, unknown> = {
      client: { firm_id: firmId },
      ...(clientId ? { client_id: clientId } : {}),
      ...(status ? { status } : {}),
    };

    // Filter by month if provided
    if (month && year) {
      const startDate = new Date(filterYear, filterMonth - 1, 1);
      const endDate = new Date(filterYear, filterMonth, 0);
      where.due_date = { gte: startDate, lte: endDate };
    }

    const tasks = await prisma.complianceTask.findMany({
      where,
      orderBy: { due_date: "asc" },
      include: {
        client: { select: { name: true, entity_type: true } },
      },
    });

    return ok({ data: tasks, total: tasks.length });
  } catch (error) {
    console.error("[compliance/tasks/GET]", error);
    return err("Something went wrong", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    // Generate tasks for all active clients
    const clients = await prisma.client.findMany({
      where: {
        firm_id: firmId,
        deleted_at: null,
        status: "ACTIVE",
      },
    });

    let totalCreated = 0;
    const fromDate = new Date();

    for (const client of clients) {
      if (client.services_engaged.length === 0) continue;

      const tasks = generateTasksForClient(
        client.services_engaged,
        fromDate,
        12,
      );

      for (const task of tasks) {
        // Upsert — safe to run multiple times
        const existing = await prisma.complianceTask.findFirst({
          where: {
            client_id: client.id,
            title: task.title,
            due_date: task.due_date,
          },
        });

        if (!existing) {
          await prisma.complianceTask.create({
            data: {
              client_id: client.id,
              title: task.title,
              description: task.description,
              service_type: task.service_type,
              due_date: task.due_date,
              status: "PENDING",
            },
          });
          totalCreated++;
        }
      }
    }

    return ok({
      message: `Generated ${totalCreated} compliance tasks for ${clients.length} clients`,
      totalCreated,
      clientCount: clients.length,
    });
  } catch (error) {
    console.error("[compliance/tasks/POST]", error);
    return err("Something went wrong", 500);
  }
}
