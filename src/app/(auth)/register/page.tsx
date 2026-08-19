"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firmName: "",
    email: "",
    password: "",
    icaiNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const f =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Create your account
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Start your 30-day free trial. No card needed.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="label">CA Firm name</label>
        <input
          className="input"
          required
          placeholder="Sharma & Associates"
          value={form.firmName}
          onChange={f("firmName")}
        />
      </div>

      <div>
        <label className="label">Email address</label>
        <input
          className="input"
          type="email"
          required
          placeholder="ca@example.com"
          value={form.email}
          onChange={f("email")}
        />
      </div>

      <div>
        <label className="label">
          Password{" "}
          <span className="text-gray-400 font-normal">(min 8 characters)</span>
        </label>
        <input
          className="input"
          type="password"
          required
          minLength={8}
          placeholder="••••••••"
          value={form.password}
          onChange={f("password")}
        />
      </div>

      <div>
        <label className="label">
          ICAI membership number{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          className="input"
          placeholder="e.g. 123456"
          value={form.icaiNumber}
          onChange={f("icaiNumber")}
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Creating account..." : "Create account — free for 30 days"}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-gray-400">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="inline-flex min-h-11 items-center underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="inline-flex min-h-11 items-center underline">
          Privacy Policy
        </Link>
      </p>
    </form>
  );
}
