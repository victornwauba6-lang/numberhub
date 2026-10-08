"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  createdAt: string;
  role: string;
  balanceMinor: string;
  orderCount: number;
};

function formatMoney(minor: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(minor) / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function initials(name: string | null, email: string) {
  const source = (name || email).trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCustomers(value = "") {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/customers?search=${encodeURIComponent(value)}&limit=100`,
        { cache: "no-store" }
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (response.status === 403) {
        setError("You do not have permission to access customer management.");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load customers.");
      }

      const data = await response.json();
      setCustomers(data.customers || []);
    } catch {
      setError("Unable to load customers right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers(search);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const activeCount = useMemo(
    () => customers.filter((customer) => customer.isActive).length,
    [customers]
  );

  const totalWallet = useMemo(
    () =>
      customers.reduce(
        (total, customer) => total + Number(customer.balanceMinor),
        0
      ),
    [customers]
  );

  const totalOrders = useMemo(
    () =>
      customers.reduce(
        (total, customer) => total + Number(customer.orderCount),
        0
      ),
    [customers]
  );

  return (
    <main className="min-h-screen bg-[#f3f7f5] text-[#10231a]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        {/* Premium header */}
        <header className="relative overflow-hidden rounded-[30px] bg-[#062d1d] shadow-[0_24px_70px_rgba(6,45,29,0.20)]">
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative p-5 sm:p-7 lg:p-9">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10"
              >
                <span>←</span>
                Dashboard
              </Link>

              <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                Admin workspace
              </div>
            </div>

            <div className="mt-8 max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                Customer management
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                Customers
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                A secure overview of your NumberHub customer accounts,
                wallet activity and order history.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                  Customers
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {customers.length}
                </p>
                <p className="mt-1 text-xs text-white/40">Accounts shown</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                  Active
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">
                  {activeCount}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  Currently enabled
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                  Wallet value
                </p>
                <p className="mt-2 truncate text-xl font-bold text-white">
                  {formatMoney(String(totalWallet))}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  Visible accounts
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                  Orders
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {totalOrders}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  Across customers
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Search */}
        <section className="mt-5 rounded-[26px] border border-black/[0.06] bg-white p-4 shadow-[0_10px_35px_rgba(16,35,26,0.05)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#10231a]">
                Customer directory
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Search by customer name or email address.
              </p>
            </div>

            <div className="relative w-full sm:max-w-md">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customers..."
                className="w-full rounded-2xl border border-slate-200 bg-[#f8faf9] py-3.5 pl-11 pr-4 text-sm font-medium text-[#10231a] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Customer list */}
        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Customer accounts
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Real customer records from the NumberHub database.
              </p>
            </div>

            {!loading && (
              <span className="hidden rounded-full bg-[#e8f4ed] px-3 py-1.5 text-xs font-bold text-[#087443] sm:block">
                {customers.length} records
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-[26px] border border-black/[0.04] bg-white"
                />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#eaf4ee] text-2xl text-[#087443]">
                ◎
              </div>
              <h3 className="mt-5 text-lg font-bold">No customers found</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                No customer matches your current search. Try another name or
                email address.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {customers.map((customer) => (
                <article
                  key={customer.id}
                  className="group rounded-[26px] border border-black/[0.06] bg-white p-5 shadow-[0_8px_30px_rgba(16,35,26,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_18px_45px_rgba(16,35,26,0.09)] sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[19px] bg-gradient-to-br from-[#e2f5e9] to-[#ccebd8] text-sm font-extrabold text-[#087443] shadow-inner">
                      {initials(customer.fullName, customer.email)}

                      <span
                        className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white ${
                          customer.isActive
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold tracking-tight">
                            {customer.fullName || "Unnamed customer"}
                          </h3>

                          <p className="mt-1 truncate text-sm text-slate-500">
                            {customer.email}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${
                            customer.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {customer.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-[#f8faf9]">
                        <div className="px-3 py-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Wallet
                          </p>
                          <p className="mt-1 truncate text-sm font-extrabold text-[#10231a]">
                            {formatMoney(customer.balanceMinor)}
                          </p>
                        </div>

                        <div className="px-3 py-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Orders
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-[#10231a]">
                            {customer.orderCount}
                          </p>
                        </div>

                        <div className="px-3 py-3">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Joined
                          </p>
                          <p className="mt-1 truncate text-sm font-extrabold text-[#10231a]">
                            {formatDate(customer.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">
                          {customer.role}
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#087443] transition group-hover:gap-2">
                          Account details
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-black/[0.06] pt-6 text-center text-xs text-slate-400">
          NumberHub Administration · Secure customer workspace
        </footer>
      </div>
    </main>
  );
}
