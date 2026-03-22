"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ENTITY_TYPES = [
  "INDIVIDUAL",
  "PROPRIETORSHIP",
  "PARTNERSHIP",
  "LLP",
  "PRIVATE_LIMITED",
  "PUBLIC_LIMITED",
  "TRUST",
  "HUF",
];

const SERVICES = ["ITR", "GST", "TDS", "ROC", "AUDIT", "BOOKKEEPING"];

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    pan: "",
    gstin: "",
    entityType: "INDIVIDUAL",
    email: "",
    phone: "",
    whatsappNumber: "",
    address: "",
    portalEnabled: false,
    servicesEngaged: [] as string[],
    financialYear: "2024-25",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const f =
    (key: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  function toggleService(s: string) {
    setForm((p) => ({
      ...p,
      servicesEngaged: p.servicesEngaged.includes(s)
        ? p.servicesEngaged.filter((x) => x !== s)
        : [...p.servicesEngaged, s],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add client");
        return;
      }
      router.push(`/clients/${data.data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Add new client
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Fill in the client details below
          </p>
        </div>
        <Link href="/clients" className="btn-secondary">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div className="col-span-2">
            <label className="label">Full name / Company name *</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={f("name")}
              placeholder="Ramesh Kumar or Sharma Enterprises"
            />
          </div>

          {/* Entity type */}
          <div>
            <label className="label">Entity type *</label>
            <select
              className="input"
              value={form.entityType}
              onChange={f("entityType")}
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Financial year */}
          <div>
            <label className="label">Financial year</label>
            <select
              className="input"
              value={form.financialYear}
              onChange={f("financialYear")}
            >
              {["2024-25", "2023-24", "2022-23"].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* PAN */}
          <div>
            <label className="label">PAN</label>
            <input
              className="input font-mono uppercase"
              value={form.pan}
              onChange={f("pan")}
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          </div>

          {/* GSTIN */}
          <div>
            <label className="label">GSTIN</label>
            <input
              className="input font-mono uppercase"
              value={form.gstin}
              onChange={f("gstin")}
              placeholder="29ABCDE1234F1Z5"
              maxLength={15}
            />
          </div>

          {/* Email */}
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={f("email")}
              placeholder="client@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={form.phone}
              onChange={f("phone")}
              placeholder="9876543210"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="label">WhatsApp number</label>
            <input
              className="input"
              value={form.whatsappNumber}
              onChange={f("whatsappNumber")}
              placeholder="9876543210"
            />
          </div>

          {/* Portal */}
          <div>
            <label className="label">Client portal</label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                id="portal"
                checked={form.portalEnabled}
                onChange={(e) =>
                  setForm((p) => ({ ...p, portalEnabled: e.target.checked }))
                }
                className="w-4 h-4 rounded text-blue-600"
              />
              <label htmlFor="portal" className="text-sm text-gray-700">
                Enable client portal
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Recommended for corporate clients
            </p>
          </div>

          {/* Services */}
          <div className="col-span-2">
            <label className="label">Services engaged</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.servicesEngaged.includes(s)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
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

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Add client"}
          </button>
          <Link href="/clients" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
