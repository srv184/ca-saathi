"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Overview {
  totalClients: number;
  newClientsThisMonth: number;
  totalNotices: number;
  noticesCompleted: number;
  totalRecons: number;
  reconsCompleted: number;
  totalInvoices: number;
  totalRevenue: number;
  complianceTasks: number;
  complianceFiled: number;
  complianceRate: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenue, setRevenue] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (data.data) {
        setOverview(data.data.overview);
        setRevenue(data.data.monthlyRevenue);
      }
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

  if (!overview) {
    return (
      <div className="text-center pt-20">
        <p className="text-gray-500">Failed to load analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Practice performance at a glance
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total clients",
            value: overview.totalClients,
            sub: `+${overview.newClientsThisMonth} this month`,
            color: "bg-blue-50 text-blue-700",
          },
          {
            label: "Total revenue",
            value: `₹${overview.totalRevenue.toLocaleString("en-IN")}`,
            sub: `${overview.totalInvoices} invoices`,
            color: "bg-green-50 text-green-700",
          },
          {
            label: "AI notices processed",
            value: overview.noticesCompleted,
            sub: `${overview.totalNotices} total`,
            color: "bg-purple-50 text-purple-700",
          },
          {
            label: "Compliance rate",
            value: `${overview.complianceRate}%`,
            sub: `${overview.complianceFiled}/${overview.complianceTasks} filed`,
            color: "bg-amber-50 text-amber-700",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-5 ${s.color}`}>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">
              {s.label}
            </p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
            <p className="text-xs mt-1 opacity-60">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          Monthly revenue (last 12 months)
        </h3>
        {revenue.every((r) => r.revenue === 0) ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">
              No paid invoices yet. Revenue will appear here once clients pay.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* AI usage */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-medium text-gray-900 mb-4">AI usage</h3>
          <div className="space-y-3">
            {[
              {
                label: "Notice replies generated",
                value: overview.noticesCompleted,
                total: overview.totalNotices,
                color: "bg-purple-500",
              },
              {
                label: "GST recons completed",
                value: overview.reconsCompleted,
                total: overview.totalRecons,
                color: "bg-blue-500",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-gray-900">
                    {item.value}/{item.total}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{
                      width:
                        item.total > 0
                          ? `${(item.value / item.total) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Compliance summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tasks this month</span>
              <span className="font-medium text-gray-900">
                {overview.complianceTasks}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Filed on time</span>
              <span className="font-medium text-green-700">
                {overview.complianceFiled}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="font-medium text-amber-700">
                {overview.complianceTasks - overview.complianceFiled}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Compliance rate</span>
                <span className="font-medium text-gray-900">
                  {overview.complianceRate}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${overview.complianceRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
