"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  name: string;
  entity_type: string;
  gstin?: string;
  email?: string;
  phone?: string;
  status: string;
  portal_enabled: boolean;
  services_engaged: string[];
  assigned_ca?: { name: string };
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadClients();
  }, [search]);

  async function loadClients() {
    setLoading(true);
    try {
      const q = search ? `&search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/clients?pageSize=50${q}`);
      const data = await res.json();
      setClients(data.data?.data ?? []);
      setTotal(data.data?.total ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const entityColor: Record<string, string> = {
    INDIVIDUAL: "badge-blue",
    PROPRIETORSHIP: "badge-blue",
    PARTNERSHIP: "badge-purple",
    LLP: "badge-purple",
    PRIVATE_LIMITED: "badge-amber",
    PUBLIC_LIMITED: "badge-amber",
    TRUST: "badge-gray",
    HUF: "badge-gray",
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total clients</p>
        </div>
        <Link href="/clients/new" className="btn-primary w-full sm:w-auto">
          + Add client
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search by name, email or GSTIN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
      ) : clients.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">👥</p>
          <h3 className="text-base font-medium text-gray-900">
            No clients yet
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Add your first client to get started
          </p>
          <Link href="/clients/new" className="btn-primary mt-4 inline-block">
            Add client
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Name", "Type", "GSTIN", "Email", "Portal", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="border-b border-gray-50 last:border-0 hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {client.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        entityColor[client.entity_type] ?? "badge-gray"
                      }
                    >
                      {client.entity_type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {client.gstin ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {client.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        client.portal_enabled ? "badge-green" : "badge-gray"
                      }
                    >
                      {client.portal_enabled ? "On" : "Off"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        client.status === "ACTIVE"
                          ? "badge-green"
                          : "badge-gray"
                      }
                    >
                      {client.status}
                    </span>
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
