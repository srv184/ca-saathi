import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { ok, created, err, validationError } from "@/lib/utils/api";
import { StartReconSchema } from "@/lib/utils/validators";
import { parseCsvLines, rowsToGstrLines, reconcile } from "@/lib/utils/gst";
import { explainGstMismatches } from "@/lib/ai/index";

export async function GET(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") ?? "20"),
      100,
    );

    const where: Record<string, unknown> = {
      client: { firm_id: firmId },
      ...(clientId ? { client_id: clientId } : {}),
    };

    const [recons, total] = await Promise.all([
      prisma.gstReconciliation.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { client: { select: { name: true } } },
      }),
      prisma.gstReconciliation.count({ where }),
    ]);

    return ok({
      data: recons,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[gst/reconcile/GET]", error);
    return err("Something went wrong", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const firmId = req.headers.get("x-firm-id");
    if (!firmId) return err("Unauthorized", 401);

    const body = await req.json();
    const parsed = StartReconSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const {
      clientId,
      gstin,
      period,
      gstr2bData = "",
      purchaseData = "",
    } = parsed.data;

    // Verify client belongs to firm
    const client = await prisma.client.findFirst({
      where: { id: clientId, firm_id: firmId, deleted_at: null },
    });
    if (!client) return err("Client not found", 404);

    // Create reconciliation record
    const recon = await prisma.gstReconciliation.create({
      data: {
        client_id: clientId,
        gstin,
        period,
        status: "PROCESSING",
      },
    });

    // Process in background
    processRecon({
      reconId: recon.id,
      gstr2bData,
      purchaseData,
      gstin,
      period,
      firmId,
    }).catch((error) => {
      console.error("[gst/recon-process]", error);
    });

    // Mark onboarding step
    await prisma.onboardingState.updateMany({
      where: { firm_id: firmId },
      data: { step_run_gst_recon: true },
    });

    return created(recon);
  } catch (error) {
    console.error("[gst/reconcile/POST]", error);
    return err("Something went wrong", 500);
  }
}

async function processRecon(params: {
  reconId: string;
  gstr2bData: string;
  purchaseData: string;
  gstin: string;
  period: string;
  firmId: string;
}) {
  try {
    const log: { issue: string; fix: string; count: number }[] = [];

    // Parse CSV data
    const gstr2bRows = parseCsvLines(params.gstr2bData);
    const purchaseRows = parseCsvLines(params.purchaseData);

    // Convert to GstrLine format with normalisation
    const gstr2bLines = rowsToGstrLines(gstr2bRows, log);
    const purchaseLines = rowsToGstrLines(purchaseRows, log);

    // Run reconciliation
    const result = reconcile(gstr2bLines, purchaseLines);

    // Get AI explanations for mismatches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let explainedMismatches: any[] = result.mismatches;
    if (result.mismatches.length > 0) {
      try {
        explainedMismatches = (await explainGstMismatches({
          mismatches: result.mismatches,
          period: params.period,
          gstin: params.gstin,
        })) as typeof result.mismatches;
      } catch {
        // AI explanation failed — use mismatches without explanation
      }
    }

    // Save results
    await prisma.gstReconciliation.update({
      where: { id: params.reconId },
      data: {
        status: "COMPLETED",
        normalisation_log: log as object[],
        matched_count: result.matched_count,
        mismatch_count: result.mismatch_count,
        missing_in_gstr2b: result.missing_in_gstr2b,
        missing_in_purchase: result.missing_in_purchase,
        total_invoices_gstr2b: result.total_invoices_gstr2b,
        total_invoices_purchase: result.total_invoices_purchase,
        mismatches: explainedMismatches as object[],
      },
    });
  } catch (error) {
    await prisma.gstReconciliation.update({
      where: { id: params.reconId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
