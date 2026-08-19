"use client";
import { useEffect, useState } from "react";

interface Firm {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  gstin?: string;
  pan?: string;
  icai_number?: string;
  plan_type: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "badge-purple",
  SENIOR_CA: "badge-blue",
  JUNIOR_CA: "badge-green",
  ARTICLE: "badge-gray",
};

export default function SettingsPage() {
  const [firm, setFirm] = useState<Firm | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    website: "",
    gstin: "",
    pan: "",
    icai_number: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.data) {
        setFirm(data.data.firm);
        setUsers(data.data.users);
        setForm({
          name: data.data.firm.name ?? "",
          phone: data.data.firm.phone ?? "",
          address: data.data.firm.address ?? "",
          website: data.data.firm.website ?? "",
          gstin: data.data.firm.gstin ?? "",
          pan: data.data.firm.pan ?? "",
          icai_number: data.data.firm.icai_number ?? "",
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Failed to save");
        return;
      }
      setFirm(data.data);
      setEditing(false);
      setMsg("Settings saved successfully");
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(false);
    }
  }

  const f =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your firm profile and team
        </p>
      </div>

      {msg && (
        <div
          className={`text-sm p-3 rounded-lg border ${
            msg.includes("success")
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {msg}
        </div>
      )}

      {/* Firm profile */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">Firm profile</h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary text-sm"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="col-span-2">
                <label className="label">Firm name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={f("name")}
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={f("phone")}
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="label">ICAI number</label>
                <input
                  className="input"
                  value={form.icai_number}
                  onChange={f("icai_number")}
                  placeholder="123456"
                />
              </div>
              <div>
                <label className="label">PAN</label>
                <input
                  className="input font-mono uppercase"
                  value={form.pan}
                  onChange={f("pan")}
                  placeholder="ABCDE1234F"
                />
              </div>
              <div>
                <label className="label">GSTIN</label>
                <input
                  className="input font-mono uppercase"
                  value={form.gstin}
                  onChange={f("gstin")}
                  placeholder="29ABCDE1234F1Z5"
                />
              </div>
              <div>
                <label className="label">Website</label>
                <input
                  className="input"
                  value={form.website}
                  onChange={f("website")}
                  placeholder="https://yourfirm.com"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.address}
                  onChange={f("address")}
                  placeholder="Full address"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Firm name", firm?.name ?? "—"],
              ["Email", firm?.email ?? "—"],
              ["Phone", firm?.phone ?? "—"],
              ["ICAI number", firm?.icai_number ?? "—"],
              ["PAN", firm?.pan ?? "—"],
              ["GSTIN", firm?.gstin ?? "—"],
              ["Website", firm?.website ?? "—"],
              ["Plan", firm?.plan_type ?? "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-gray-500">{k}</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">
                  {v}
                </dd>
              </div>
            ))}
            {firm?.address && (
              <div className="col-span-2">
                <dt className="text-xs text-gray-500">Address</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">
                  {firm.address}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* Team */}
      <div className="card">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          Team members ({users.length})
        </h3>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {user.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={ROLE_COLORS[user.role] ?? "badge-gray"}>
                  {user.role.replace("_", " ")}
                </span>
                {user.last_login_at && (
                  <span className="text-xs text-gray-400">
                    Last login:{" "}
                    {new Date(user.last_login_at).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card">
        <h3 className="text-base font-medium text-gray-900 mb-2">
          AI Configuration
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Current AI provider is configured via environment variables. Change{" "}
          <code className="bg-gray-100 px-1 rounded">AI_PROVIDER</code>,{" "}
          <code className="bg-gray-100 px-1 rounded">AI_BASE_URL</code> and{" "}
          <code className="bg-gray-100 px-1 rounded">AI_MODEL</code> in your
          .env.local to switch providers.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600">
          <p>
            AI_BASE_URL ={" "}
            {process.env.NEXT_PUBLIC_APP_URL ? "(configured)" : "not set"}
          </p>
          <p>AI_MODEL = configured via environment</p>
        </div>
      </div>

      {/* Subscription */}
      <div className="card">
        <h3 className="text-base font-medium text-gray-900 mb-2">
          Subscription
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Current plan:{" "}
              <span className="font-medium">{firm?.plan_type ?? "—"}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              30-day free trial — no credit card required
            </p>
          </div>
          <span className="badge-green">Active</span>
        </div>
      </div>
    </div>
  );
}
