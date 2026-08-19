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
  notes?: string;
  status: string;
  due_date: string;
  sent_at?: string;
  paid_at?: string;
  created_at: string;
  client?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "badge-gray",
  SENT: "badge-blue",
  PAID: "badge-green",
  OVERDUE: "badge-red",
  CANCELLED: "badge-gray",
};

export default function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  async function loadInvoice() {
    try {
      const res = await fetch(`/api/billing/${params.id}`);
      const data = await res.json();
      if (data.data) setInvoice(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: string) {
    setActing(true);
    setMsg("");
    try {
      const res = await fetch(`/api/billing/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Action failed");
        return;
      }
      await loadInvoice();
      setMsg(
        action === "send"
          ? "✅ Invoice marked as sent"
          : action === "mark-paid"
            ? "✅ Invoice marked as paid"
            : action === "cancel"
              ? "✅ Invoice cancelled"
              : "✅ Done",
      );
    } catch {
      setMsg("Network error");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center pt-20">
        <p className="text-gray-500">Invoice not found</p>
        <Link
          href="/billing/invoices"
          className="btn-primary mt-4 inline-block"
        >
          Back to billing
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/billing/invoices"
            className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block"
          >
            ← Back to billing
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            {invoice.invoice_number}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={STATUS_COLORS[invoice.status] ?? "badge-gray"}>
              {invoice.status}
            </span>
            <span className="text-sm text-gray-500">
              {invoice.client?.name}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {invoice.status === "DRAFT" && (
            <button
              onClick={() => handleAction("send")}
              className="btn-primary text-sm"
              disabled={acting}
            >
              {acting ? "Sending…" : "Mark as sent"}
            </button>
          )}
          {invoice.status === "SENT" && (
            <button
              onClick={() => handleAction("mark-paid")}
              className="btn-primary text-sm"
              disabled={acting}
            >
              {acting ? "Updating…" : "✅ Mark as paid"}
            </button>
          )}
          {["DRAFT", "SENT"].includes(invoice.status) && (
            <button
              onClick={() => {
                if (confirm("Cancel this invoice?")) handleAction("cancel");
              }}
              className="btn-danger text-sm"
              disabled={acting}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div
          className={`text-sm p-3 rounded-lg border ${
            msg.startsWith("✅")
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {msg}
        </div>
      )}

      {/* Invoice card */}
      <div className="card">
        {/* Letterhead */}
        <div className="flex items-start justify-between pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-blue-600">CA Saathi</h2>
            <p className="text-sm text-gray-500 mt-1">Tax Invoice</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">
              {invoice.invoice_number}
            </p>
            <p className="text-sm text-gray-500">
              Date: {new Date(invoice.created_at).toLocaleDateString("en-IN")}
            </p>
            <p className="text-sm text-gray-500">
              Due: {new Date(invoice.due_date).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>

        {/* Client info */}
        <div className="py-4 border-b border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Bill to
          </p>
          <p className="font-medium text-gray-900">{invoice.client?.name}</p>
          {invoice.client?.email && (
            <p className="text-sm text-gray-500">{invoice.client.email}</p>
          )}
          {invoice.client?.phone && (
            <p className="text-sm text-gray-500">{invoice.client.phone}</p>
          )}
        </div>

        {/* Line items */}
        <div className="py-4 border-b border-gray-100">
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left pb-2">Description</th>
                <th className="text-right pb-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 text-gray-900">{invoice.description}</td>
                <td className="py-2 text-right font-medium text-gray-900">
                  ₹{invoice.amount.toLocaleString("en-IN")}
                </td>
              </tr>
              {invoice.notes && (
                <tr>
                  <td className="py-1 text-xs text-gray-400 col-span-2">
                    Note: {invoice.notes}
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>

        {/* Totals */}
        <div className="pt-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">
              ₹{invoice.amount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">GST @ 18%</span>
            <span className="text-gray-900">
              ₹{invoice.gst_amount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-2 mt-2">
            <span className="text-gray-900">Total</span>
            <span className="text-blue-600">
              ₹{invoice.total_amount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Payment status */}
        {invoice.paid_at && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">
              ✅ Paid on {new Date(invoice.paid_at).toLocaleDateString("en-IN")}
            </p>
          </div>
        )}

        {invoice.sent_at && !invoice.paid_at && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Sent on {new Date(invoice.sent_at).toLocaleDateString("en-IN")}
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="card">
        <h3 className="text-base font-medium text-gray-900 mb-3">Timeline</h3>
        <div className="space-y-2">
          {[
            { label: "Created", date: invoice.created_at, show: true },
            { label: "Sent", date: invoice.sent_at, show: !!invoice.sent_at },
            { label: "Paid", date: invoice.paid_at, show: !!invoice.paid_at },
          ]
            .filter((t) => t.show)
            .map((t) => (
              <div key={t.label} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                <span className="text-gray-500">{t.label}</span>
                <span className="text-gray-900">
                  {new Date(t.date!).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
