import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { err, ok } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);
    const clientId = new URL(req.url).searchParams.get("clientId");
    if (!clientId) return err("clientId is required", 400);

    const documents = await prisma.clientDocument.findMany({
      where: { client_id: clientId, client: { firm_id: firmId, deleted_at: null } },
      orderBy: { uploaded_at: "desc" },
    });
    const grouped = documents.reduce<Record<string, typeof documents>>((groups, document) => {
      (groups[document.document_type] ??= []).push(document);
      return groups;
    }, {});
    return ok({ documents, grouped });
  } catch (error) {
    console.error("[client-documents/GET]", error);
    return err("Unable to load client documents", 500);
  }
}
