"use client";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        setLoading(false);
        return;
      }
      // Use window.location for hard redirect instead of router.push
      window.location.href = "/dashboard";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
        <p className="text-gray-500 text-sm mt-1">
          Sign in to your CA Saathi account
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="label">Email address</label>
        <input
          className="input"
          type="email"
          required
          placeholder="ca@example.com"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />
      </div>

      <div>
        <label className="label">Password</label>
        <input
          className="input"
          type="password"
          required
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-gray-500">
        New to CA Saathi?{" "}
        <Link href="/register" className="inline-flex min-h-11 items-center text-blue-600 hover:underline">
          Create account
        </Link>
      </p>
    </form>
  );
}
