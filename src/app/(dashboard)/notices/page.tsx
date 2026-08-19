"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Notice {
  id: string;
  notice_type: string;
  portal: string;
  section?: string;
  assessment_year?: string;
  due_date?: string;
  ai_status: string;
  review_status: string;
  created_at: string;
  client?: { name: string };
}

const AI_STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-gray",
  PROCESSING: "badge-blue",
  COMPLETED: "badge-green",
  FAILED: "badge-red",
};

const REVIEW_COLORS: Record<string, string> = {
  DRAFT: "badge-amber",
  REVIEWED: "badge-blue",
  FILED: "badge-green",
};

export default function NoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadNotices();
  }, [filter]);

  async function loadNotices() {
    setLoading(true);
    try {
      const q = filter !== "all" ? `&reviewStatus=${filter}` : "";
      const res = await fetch(`/api/notices?pageSize=50${q}`);
      const data = await res.json();
      setNotices(data.data?.data ?? []);
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
          <h1 className="text-xl font-semibold text-gray-900">Notice AI</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total notices</p>
        </div>
        <Link href="/notices/new" className="btn-primary w-full sm:w-auto">
          + Upload notice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { value: "all", label: "All" },
          { value: "DRAFT", label: "Pending review" },
          { value: "REVIEWED", label: "Reviewed" },
          { value: "FILED", label: "Filed" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`min-h-11 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === f.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
            }`}
          >
            {f.label}
          </button>
        ))}
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
      ) : notices.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🤖</p>
          <h3 className="text-base font-medium text-gray-900">
            No notices yet
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload an income tax or GST notice — AI drafts the reply in 90
            seconds
          </p>
          <Link href="/notices/new" className="btn-primary mt-4 inline-block">
            Upload first notice
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  "Client",
                  "Notice type",
                  "Section",
                  "Portal",
                  "AI status",
                  "Review",
                  "Due date",
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
              {notices.map((notice) => (
                <tr
                  key={notice.id}
                  onClick={() => router.push(`/notices/${notice.id}`)}
                  className="border-b border-gray-50 last:border-0 hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {notice.client?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {notice.notice_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {notice.section ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-blue">{notice.portal}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        AI_STATUS_COLORS[notice.ai_status] ?? "badge-gray"
                      }
                    >
                      {notice.ai_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        REVIEW_COLORS[notice.review_status] ?? "badge-gray"
                      }
                    >
                      {notice.review_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {notice.due_date
                      ? new Date(notice.due_date).toLocaleDateString("en-IN")
                      : "—"}
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
