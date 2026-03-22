"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Document {
  id: string;
  name: string;
  doc_type: string;
  source: string;
  file_size?: number;
  ai_extracted: boolean;
  created_at: string;
  client?: { name: string };
}

const DOC_TYPE_LABELS: Record<string, string> = {
  FORM_16: "Form 16",
  FORM_16A: "Form 16A",
  BANK_STATEMENT: "Bank Statement",
  GSTR_2B: "GSTR-2B",
  GSTR_1: "GSTR-1",
  PURCHASE_REGISTER: "Purchase Register",
  BALANCE_SHEET: "Balance Sheet",
  PL_STATEMENT: "P&L Statement",
  ITR_COPY: "ITR Copy",
  PAN_CARD: "PAN Card",
  AADHAAR: "Aadhaar",
  IT_NOTICE: "IT Notice",
  GST_NOTICE: "GST Notice",
  TDS_CERTIFICATE: "TDS Certificate",
  INVOICE: "Invoice",
  OTHER: "Other",
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    loadDocs();
  }, [search, clientId]);

  async function loadDocs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (clientId) params.set("clientId", clientId);
      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      let docs = data.data?.data ?? [];
      if (search) {
        docs = docs.filter(
          (d: Document) =>
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.client?.name.toLowerCase().includes(search.toLowerCase()),
        );
      }
      setDocs(docs);
      setTotal(data.data?.total ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} total documents
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search by filename or client name…"
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
      ) : docs.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📁</p>
          <h3 className="text-base font-medium text-gray-900">
            No documents yet
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload documents from a client profile
          </p>
          <Link href="/clients" className="btn-primary mt-4 inline-block">
            Go to clients
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  "File name",
                  "Client",
                  "Type",
                  "Size",
                  "Source",
                  "AI",
                  "Date",
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
              {docs.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-blue-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 truncate max-w-xs block">
                      {doc.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {doc.client?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-blue">
                      {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-gray">{doc.source}</span>
                  </td>
                  <td className="px-4 py-3">
                    {doc.ai_extracted ? (
                      <span className="badge-green">AI read</span>
                    ) : (
                      <span className="badge-gray">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(doc.created_at).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
