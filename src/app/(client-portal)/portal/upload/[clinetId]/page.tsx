"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DOC_TYPES = [
  { value: "FORM_16", label: "Form 16" },
  { value: "BANK_STATEMENT", label: "Bank Statement" },
  { value: "PAN_CARD", label: "PAN Card" },
  { value: "AADHAAR", label: "Aadhaar" },
  { value: "ITR_COPY", label: "ITR Copy" },
  { value: "GSTR_2B", label: "GSTR-2B" },
  { value: "BALANCE_SHEET", label: "Balance Sheet" },
  { value: "TDS_CERTIFICATE", label: "TDS Certificate" },
  { value: "OTHER", label: "Other" },
];

export default function PortalUploadPage({
  params,
}: {
  params: { clientId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");

  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("OTHER");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function sha256(fileToHash: File): Promise<string> {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await fileToHash.arrayBuffer(),
    );
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Step 1: Get upload URL
      const urlRes = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: params.clientId,
          filename: file.name,
          contentType: file.type,
          docType,
        }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) {
        setError(urlData.error ?? "Failed to get upload URL");
        return;
      }

      // Step 2: Upload directly to storage
      const storageRes = await fetch(urlData.data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!storageRes.ok) {
        setError("Failed to upload file");
        return;
      }

      // Step 3: Confirm upload
      const confirmRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: params.clientId,
          r2Key: urlData.data.storageKey,
          filename: file.name,
          fileSize: file.size,
          contentType: file.type,
          docType,
          fileHash: await sha256(file),
        }),
      });

      if (!confirmRes.ok) {
        const d = await confirmRes.json();
        setError(d.error ?? "Upload failed");
        return;
      }

      setDone(true);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <p className="text-5xl mb-4">✅</p>
          <h2 className="text-xl font-semibold text-gray-900">
            Document uploaded!
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            Your CA has been notified. Thank you!
          </p>
          <button
            onClick={() => router.push(`/portal/dashboard/${params.clientId}`)}
            className="btn-primary w-full mt-6"
          >
            Back to portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="bg-[#0A1628] text-white px-4 py-4">
        <button
          onClick={() => router.back()}
          className="text-blue-300 text-sm hover:text-white mb-1"
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold">Upload document</h1>
      </div>

      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <form onSubmit={handleUpload} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Document type */}
          <div className="card">
            <label className="label">Document type</label>
            <select
              className="input"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* File picker */}
          <div className="card">
            <label className="label">Select file</label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                file
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <input
                type="file"
                id="file-input"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="file-input" className="cursor-pointer">
                {file ? (
                  <div>
                    <p className="text-blue-700 font-medium">📄 {file.name}</p>
                    <p className="text-xs text-blue-500 mt-1">
                      {(file.size / 1024).toFixed(0)} KB · Tap to change
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2">📎</p>
                    <p className="text-gray-600 font-medium">
                      Tap to select file
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, Image, Excel or CSV
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-4 text-base"
            disabled={uploading || !file}
          >
            {uploading ? "Uploading…" : "📤 Upload document"}
          </button>
        </form>
      </div>
    </div>
  );
}
