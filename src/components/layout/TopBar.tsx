"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clients": "Clients",
  "/documents": "Documents",
  "/notices": "Notice AI",
  "/gst": "GST Reconciliation",
  "/calendar": "Compliance Calendar",
  "/billing": "Billing",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

interface UserInfo {
  name: string;
  role: string;
  firmName: string;
}

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const path = usePathname();
  const title =
    Object.entries(TITLES).find(
      ([k]) => path === k || path.startsWith(k + "/"),
    )?.[1] ?? "CA Saathi";

  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setUser({
            name: d.data.user.name,
            role: d.data.user.role,
            firmName: d.data.firm.name,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="min-h-14 bg-white border-b border-gray-100 flex items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6 shrink-0">
      <div className="flex min-w-0 items-center gap-2">
        <button aria-label="Open navigation" onClick={onMenuClick} className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-gray-700 hover:bg-gray-100 md:hidden">☰</button>
        <h1 className="truncate text-base font-semibold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-400 hidden md:block">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        {user && (
          <Link
            href="/settings"
            className="flex min-h-11 min-w-11 items-center gap-2 rounded-lg hover:opacity-80"
          >
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user.name[0]}
            </div>
            <div className="hidden md:block text-right">
              <p className="text-xs font-medium text-gray-900 leading-tight">
                {user.name}
              </p>
              <p className="text-xs text-gray-400 leading-tight">
                {user.role.replace("_", " ")}
              </p>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
