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
  { href: "/billing/invoices", label: "Billing", icon: "💰" },
  { href: "/analytics", label: "Analytics", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const path = usePathname();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      {open && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-40 bg-black/40 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[#0A1628] shadow-xl transition-transform md:static md:w-56 md:max-w-none md:translate-x-0 md:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}>
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
              onClick={onClose}
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
      <div className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="w-full text-left text-blue-300 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          Sign out
        </button>
      </div>
      </aside>
    </>
  );
}
