"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DashboardData = {
  admin: {
    email: string;
    fullName: string | null;
    role: string;
  };
  stats: {
    customers: { total: number; active: number };
    suppliers: { total: number; active: number };
    products: { total: number; active: number };
    options: { total: number; available: number };
    orders: { total: number; active: number; completed: number };
    payments: {
      total: number;
      successful: number;
      pending: number;
      pendingAmountMinor: string;
    };
    walletCreditsMinor: string;
  };
};

function formatMoney(minor: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(minor) / 100);
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setError("");

      const response = await fetch("/api/admin/dashboard", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (response.status === 403) {
        setError("You do not have permission to access the admin dashboard.");
        return;
      }

      if (!response.ok) {
        throw new Error("Dashboard request failed.");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Dashboard request failed.");
      }

      setData({
        admin: result.admin,
        stats: result.stats,
      });
    } catch {
      setError("Unable to load dashboard data right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = data?.stats;

  return (
    <main className="min-h-screen bg-[#f3f7f5] text-[#10231a]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[30px] bg-[#062d1d] shadow-[0_24px_70px_rgba(6,45,29,0.20)]">
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                  NumberHub administration
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                  Admin overview
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                  Monitor customers, orders, payments and marketplace
                  operations from one workspace.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                  Signed in as
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {data?.admin?.fullName || data?.admin?.email || "Admin"}
                </p>
                <p className="mt-0.5 text-xs text-emerald-300">
                  {data?.admin?.role || "ADMIN"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link
            href="/admin/customers"
            className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)] transition hover:-translate-y-0.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Customers
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#10231a]">
              {loading ? "—" : stats?.customers.total ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {loading ? "Loading..." : `${stats?.customers.active ?? 0} active`}
            </p>
          </Link>

          <Link
            href="/admin/catalog"
            className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)] transition hover:-translate-y-0.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Catalog
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#10231a]">
              {loading ? "—" : stats?.options.available ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {loading
                ? "Loading..."
                : `of ${stats?.options.total ?? 0} options available`}
            </p>
          </Link>

          <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Orders
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#10231a]">
              {loading ? "—" : stats?.orders.total ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {loading
                ? "Loading..."
                : `${stats?.orders.active ?? 0} active · ${stats?.orders.completed ?? 0} completed`}
            </p>
          </div>

          <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Payments
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#10231a]">
              {loading ? "—" : stats?.payments.successful ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {loading
                ? "Loading..."
                : `${stats?.payments.pending ?? 0} pending`}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-[26px] border border-black/[0.06] bg-white p-6 shadow-[0_10px_35px_rgba(16,35,26,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Operations
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  Active suppliers
                </span>
                <span className="font-bold text-[#10231a]">
                  {loading ? "—" : stats?.suppliers.active ?? 0}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  Active products
                </span>
                <span className="font-bold text-[#10231a]">
                  {loading ? "—" : stats?.products.active ?? 0}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  Available options
                </span>
                <span className="font-bold text-emerald-700">
                  {loading ? "—" : stats?.options.available ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-black/[0.06] bg-white p-6 shadow-[0_10px_35px_rgba(16,35,26,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Pending payments
            </p>

            <p className="mt-4 text-3xl font-bold tracking-tight text-[#10231a]">
              {loading
                ? "—"
                : formatMoney(stats?.payments.pendingAmountMinor || "0")}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Across {loading ? "—" : stats?.payments.pending ?? 0} pending
              payment record
              {(stats?.payments.pending ?? 0) === 1 ? "" : "s"}.
            </p>

            <Link
              href="/admin/funding"
              className="mt-5 inline-flex rounded-xl bg-[#062d1d] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#08432b]"
            >
              Open funding
            </Link>
          </div>

          <div className="rounded-[26px] border border-black/[0.06] bg-white p-6 shadow-[0_10px_35px_rgba(16,35,26,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Wallet credits
            </p>

            <p className="mt-4 text-3xl font-bold tracking-tight text-[#10231a]">
              {loading
                ? "—"
                : formatMoney(stats?.walletCreditsMinor || "0")}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Deposits and refunds recorded in wallet transactions.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[26px] border border-black/[0.06] bg-white p-6 shadow-[0_10px_35px_rgba(16,35,26,0.05)]">
          <div>
            <p className="text-sm font-bold text-[#10231a]">
              Administration
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Quickly access the main NumberHub management areas.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/admin/customers"
              className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-[#f7fbf9]"
            >
              <p className="font-bold text-[#10231a]">Customers</p>
              <p className="mt-1 text-xs text-slate-500">
                Manage customer accounts.
              </p>
            </Link>

            <Link
              href="/admin/funding"
              className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-[#f7fbf9]"
            >
              <p className="font-bold text-[#10231a]">Funding</p>
              <p className="mt-1 text-xs text-slate-500">
                Review wallet funding activity.
              </p>
            </Link>

            <Link
              href="/admin/analytics"
              className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-[#f7fbf9]"
            >
              <p className="font-bold text-[#10231a]">Analytics</p>
              <p className="mt-1 text-xs text-slate-500">
                View real website analytics.
              </p>
            </Link>

            <Link
              href="/admin/catalog"
              className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-[#f7fbf9]"
            >
              <p className="font-bold text-[#10231a]">Catalog</p>
              <p className="mt-1 text-xs text-slate-500">
                Manage live marketplace options.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
