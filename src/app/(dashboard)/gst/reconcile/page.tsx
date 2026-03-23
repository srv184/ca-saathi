"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  gstin?: string;
}

export default function StartReconPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    clientId: searchParams.get("clientId") ?? "",
    gstin: "",
    period: "",
  });
  const [gstr2bText, setGstr2bText] = useState("");
  const [purchaseText, setPurchaseText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients?pageSize=200")
      .then((r) => r.json())
      .then((d) => setClients(d.data?.data ?? []));
  }, []);

  // Auto-fill GSTIN when client is selected
  useEffect(() => {
    if (form.clientId) {
      const client = clients.find((c) => c.id === form.clientId);
      if (client?.gstin) {
        setForm((p) => ({ ...p, gstin: client.gstin ?? "" }));
      }
    }
  }, [form.clientId, clients]);

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
    if (!gstr2bText || !purchaseText) {
      setError("Please paste both GSTR-2B and purchase register data");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/gst/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          gstr2bData: gstr2bText,
          purchaseData: purchaseText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start reconciliation");
        return;
      }
      router.push(`/gst/${data.data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Run GST reconciliation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Paste your GSTR-2B and purchase register data below
          </p>
        </div>
        <Link href="/gst" className="btn-secondary">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="card space-y-4">
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
                  {c.name} {c.gstin ? `— ${c.gstin}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* GSTIN */}
            <div>
              <label className="label">GSTIN *</label>
              <input
                className="input font-mono uppercase"
                required
                value={form.gstin}
                onChange={f("gstin")}
                placeholder="29ABCDE1234F1Z5"
                maxLength={15}
              />
            </div>

            {/* Period */}
            <div>
              <label className="label">Period *</label>
              <input
                className="input"
                required
                value={form.period}
                onChange={f("period")}
                placeholder="Mar-2025"
              />
            </div>
          </div>
        </div>

        {/* GSTR-2B data */}
        <div className="card">
          <label className="label">GSTR-2B data *</label>
          <p className="text-xs text-gray-400 mb-2">
            Paste CSV data from your GSTR-2B download. First row must be
            headers.
          </p>
          <textarea
            className="input font-mono text-xs"
            rows={6}
            value={gstr2bText}
            onChange={(e) => setGstr2bText(e.target.value)}
            placeholder={`gstin,invoice_no,invoice_date,taxable_value,tax_amount\n29ABCDE1234F1Z5,INV001,01-03-2025,10000,1800`}
            required
          />
        </div>

        {/* Purchase register data */}
        <div className="card">
          <label className="label">Purchase register data *</label>
          <p className="text-xs text-gray-400 mb-2">
            Paste CSV data from your Tally or accounting software export.
          </p>
          <textarea
            className="input font-mono text-xs"
            rows={6}
            value={purchaseText}
            onChange={(e) => setPurchaseText(e.target.value)}
            placeholder={`gstin,invoice_no,invoice_date,amount,tax_amount\n29ABCDE1234F1Z5,INV001,01-03-2025,10000,1800`}
            required
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          <strong>Messy data?</strong> No problem. AI normalises invoice
          prefixes, date formats, and special characters before matching.
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Processing…" : "Run reconciliation"}
          </button>
          <Link href="/gst" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
