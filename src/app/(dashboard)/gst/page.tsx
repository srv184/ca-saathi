"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Recon {
  id: string;
  period: string;
  gstin: string;
  status: string;
  matched_count?: number;
  mismatch_count?: number;
  missing_in_gstr2b?: number;
  missing_in_purchase?: number;
  created_at: string;
  client?: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-gray",
  PROCESSING: "badge-blue",
  COMPLETED: "badge-green",
  FAILED: "badge-red",
};

export default function GstPage() {
  const router = useRouter();
  const [recons, setRecons] = useState<Recon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecons();
  }, []);

  async function loadRecons() {
    setLoading(true);
    try {
      const res = await fetch("/api/gst/reconcile?pageSize=50");
      const data = await res.json();
      setRecons(data.data?.data ?? []);
      setTotal(data.data?.total ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            GST Reconciliation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} total reconciliations
          </p>
        </div>
        <Link href="/gst/reconcile" className="btn-primary w-full sm:w-auto">
          + Run reconciliation
        </Link>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 border-b border-gray-50 animate-pulse bg-gray-50"
            />
          ))}
        </div>
      ) : recons.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🧾</p>
          <h3 className="text-base font-medium text-gray-900">
            No reconciliations yet
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload GSTR-2B and purchase register — results in 90 seconds
          </p>
          <Link href="/gst/reconcile" className="btn-primary mt-4 inline-block">
            Run first reconciliation
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  "Client",
                  "Period",
                  "GSTIN",
                  "Status",
                  "Matched",
                  "Mismatches",
                  "Date",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recons.map((recon) => (
                <tr
                  key={recon.id}
                  onClick={() => router.push(`/gst/${recon.id}`)}
                  className="border-b border-gray-50 last:border-0 hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {recon.client?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {recon.period}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {recon.gstin}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={STATUS_COLORS[recon.status] ?? "badge-gray"}
                    >
                      {recon.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-green-700 font-medium">
                    {recon.matched_count ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {(recon.mismatch_count ?? 0) > 0 ? (
                      <span className="text-red-600 font-medium">
                        {recon.mismatch_count}
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        {recon.mismatch_count ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(recon.created_at).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
