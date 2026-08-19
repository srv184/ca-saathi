"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Notice {
  id: string;
  notice_type: string;
  portal: string;
  section?: string;
  assessment_year?: string;
  reference_number?: string;
  due_date?: string;
  ai_status: string;
  ai_draft?: string;
  ai_summary?: string;
  ai_citations?: {
    section: string;
    description: string;
    source: string;
  }[];
  review_status: string;
  reviewed_at?: string;
  ca_edited_reply?: string;
  client?: { name: string };
  reviewer?: { name: string };
}

export default function NoticeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadNotice();
  }, [params.id]);

  // Poll every 5 seconds while AI is processing
  useEffect(() => {
    if (!notice) return;
    if (notice.ai_status === "PENDING" || notice.ai_status === "PROCESSING") {
      const t = setTimeout(loadNotice, 5000);
      return () => clearTimeout(t);
    }
  }, [notice]);

  async function loadNotice() {
    try {
      const res = await fetch(`/api/notices/${params.id}`);
      const data = await res.json();
      if (data.data) {
        setNotice(data.data);
        if (!reply) {
          setReply(data.data.ca_edited_reply ?? data.data.ai_draft ?? "");
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleReview() {
    if (reply.length < 10) {
      setMsg("Reply is too short");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/notices/${params.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedReply: reply }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Failed to mark as reviewed");
        return;
      }
      setMsg("✅ Marked as reviewed — you can now download the PDF");
      await loadNotice();
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="text-center pt-20">
        <p className="text-gray-500">Notice not found</p>
        <Link href="/notices" className="btn-primary mt-4 inline-block">
          Back to notices
        </Link>
      </div>
    );
  }

  const isProcessing =
    notice.ai_status === "PENDING" || notice.ai_status === "PROCESSING";
  const canReview =
    notice.ai_status === "COMPLETED" && notice.review_status === "DRAFT";
  const isReviewed =
    notice.review_status === "REVIEWED" || notice.review_status === "FILED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/notices"
            className="inline-flex min-h-11 items-center text-sm text-gray-400 hover:text-gray-600"
          >
            ← Back to notices
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            {notice.notice_type.replace(/_/g, " ")}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {notice.client?.name} · {notice.section ?? "—"} ·{" "}
            {notice.assessment_year ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              notice.ai_status === "COMPLETED"
                ? "badge-green"
                : notice.ai_status === "FAILED"
                  ? "badge-red"
                  : "badge-blue"
            }
          >
            AI: {notice.ai_status}
          </span>
          <span className={isReviewed ? "badge-green" : "badge-amber"}>
            {notice.review_status}
          </span>
        </div>
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="card flex items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 shrink-0" />
          <div>
            <p className="font-medium text-gray-900">
              AI is reading and drafting the reply…
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              This takes 30–90 seconds. Page updates automatically.
            </p>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {notice.ai_summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
            AI Summary
          </p>
          <p className="text-sm text-blue-900">{notice.ai_summary}</p>
        </div>
      )}

      {/* Draft editor */}
      {notice.ai_draft && (
        <div className="card space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900">
                Draft reply
              </h3>
              {!isReviewed && (
                <p className="text-xs text-amber-600 mt-0.5 font-medium">
                  ⚠ AI Draft — Review Required before downloading
                </p>
              )}
            </div>
            {isReviewed && (
              <button
                className="btn-primary w-full text-sm sm:w-auto"
                onClick={() => alert("PDF download coming soon")}
              >
                Download PDF
              </button>
            )}
          </div>

          <textarea
            className="input font-mono text-xs leading-relaxed"
            rows={20}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={isReviewed}
          />

          {msg && (
            <div
              className={`text-sm p-3 rounded-lg ${
                msg.startsWith("✅")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {msg}
            </div>
          )}

          {canReview && (
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-start sm:gap-4">
              <p className="text-sm text-gray-600 flex-1">
                Review the draft above. Edit any line freely. When satisfied
                click "Mark as reviewed" to unlock PDF download.
              </p>
              <button
                className="btn-primary w-full shrink-0 sm:w-auto"
                onClick={handleReview}
                disabled={saving}
              >
                {saving ? "Saving…" : "Mark as reviewed"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Citations */}
      {notice.ai_citations && notice.ai_citations.length > 0 && (
        <div className="card">
          <h3 className="text-base font-medium text-gray-900 mb-3">
            Legal citations used by AI
          </h3>
          <div className="space-y-2">
            {notice.ai_citations.map((c, i) => (
              <div
                key={i}
                className="flex flex-col items-start gap-2 text-sm p-3 bg-gray-50 rounded-lg sm:flex-row sm:gap-3"
              >
                <span className="badge-blue shrink-0">{c.section}</span>
                <div>
                  <p className="text-gray-700">{c.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
