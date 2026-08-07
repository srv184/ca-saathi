"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const NOTICE_TYPES = [
  { value: "SCRUTINY_143_2", label: "Scrutiny 143(2)" },
  { value: "DEFECTIVE_RETURN", label: "Defective Return" },
  { value: "DEMAND_156", label: "Demand Notice 156" },
  { value: "RECTIFICATION", label: "Rectification" },
  { value: "REFUND_QUERY", label: "Refund Query" },
  { value: "HIGH_VALUE_TXN", label: "High Value Transaction" },
  { value: "GST_ITC_MISMATCH", label: "GST ITC Mismatch" },
  { value: "GST_RETURN_DEFAULT", label: "GST Return Default" },
  { value: "GST_SCN", label: "GST Show Cause Notice" },
  { value: "TDS_DEFAULT", label: "TDS Default" },
  { value: "OTHER", label: "Other" },
];

interface Client {
  id: string;
  name: string;
}

interface UploadedNotice {
  storageKey: string;
  filename: string;
  fileSize: number;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getClientFileError(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) return "Only PDF, JPG, and PNG files are accepted.";
  if (file.size > MAX_FILE_SIZE) return "The notice must be 10 MB or smaller.";
  if (file.size === 0) return "The selected file is empty.";
  return null;
}

function NewNoticePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    clientId: searchParams.get("clientId") ?? "",
    portal: "INCOME_TAX",
    noticeType: "SCRUTINY_143_2",
    section: "",
    assessmentYear: "",
    referenceNumber: "",
    dueDate: "",
  });
  const [uploadedFile, setUploadedFile] = useState<UploadedNotice | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients?pageSize=200")
      .then((r) => r.json())
      .then((d) => setClients(d.data?.data ?? []));
  }, []);

  const f =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  function uploadFile(file: File) {
    return new Promise<UploadedNotice>((resolve, reject) => {
      const request = new XMLHttpRequest();
      const body = new FormData();
      body.append("clientId", form.clientId);
      body.append("file", file);
      request.open("POST", "/api/notices/upload");
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onerror = () => reject(new Error("Network error while uploading the notice."));
      request.onload = () => {
        let response: { data?: UploadedNotice; error?: string } = {};
        try {
          response = JSON.parse(request.responseText);
        } catch {
          reject(new Error("Unable to upload notice."));
          return;
        }
        if (request.status < 200 || request.status >= 300 || !response.data) {
          reject(new Error(response.error ?? "Unable to upload notice."));
          return;
        }
        resolve(response.data);
      };
      request.send(body);
    });
  }

  async function removeStoredFile(file: UploadedNotice) {
    const params = new URLSearchParams({ clientId: form.clientId, storageKey: file.storageKey });
    const response = await fetch(`/api/notices/upload?${params}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error ?? "Unable to remove the uploaded notice.");
    }
  }

  async function handleFile(file: File) {
    if (!form.clientId) {
      setError("Select a client before uploading the notice.");
      return;
    }
    const validationError = getClientFileError(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setUploading(true);
    setUploadProgress(0);
    const previousFile = uploadedFile;
    try {
      const uploaded = await uploadFile(file);
      setUploadedFile(uploaded);
      if (previousFile) {
        try {
          await removeStoredFile(previousFile);
        } catch {
          // The replacement is valid; a failed cleanup should not block drafting.
        }
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload notice.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!uploadedFile) return;
    setUploading(true);
    setError("");
    try {
      await removeStoredFile(uploadedFile);
      setUploadedFile(null);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove the notice.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      setError("Please select a client.");
      return;
    }
    if (!uploadedFile) {
      setError("Upload the notice document before generating a reply.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          r2Key: uploadedFile.storageKey,
          filename: uploadedFile.filename,
          fileSize: uploadedFile.fileSize,
          contentType: uploadedFile.mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create notice");
        return;
      }
      router.push(`/notices/${data.data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Upload notice</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI will read the notice and draft a legal reply</p>
        </div>
        <Link href="/notices" className="btn-secondary">Cancel</Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

        <div>
          <label className="label">Client *</label>
          <select className="input" required value={form.clientId} onChange={f("clientId")} disabled={Boolean(uploadedFile) || uploading}>
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {uploadedFile && <p className="text-xs text-gray-500 mt-1">Remove the uploaded notice before changing the client.</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Portal *</label><select className="input" value={form.portal} onChange={f("portal")}>{["INCOME_TAX", "GST", "TRACES", "MCA"].map((p) => <option key={p} value={p}>{p.replace("_", " ")}</option>)}</select></div>
          <div><label className="label">Notice type *</label><select className="input" value={form.noticeType} onChange={f("noticeType")}>{NOTICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div><label className="label">Section</label><input className="input" value={form.section} onChange={f("section")} placeholder="e.g. 143(2)" /></div>
          <div><label className="label">Assessment year</label><input className="input" value={form.assessmentYear} onChange={f("assessmentYear")} placeholder="e.g. AY 2023-24" /></div>
          <div><label className="label">Reference / DIN number</label><input className="input" value={form.referenceNumber} onChange={f("referenceNumber")} placeholder="Notice reference" /></div>
          <div><label className="label">Response due date</label><input className="input" type="date" value={form.dueDate} onChange={f("dueDate")} /></div>
        </div>

        <div>
          <label className="label">Notice document *</label>
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file); }} />
          {uploadedFile ? (
            <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">📄</span>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium text-blue-900 truncate">{uploadedFile.filename}</p><p className="text-xs text-blue-700 mt-0.5">{formatFileSize(uploadedFile.fileSize)} · Uploaded</p></div>
              <button type="button" className="text-sm text-blue-700 hover:text-blue-900 disabled:text-gray-400" disabled={uploading} onClick={() => fileInputRef.current?.click()}>Replace</button>
              <button type="button" className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400" disabled={uploading} onClick={() => void handleRemove()}>Remove</button>
            </div>
          ) : (
            <div onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }} onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) void handleFile(file); }} className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
              <p className="text-sm font-medium text-gray-700">Drag and drop the notice here</p>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG · Maximum 10 MB</p>
              <button type="button" className="btn-secondary text-sm mt-3" disabled={uploading} onClick={() => fileInputRef.current?.click()}>Choose file</button>
            </div>
          )}
          {uploading && <div className="mt-2"><div className="h-2 rounded bg-gray-100 overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.max(uploadProgress, 5)}%` }} /></div><p className="text-xs text-gray-500 mt-1">Uploading notice{uploadProgress ? ` (${uploadProgress}%)` : "…"}</p></div>}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700"><strong>How it works:</strong> Upload the notice, then AI extracts its text and drafts a complete legal reply. You review and edit the draft before downloading.</div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={saving || uploading || !form.clientId || !uploadedFile}>{saving ? "Generating reply…" : "Generate AI reply"}</button>
          <Link href="/notices" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

export default function NewNoticePage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><NewNoticePageInner /></Suspense>;
}
