"use client";
import { usePathname } from "next/navigation";

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

export default function TopBar() {
  const path = usePathname();
  const title =
    Object.entries(TITLES).find(
      ([k]) => path === k || path.startsWith(k + "/"),
    )?.[1] ?? "CA Saathi";

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    </header>
  );
}
