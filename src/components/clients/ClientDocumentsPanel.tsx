"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type ClientDocument = {
  id: string;
  original_filename: string;
  document_type: string;
  document_period?: string | null;
  extracted_document_date?: string | null;
  extraction_status: "PENDING" | "PROCESSING" | "DONE" | "FAILED" | "NEEDS_REVIEW";
  extraction_confidence?: number | null;
  extraction_failure_reason?: string | null;
  is_latest_version: boolean;
  uploaded_at: string;
};

type BatchItem = { filename: string; state: string; error?: string };

const TYPE_LABELS: Record<string, string> = {
  GST_RETURN: "GST Return", INVOICE: "Invoice", BANK_STATEMENT: "Bank Statement",
  FORM_16: "Form 16", FORM_26AS: "Form 26AS", ITR_ACKNOWLEDGMENT: "ITR Acknowledgment",
  TDS_CERTIFICATE: "TDS Certificate", NOTICE: "Notice", LEDGER: "Ledger", PAN_CARD: "PAN Card",
  AADHAR_CARD: "Aadhaar Card", BALANCE_SHEET: "Balance Sheet",
  PROFIT_LOSS_STATEMENT: "Profit & Loss Statement", AUDIT_REPORT: "Audit Report", OTHER: "Other",
};

const STATUS_CLASS: Record<ClientDocument["extraction_status"], string> = {
  PENDING: "badge-gray", PROCESSING: "badge-blue", DONE: "badge-green",
  NEEDS_REVIEW: "badge-yellow", FAILED: "badge-red",
};

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function ClientDocumentsPanel({ clientId }: { clientId: string }) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadDocuments() {
    const response = await fetch(`/api/client-documents?clientId=${clientId}`);
    const body = await response.json();
    if (response.ok) setDocuments(body.data.documents ?? []);
  }

  useEffect(() => { void loadDocuments(); }, [clientId]);
  useEffect(() => {
    if (!documents.some((document) => document.extraction_status === "PENDING" || document.extraction_status === "PROCESSING")) return;
    const timer = window.setInterval(() => void loadDocuments(), 3000);
    return () => window.clearInterval(timer);
  }, [documents]);

  const grouped = useMemo(() => documents.reduce<Record<string, ClientDocument[]>>((groups, document) => {
    (groups[document.document_type] ??= []).push(document);
    return groups;
  }, {}), [documents]);

  function onFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
    setError("");
  }

  async function upload() {
    if (!files.length) return;
    setUploading(true);
    setError("");
    setBatch(files.map((file) => ({ filename: file.name, state: "Hashing" })));
    try {
      const fileDetails = await Promise.all(files.map(async (file) => ({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
        fileHash: await sha256(file),
      })));
      const preparedResponse = await fetch("/api/client-documents/upload-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, files: fileDetails }),
      });
      const prepared = await preparedResponse.json();
      if (!preparedResponse.ok) throw new Error(prepared.error ?? "Unable to prepare upload");

      const accepted = prepared.data.accepted as { documentId: string; filename: string; fileHash: string; uploadUrl: string }[];
      const duplicateNames = new Set((prepared.data.duplicates as { filename: string }[]).map((item) => item.filename));
      const byHash = new Map(fileDetails.map((details, index) => [details.fileHash, files[index]]));
      const uploadedIds: string[] = [];
      await Promise.all(accepted.map(async (item) => {
        const file = byHash.get(item.fileHash);
        if (!file) return;
        setBatch((current) => current.map((row) => row.filename === item.filename ? { ...row, state: "Uploading" } : row));
        const response = await fetch(item.uploadUrl, {
          method: "PUT", body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!response.ok) throw new Error(`${item.filename} could not be stored`);
        uploadedIds.push(item.documentId);
        setBatch((current) => current.map((row) => row.filename === item.filename ? { ...row, state: "Pending classification" } : row));
      }));
      setBatch((current) => current.map((row) => duplicateNames.has(row.filename) ? { ...row, state: "Duplicate skipped" } : row));

      if (uploadedIds.length) {
        const queuedResponse = await fetch("/api/client-documents/confirm", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentIds: uploadedIds }),
        });
        const queued = await queuedResponse.json();
        if (!queuedResponse.ok) throw new Error(queued.error ?? "Files stored but queueing failed");
      }
      setFiles([]);
      await loadDocuments();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function retry(documentId: string) {
    const response = await fetch(`/api/client-documents/${documentId}/retry`, { method: "POST" });
    if (response.ok) await loadDocuments();
  }

  return <section className="card">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h3 className="text-base font-medium text-gray-900">Client documents</h3><p className="text-sm text-gray-500">AI classifies documents and retains every version.</p></div>
      <button className="btn-primary text-sm" onClick={() => setIsOpen(true)}>Upload Documents</button>
    </div>

    {isOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Upload documents</h2><p className="mt-1 text-sm text-gray-500">Select up to 25 files (25 MB each). Files are classified in the background.</p></div><button onClick={() => setIsOpen(false)} aria-label="Close">×</button></div>
        <input className="input mt-5" type="file" multiple onChange={onFilesSelected} />
        {files.length > 0 && <p className="mt-2 text-sm text-gray-600">{files.length} file{files.length === 1 ? "" : "s"} selected</p>}
        {batch.length > 0 && <ul className="mt-4 max-h-40 space-y-1 overflow-auto text-sm">{batch.map((item) => <li key={item.filename} className="flex justify-between gap-3"><span className="truncate">{item.filename}</span><span className="shrink-0 text-gray-500">{item.state}</span></li>)}</ul>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><button className="btn-secondary text-sm" disabled={uploading} onClick={() => setIsOpen(false)}>Close</button><button className="btn-primary text-sm" disabled={!files.length || uploading} onClick={() => void upload()}>{uploading ? "Uploading…" : "Upload"}</button></div>
      </div>
    </div>}

    <div className="mt-5 space-y-3">
      {Object.keys(grouped).length === 0 ? <p className="text-sm text-gray-500">No client documents uploaded yet.</p> : Object.entries(grouped).map(([type, entries]) => {
        const latest = entries.find((document) => document.is_latest_version);
        const older = entries.filter((document) => document.id !== latest?.id);
        return <details key={type} className="rounded-lg border border-gray-100 p-3" open={entries.some((document) => document.extraction_status !== "DONE")}>
          <summary className="cursor-pointer font-medium text-gray-800">{TYPE_LABELS[type] ?? type} <span className="ml-1 text-sm font-normal text-gray-500">({entries.length})</span></summary>
          <div className="mt-3 space-y-2">{[...(latest ? [latest] : []), ...older].map((document) => <div key={document.id} className="flex flex-col gap-2 rounded-md bg-gray-50 p-2 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800">{document.original_filename} {document.is_latest_version && <span className="badge-green ml-1">Latest</span>}</p><p className="text-xs text-gray-500">{document.document_period ?? "Period pending review"}{document.extracted_document_date ? ` · ${new Date(document.extracted_document_date).toLocaleDateString("en-IN")}` : ""}</p>{document.extraction_failure_reason && <p className="text-xs text-red-600">{document.extraction_failure_reason}</p>}</div><div className="flex items-center gap-2"><span className={STATUS_CLASS[document.extraction_status]}>{document.extraction_status.replace(/_/g, " ")}</span>{document.extraction_status === "FAILED" && <button className="btn-secondary text-xs" onClick={() => void retry(document.id)}>Retry</button>}</div></div>)}</div>
        </details>;
      })}
    </div>
  </section>;
}
