"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Overview", href: "/admin", icon: "⌂" },
  { label: "Customers", href: "/admin/customers", icon: "◎" },
  { label: "Funding", href: "/admin/funding", icon: "₦" },
  { label: "Analytics", href: "/admin/analytics", icon: "↗" },
  { label: "Catalog", href: "/admin/catalog", icon: "▦" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="rounded-[22px] border border-black/[0.06] bg-white/90 p-2 shadow-[0_10px_35px_rgba(16,35,26,0.05)] backdrop-blur-xl">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {items.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-fit items-center gap-2 rounded-[16px] px-3.5 py-2.5 text-xs font-bold transition ${
                  active
                    ? "bg-[#062d1d] text-white shadow-[0_6px_18px_rgba(6,45,29,0.18)]"
                    : "text-slate-500 hover:bg-[#f3f7f5] hover:text-[#10231a]"
                }`}
              >
                <span className={active ? "text-emerald-300" : "text-slate-400"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}

          <div className="ml-auto hidden pl-2 sm:block">
            <Link
              href="/dashboard"
              className="flex min-w-fit items-center gap-2 rounded-[16px] px-3.5 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-[#f3f7f5] hover:text-[#087443]"
            >
              ← Marketplace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
