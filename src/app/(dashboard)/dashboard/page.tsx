"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalClients: number;
  noticesUnreviewed: number;
  gstReconsPending: number;
  invoicesOutstanding: number;
  outstandingAmount: number;
  complianceOverdue: number;
  newClientsThisMonth: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const s = stats;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">
          Welcome to CA Saathi 👋
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Your AI-powered practice management platform.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Clients",
            value: loading ? "…" : (s?.totalClients ?? 0),
            sub: loading ? "" : `+${s?.newClientsThisMonth ?? 0} this month`,
            color: "bg-blue-50 text-blue-700",
          },
          {
            label: "Notices to Review",
            value: loading ? "…" : (s?.noticesUnreviewed ?? 0),
            sub: "AI completed, awaiting CA",
            color:
              (s?.noticesUnreviewed ?? 0) > 0
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700",
          },
          {
            label: "Outstanding Bills",
            value: loading
              ? "…"
              : `₹${((s?.outstandingAmount ?? 0) / 1000).toFixed(0)}k`,
            sub: `${s?.invoicesOutstanding ?? 0} unpaid invoices`,
            color: "bg-amber-50 text-amber-700",
          },
          {
            label: "Overdue Tasks",
            value: loading ? "…" : (s?.complianceOverdue ?? 0),
            sub: "compliance deadlines missed",
            color:
              (s?.complianceOverdue ?? 0) > 0
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700",
          },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-5 ${stat.color}`}>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">
              {stat.label}
            </p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
            <p className="text-xs mt-1 opacity-60">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          Quick actions
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { href: "/clients/new", icon: "👥", label: "Add client" },
            { href: "/notices/new", icon: "🤖", label: "Upload notice" },
            { href: "/gst/reconcile", icon: "🧾", label: "GST recon" },
            { href: "/billing/invoices", icon: "💰", label: "Create invoice" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all text-center"
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-medium text-gray-700">
                {a.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {s && (s.noticesUnreviewed > 0 || s.complianceOverdue > 0) && (
        <div className="card border-amber-200 bg-amber-50">
          <h3 className="text-base font-medium text-amber-900 mb-3">
            ⚠ Attention needed
          </h3>
          <div className="space-y-2">
            {s.noticesUnreviewed > 0 && (
              <Link
                href="/notices?reviewStatus=DRAFT"
                className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-amber-50 transition-colors"
              >
                <p className="text-sm text-gray-700">
                  <strong>{s.noticesUnreviewed}</strong> notice
                  {s.noticesUnreviewed > 1 ? "s" : ""} ready for review
                </p>
                <span className="text-blue-600 text-sm">Review →</span>
              </Link>
            )}
            {s.complianceOverdue > 0 && (
              <Link
                href="/calendar"
                className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-amber-50 transition-colors"
              >
                <p className="text-sm text-gray-700">
                  <strong>{s.complianceOverdue}</strong> compliance task
                  {s.complianceOverdue > 1 ? "s" : ""} overdue
                </p>
                <span className="text-blue-600 text-sm">View →</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Getting started */}
      <div className="card">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          Getting started
        </h3>
        <div className="space-y-3">
          {[
            {
              step: "1",
              title: "Add your first client",
              desc: "Start by adding a client with their PAN and GSTIN",
              href: "/clients/new",
              done: (s?.totalClients ?? 0) > 0,
            },
            {
              step: "2",
              title: "Upload a notice",
              desc: "Upload any income tax or GST notice — AI will draft the reply",
              href: "/notices/new",
              done: false,
            },
            {
              step: "3",
              title: "Run a GST reconciliation",
              desc: "Upload GSTR-2B and purchase register — results in 90 seconds",
              href: "/gst/reconcile",
              done: false,
            },
          ].map((item) => (
            <Link
              key={item.step}
              href={item.href}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  item.done
                    ? "bg-green-500 text-white"
                    : "bg-blue-600 text-white"
                }`}
              >
                {item.done ? "✓" : item.step}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <span className="ml-auto text-gray-400">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
