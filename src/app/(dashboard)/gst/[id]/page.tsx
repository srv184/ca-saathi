"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Mismatch {
  type: string;
  invoice_no: string;
  gstin: string;
  gstr2b_amt?: number;
  purchase_amt?: number;
  difference?: number;
  explanation?: string;
  action?: string;
}

interface NormLog {
  issue: string;
  fix: string;
  count: number;
}

interface Recon {
  id: string;
  period: string;
  gstin: string;
  status: string;
  matched_count?: number;
  mismatch_count?: number;
  missing_in_gstr2b?: number;
  missing_in_purchase?: number;
  total_invoices_gstr2b?: number;
  total_invoices_purchase?: number;
  mismatches?: Mismatch[];
  normalisation_log?: NormLog[];
  created_at: string;
  client?: { name: string };
}

export default function ReconDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [recon, setRecon] = useState<Recon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecon();
  }, [params.id]);

  // Poll while processing
  useEffect(() => {
    if (!recon) return;
    if (recon.status === "PENDING" || recon.status === "PROCESSING") {
      const t = setTimeout(loadRecon, 5000);
      return () => clearTimeout(t);
    }
  }, [recon]);

  async function loadRecon() {
    try {
      const res = await fetch(`/api/gst/${params.id}`);
      const data = await res.json();
      if (data.data) setRecon(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!recon) {
    return (
      <div className="text-center pt-20">
        <p className="text-gray-500">Reconciliation not found</p>
        <Link href="/gst" className="btn-primary mt-4 inline-block">
          Back to GST
        </Link>
      </div>
    );
  }

  const isProcessing =
    recon.status === "PENDING" || recon.status === "PROCESSING";
  const mismatches = (
    Array.isArray(recon.mismatches)
      ? recon.mismatches
      : typeof recon.mismatches === "string"
        ? JSON.parse(recon.mismatches)
        : []
  ) as Mismatch[];
  const normLog = (
    Array.isArray(recon.normalisation_log)
      ? recon.normalisation_log
      : typeof recon.normalisation_log === "string"
        ? JSON.parse(recon.normalisation_log)
        : []
  ) as NormLog[];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/gst"
            className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block"
          >
            ← Back to GST
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            GST Reconciliation — {recon.period}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {recon.client?.name} · {recon.gstin}
          </p>
        </div>
        <span
          className={
            recon.status === "COMPLETED"
              ? "badge-green"
              : recon.status === "FAILED"
                ? "badge-red"
                : "badge-blue"
          }
        >
          {recon.status}
        </span>
      </div>

      {/* Processing */}
      {isProcessing && (
        <div className="card flex items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">
              AI is reconciling your data…
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Normalising, matching, and explaining mismatches. Updates
              automatically.
            </p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      {recon.status === "COMPLETED" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "GSTR-2B invoices",
                value: recon.total_invoices_gstr2b ?? 0,
                color: "bg-blue-50 text-blue-700",
              },
              {
                label: "Purchase invoices",
                value: recon.total_invoices_purchase ?? 0,
                color: "bg-blue-50 text-blue-700",
              },
              {
                label: "Perfectly matched",
                value: recon.matched_count ?? 0,
                color: "bg-green-50 text-green-700",
              },
              {
                label: "Total mismatches",
                value:
                  (recon.mismatch_count ?? 0) +
                  (recon.missing_in_gstr2b ?? 0) +
                  (recon.missing_in_purchase ?? 0),
                color: "bg-red-50 text-red-700",
              },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                <p className="text-xs font-medium opacity-70 uppercase tracking-wide">
                  {s.label}
                </p>
                <p className="text-3xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Normalisation log */}
          {normLog.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-medium text-amber-800 mb-2">
                Data cleaned before matching:
              </p>
              {normLog.map((l, i) => (
                <p key={i} className="text-xs text-amber-700">
                  • {l.issue} → {l.fix} ({l.count} records)
                </p>
              ))}
            </div>
          )}

          {/* Mismatches */}
          {mismatches.length === 0 &&
          (recon.mismatch_count ?? 0) === 0 &&
          (recon.missing_in_gstr2b ?? 0) === 0 &&
          (recon.missing_in_purchase ?? 0) === 0 ? (
            <div className="card text-center py-10">
              <p className="text-2xl mb-2">✅</p>
              <p className="font-medium text-gray-900">
                Perfect match — no mismatches found!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                All invoices in GSTR-2B match your purchase register exactly.
              </p>
            </div>
          ) : (
            <div className="card">
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Mismatches ({mismatches.length})
              </h3>
              <div className="space-y-3">
                {mismatches.map((m, i) => (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Invoice:{" "}
                          <span className="font-mono">{m.invoice_no}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          GSTIN: <span className="font-mono">{m.gstin}</span>
                        </p>
                      </div>
                      <span
                        className={
                          m.type === "VALUE_MISMATCH"
                            ? "badge-amber"
                            : m.type === "MISSING_IN_PURCHASE"
                              ? "badge-red"
                              : "badge-purple"
                        }
                      >
                        {m.type.replace(/_/g, " ")}
                      </span>
                    </div>

                    {m.type === "VALUE_MISMATCH" && (
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-gray-500">
                          GSTR-2B:{" "}
                          <strong className="text-gray-900">
                            ₹{m.gstr2b_amt?.toLocaleString("en-IN")}
                          </strong>
                        </span>
                        <span className="text-gray-500">
                          Books:{" "}
                          <strong className="text-gray-900">
                            ₹{m.purchase_amt?.toLocaleString("en-IN")}
                          </strong>
                        </span>
                        <span className="text-red-600">
                          Diff: ₹{m.difference?.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}

                    {m.explanation && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                        <strong>Why:</strong> {m.explanation}
                      </div>
                    )}

                    {m.action && (
                      <p className="mt-1 text-xs text-green-700">
                        <strong>Action:</strong> {m.action}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
