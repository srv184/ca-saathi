import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, err } from "@/lib/utils/api";
import { verifyPortalToken } from "@/lib/auth/portal-token";

export async function GET(req: NextRequest) {
  try {
    // Verify portal token from Authorization header or cookie
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("portal_token")?.value;
    const token = authHeader?.replace("Bearer ", "") ?? cookieToken;

    if (!token) return err("Unauthorized", 401);

    let payload;
    try {
      payload = verifyPortalToken(token);
    } catch {
      return err("Invalid or expired session. Please log in again.", 401);
    }

    const { clientId } = payload;

    const client = await prisma.client.findFirst({
      where: { id: clientId, deleted_at: null },
      include: {
        firm: {
          select: {
            name: true,
            email: true,
            phone: true,
            logo_url: true,
          },
        },
        document_requests: {
          where: { status: "PENDING" },
          orderBy: { created_at: "desc" },
          take: 10,
        },
        documents: {
          where: { deleted_at: null },
          orderBy: { created_at: "desc" },
          take: 5,
          select: {
            id: true,
            name: true,
            doc_type: true,
            created_at: true,
          },
        },
        invoices: {
          where: { status: { in: ["SENT", "OVERDUE"] } },
          orderBy: { due_date: "asc" },
          take: 5,
        },
        compliance_tasks: {
          where: {
            status: "PENDING",
            due_date: { gte: new Date() },
          },
          orderBy: { due_date: "asc" },
          take: 5,
        },
      },
    });

    if (!client) return err("Client not found", 404);

    return ok({
      client: {
        id: client.id,
        name: client.name,
        entity_type: client.entity_type,
        services_engaged: client.services_engaged,
        portal_enabled: client.portal_enabled,
      },
      firm: client.firm,
      pendingRequests: client.document_requests,
      recentDocuments: client.documents,
      unpaidInvoices: client.invoices,
      upcomingDeadlines: client.compliance_tasks,
    });
  } catch (error) {
    console.error("[portal/me]", error);
    return err("Something went wrong", 500);
  }
}
