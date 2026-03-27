"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const NOTICE_TYPES = [
  { value: "SCRUTINY_143_2", label: "Scrutiny 143(2)" },
  { value: "DEFECTIVE_RETURN", label: "Defective Return" },
  { value: "DEMAND_156", label: "Demand Notice 156" },
  { value: "RECTIFICATION", label: "Rectification" },
  { value: "REFUND_QUERY", label: "Refund Query" },
  { value: "HIGH_VALUE_TXN", label: "High Value Transaction" },
  { value: "GST_ITC_MISMATCH", label: "GST ITC Mismatch" },
  { value: "GST_RETURN_DEFAULT", label: "GST Return Default" },
  { value: "GST_SCN", label: "GST Show Cause Notice" },
  { value: "TDS_DEFAULT", label: "TDS Default" },
  { value: "OTHER", label: "Other" },
];

interface Client {
  id: string;
  name: string;
}

function NewNoticePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    clientId: searchParams.get("clientId") ?? "",
    portal: "INCOME_TAX",
    noticeType: "SCRUTINY_143_2",
    section: "",
    assessmentYear: "",
    referenceNumber: "",
    dueDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients?pageSize=200")
      .then((r) => r.json())
      .then((d) => setClients(d.data?.data ?? []));
  }, []);

  const f =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      setError("Please select a client");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          r2Key: `notices/placeholder-${Date.now()}.txt`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create notice");
        return;
      }
      router.push(`/notices/${data.data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Upload notice</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI will read the notice and draft a legal reply
          </p>
        </div>
        <Link href="/notices" className="btn-secondary">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Client */}
        <div>
          <label className="label">Client *</label>
          <select
            className="input"
            required
            value={form.clientId}
            onChange={f("clientId")}
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Portal */}
          <div>
            <label className="label">Portal *</label>
            <select
              className="input"
              value={form.portal}
              onChange={f("portal")}
            >
              {["INCOME_TAX", "GST", "TRACES", "MCA"].map((p) => (
                <option key={p} value={p}>
                  {p.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Notice type */}
          <div>
            <label className="label">Notice type *</label>
            <select
              className="input"
              value={form.noticeType}
              onChange={f("noticeType")}
            >
              {NOTICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="label">Section</label>
            <input
              className="input"
              value={form.section}
              onChange={f("section")}
              placeholder="e.g. 143(2)"
            />
          </div>

          {/* Assessment year */}
          <div>
            <label className="label">Assessment year</label>
            <input
              className="input"
              value={form.assessmentYear}
              onChange={f("assessmentYear")}
              placeholder="e.g. AY 2023-24"
            />
          </div>

          {/* Reference number */}
          <div>
            <label className="label">Reference / DIN number</label>
            <input
              className="input"
              value={form.referenceNumber}
              onChange={f("referenceNumber")}
              placeholder="Notice reference"
            />
          </div>

          {/* Due date */}
          <div>
            <label className="label">Response due date</label>
            <input
              className="input"
              type="date"
              value={form.dueDate}
              onChange={f("dueDate")}
            />
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <strong>How it works:</strong> Fill in the notice details above. AI
          will draft a complete legal reply based on the notice type and
          section. You review and edit the draft before downloading.
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || !form.clientId}
          >
            {saving ? "Generating reply…" : "Generate AI reply"}
          </button>
          <Link href="/notices" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewNoticePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NewNoticePageInner />
    </Suspense>
  );
}
