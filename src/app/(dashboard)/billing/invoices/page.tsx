"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Invoice {
  id: string;
  invoice_number: string;
  description: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  status: string;
  due_date: string;
  sent_at?: string;
  paid_at?: string;
  client?: { name: string; email?: string };
}

interface Summary {
  totalBilled: number;
  totalOutstanding: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "badge-gray",
  SENT: "badge-blue",
  PAID: "badge-green",
  OVERDUE: "badge-red",
  CANCELLED: "badge-gray",
};

export default function BillingPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalBilled: 0,
    totalOutstanding: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [filter]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const q = filter !== "all" ? `&status=${filter}` : "";
      const res = await fetch(`/api/billing/invoices?pageSize=50${q}`);
      const data = await res.json();
      setInvoices(data.data?.data ?? []);
      setTotal(data.data?.total ?? 0);
      setSummary(data.data?.summary ?? { totalBilled: 0, totalOutstanding: 0 });
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
          <h1 className="text-xl font-semibold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total invoices</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary w-full sm:w-auto">
          + Create invoice
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2">
        <div className="rounded-xl p-5 bg-blue-50 text-blue-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">
            Total billed
          </p>
          <p className="text-3xl font-bold mt-1">
            ₹{summary.totalBilled.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl p-5 bg-amber-50 text-amber-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">
            Outstanding
          </p>
          <p className="text-3xl font-bold mt-1">
            ₹{summary.totalOutstanding.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { value: "all", label: "All" },
          { value: "DRAFT", label: "Draft" },
          { value: "SENT", label: "Sent" },
          { value: "PAID", label: "Paid" },
          { value: "OVERDUE", label: "Overdue" },
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

      {/* New invoice modal */}
      {showNew && (
        <NewInvoiceModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            loadInvoices();
          }}
        />
      )}

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
      ) : invoices.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">💰</p>
          <h3 className="text-base font-medium text-gray-900">
            No invoices yet
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Create your first invoice
          </p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-4">
            Create invoice
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  "Invoice #",
                  "Client",
                  "Description",
                  "Amount",
                  "Status",
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
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/billing/${inv.id}`)}
                  className="border-b border-gray-50 last:border-0 hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                    {inv.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {inv.client?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 truncate max-w-xs">
                    {inv.description}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    ₹{inv.total_amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_COLORS[inv.status] ?? "badge-gray"}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(inv.due_date).toLocaleDateString("en-IN")}
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

function NewInvoiceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    clientId: "",
    description: "",
    amount: "",
    dueDate: "",
    notes: "",
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
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Create invoice
        </h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <label className="label">Description *</label>
            <input
              className="input"
              required
              value={form.description}
              onChange={f("description")}
              placeholder="GST filing for FY 2024-25"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Amount (₹) *</label>
              <input
                className="input"
                type="number"
                required
                min="1"
                value={form.amount}
                onChange={f("amount")}
                placeholder="5000"
              />
            </div>
            <div>
              <label className="label">Due date *</label>
              <input
                className="input"
                type="date"
                required
                value={form.dueDate}
                onChange={f("dueDate")}
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={f("notes")}
              placeholder="Optional notes"
            />
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={saving}
            >
              {saving ? "Creating…" : "Create invoice"}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
