"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PortalData {
  client: {
    id: string;
    name: string;
    entity_type: string;
    services_engaged: string[];
  };
  firm: {
    name: string;
    email: string;
    phone?: string;
    logo_url?: string;
  };
  pendingRequests: {
    id: string;
    document_type: string;
    description?: string;
    due_date?: string;
  }[];
  recentDocuments: {
    id: string;
    name: string;
    doc_type: string;
    created_at: string;
  }[];
  unpaidInvoices: {
    id: string;
    invoice_number: string;
    total_amount: number;
    due_date: string;
  }[];
}

export default function PortalDashboardPage({
  params,
}: {
  params: { clientId: string };
}) {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [locked, setLocked] = useState(true);
  const [error, setError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    // Check device trust
    const deviceToken = localStorage.getItem("portal_device_token");
    const storedClientId = localStorage.getItem("portal_client_id");

    if (deviceToken && storedClientId === params.clientId) {
      // Device is trusted — skip PIN
      setLocked(false);
      loadData();
    } else {
      setLoading(false);
    }
  }, [params.clientId]);

  async function loadData() {
    try {
      const res = await fetch("/api/portal/me", {
        headers: { "x-portal-client-id": params.clientId },
      });
      const data = await res.json();
      if (data.data) setData(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    setError("");
    try {
      const res = await fetch("/api/portal/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, clientId: params.clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Wrong PIN");
        setPin("");
        return;
      }
      localStorage.setItem("portal_device_token", data.data.deviceToken);
      localStorage.setItem("portal_client_id", params.clientId);
      setLocked(false);
      await loadData();
    } catch {
      setError("Network error");
    } finally {
      setUnlocking(false);
    }
  }

  function NumberPad({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
    return (
      <div className="grid grid-cols-3 gap-3 mt-4">
        {keys.map((key, i) => (
          <button
            key={i}
            type="button"
            disabled={key === ""}
            onClick={() => {
              if (key === "⌫") onChange(value.slice(0, -1));
              else if (key !== "" && value.length < 6) onChange(value + key);
            }}
            className={`h-14 rounded-xl text-lg font-medium transition-colors ${
              key === ""
                ? "invisible"
                : key === "⌫"
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-gray-50 text-gray-900 hover:bg-blue-50 active:bg-blue-100"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    );
  }

  // PIN screen
  if (locked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">CA Saathi</h1>
            <p className="text-blue-300 text-sm mt-1">
              Enter your PIN to continue
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <form onSubmit={handleUnlock}>
              <div className="text-center">
                <p className="text-2xl mb-2">🔐</p>
                <h2 className="text-lg font-semibold text-gray-900">
                  Enter PIN
                </h2>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mt-3">
                  {error}
                </div>
              )}
              <div className="flex gap-3 justify-center my-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      i < pin.length
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300"
                    }`}
                  />
                ))}
              </div>
              <NumberPad value={pin} onChange={setPin} />
              {pin.length === 6 && (
                <button
                  type="submit"
                  className="btn-primary w-full mt-4"
                  disabled={unlocking}
                >
                  {unlocking ? "Verifying…" : "Unlock"}
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center pt-20">
        <p className="text-gray-500">Failed to load portal data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0A1628] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-300">{data.firm.name}</p>
            <h1 className="text-lg font-semibold">{data.client.name}</h1>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("portal_device_token");
              localStorage.removeItem("portal_client_id");
              setLocked(true);
              setPin("");
            }}
            className="text-blue-300 text-xs hover:text-white"
          >
            Lock
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Pending requests */}
        {data.pendingRequests.length > 0 && (
          <div className="card">
            <h3 className="text-base font-medium text-gray-900 mb-3">
              📋 Documents needed from you ({data.pendingRequests.length})
            </h3>
            <div className="space-y-2">
              {data.pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {req.document_type.replace(/_/g, " ")}
                    </p>
                    {req.description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {req.description}
                      </p>
                    )}
                    {req.due_date && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Due:{" "}
                        {new Date(req.due_date).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      router.push(
                        `/portal/upload/${params.clientId}?requestId=${req.id}`,
                      )
                    }
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    Upload
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={() => router.push(`/portal/upload/${params.clientId}`)}
          className="w-full bg-blue-600 text-white py-4 rounded-xl text-base font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          📤 Upload a document
        </button>

        {/* Recent documents */}
        {data.recentDocuments.length > 0 && (
          <div className="card">
            <h3 className="text-base font-medium text-gray-900 mb-3">
              📁 Recently uploaded
            </h3>
            <div className="space-y-2">
              {data.recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                >
                  <span className="text-lg">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span className="badge-green text-xs">Received</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unpaid invoices */}
        {data.unpaidInvoices.length > 0 && (
          <div className="card">
            <h3 className="text-base font-medium text-gray-900 mb-3">
              💰 Pending payments
            </h3>
            <div className="space-y-2">
              {data.unpaidInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {inv.invoice_number}
                    </p>
                    <p className="text-xs text-gray-500">
                      Due: {new Date(inv.due_date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-red-700">
                    ₹{inv.total_amount.toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {data.pendingRequests.length === 0 &&
          data.recentDocuments.length === 0 &&
          data.unpaidInvoices.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-medium text-gray-900">All up to date!</p>
              <p className="text-sm text-gray-500 mt-1">
                No pending documents or payments
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
