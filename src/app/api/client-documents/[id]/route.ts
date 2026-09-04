import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { err, ok } from "@/lib/utils/api";
import { deleteFile } from "@/lib/storage/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const document = await prisma.clientDocument.findFirst({
      where: {
        id: params.id,
        client: { firm_id: firmId, deleted_at: null },
      },
    });

    if (!document) return err("Document not found", 404);
    return ok(document);
  } catch (error) {
    console.error("[client-documents/[id]/GET]", error);
    return err("Unable to load document", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const document = await prisma.clientDocument.findFirst({
      where: {
        id: params.id,
        client: { firm_id: firmId, deleted_at: null },
      },
      select: {
        id: true,
        storage_path: true,
        extraction_status: true,
      },
    });

    if (!document) return err("Document not found", 404);

    // Attempt to remove file from Supabase Storage (best effort)
    try {
      await deleteFile(document.storage_path);
    } catch (storageError) {
      console.warn("[client-documents/DELETE] Storage cleanup warning:", storageError);
    }

    // Delete record from database
    await prisma.clientDocument.delete({
      where: { id: document.id },
    });

    return ok({ cancelled: true, documentId: document.id });
  } catch (error) {
    console.error("[client-documents/[id]/DELETE]", error);
    return err("Unable to cancel document upload", 500);
  }
}
