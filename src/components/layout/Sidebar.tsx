"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/clients", label: "Clients", icon: "👥" },
  { href: "/documents", label: "Documents", icon: "📁" },
  { href: "/notices", label: "Notice AI", icon: "🤖" },
  { href: "/gst", label: "GST Recon", icon: "🧾" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/billing", label: "Billing", icon: "💰" },
  { href: "/analytics", label: "Analytics", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar() {
  const path = usePathname();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="w-56 bg-[#0A1628] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <span className="text-[#F5A623] font-bold text-lg tracking-tight">
          CA Saathi
        </span>
        <p className="text-blue-300 text-xs mt-0.5">Practice Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white font-medium"
                  : "text-blue-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-4 py-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="w-full text-left text-blue-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
