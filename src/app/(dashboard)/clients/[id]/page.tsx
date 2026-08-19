"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  name: string;
  entity_type: string;
  pan_encrypted?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string;
  portal_enabled: boolean;
  services_engaged: string[];
  financial_year: string;
  address?: string;
  status: string;
  created_at: string;
  assigned_ca?: { name: string };
  _count?: {
    documents: number;
    notices: number;
    invoices: number;
  };
}

export default function ClientProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadClient();
  }, [params.id]);

  async function loadClient() {
    try {
      const res = await fetch(`/api/clients/${params.id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Client not found");
        return;
      }
      setClient(data.data);
    } catch {
      setError("Failed to load client");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this client?")) return;
    const res = await fetch(`/api/clients/${params.id}`, { method: "DELETE" });
    if (res.ok) router.push("/clients");
  }

  async function handleInvite() {
    setInviting(true);
    try {
      const res = await fetch("/api/portal/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: params.id }),
      });
      const data = await res.json();
      if (res.ok) setInviteUrl(data.data.inviteUrl);
    } catch {
      // ignore
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="text-center pt-20">
        <p className="text-gray-500">{error || "Client not found"}</p>
        <Link href="/clients" className="btn-primary mt-4 inline-block">
          Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
            {client.name[0]}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {client.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="badge-blue">
                {client.entity_type.replace(/_/g, " ")}
              </span>
              <span
                className={
                  client.status === "ACTIVE" ? "badge-green" : "badge-gray"
                }
              >
                {client.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleInvite}
            className="btn-secondary text-sm"
            disabled={inviting}
          >
            {inviting ? "Generating…" : "🔗 Portal invite"}
          </button>
          <Link
            href={`/notices/new?clientId=${client.id}`}
            className="btn-primary text-sm"
          >
            Upload notice
          </Link>
          <Link
            href={`/gst/reconcile?clientId=${client.id}`}
            className="btn-secondary text-sm"
          >
            GST recon
          </Link>
          <button onClick={handleDelete} className="btn-danger text-sm">
            Delete
          </button>
        </div>
      </div>

      {/* Invite URL */}
      {inviteUrl && (
        <div className="card border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-800 mb-2">
            ✅ Portal invite link generated — valid for 7 days
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input text-xs font-mono flex-1"
              value={inviteUrl}
              readOnly
            />
            <button
              className="btn-primary text-sm shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                alert("Link copied!");
              }}
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-green-600 mt-2">
            Send this link to your client via WhatsApp or SMS
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Documents",
            value: client._count?.documents ?? 0,
            icon: "📁",
            href: `/documents?clientId=${client.id}`,
          },
          {
            label: "Notices",
            value: client._count?.notices ?? 0,
            icon: "🤖",
            href: `/notices?clientId=${client.id}`,
          },
          {
            label: "Invoices",
            value: client._count?.invoices ?? 0,
            icon: "💰",
            href: `/billing?clientId=${client.id}`,
          },
        ].map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="card hover:shadow-md transition-shadow text-center"
          >
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Client details
          </h3>
          <dl className="space-y-3">
            {[
              ["GSTIN", client.gstin ?? "—"],
              ["Email", client.email ?? "—"],
              ["Phone", client.phone ?? "—"],
              ["WhatsApp", client.whatsapp_number ?? "—"],
              ["Portal", client.portal_enabled ? "Enabled" : "Disabled"],
              ["FY", client.financial_year],
              [
                "Added on",
                new Date(client.created_at).toLocaleDateString("en-IN"),
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-medium text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Services engaged
          </h3>
          {client.services_engaged.length === 0 ? (
            <p className="text-sm text-gray-400">No services added</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {client.services_engaged.map((s) => (
                <span key={s} className="badge-blue">
                  {s}
                </span>
              ))}
            </div>
          )}
          {client.address && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Address</p>
              <p className="text-sm text-gray-700">{client.address}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
