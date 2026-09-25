"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  status: string;
  currency: string;
  priceMinor: string;
  refundEnabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  serviceSlug: string;
  serviceName: string;
  serviceIcon: string;
  optionName: string;
  phoneNumber?: string | null;
  isLegacy?: boolean;
  legacyReference?: string | null;
};

type Filter = "ALL" | "ACTIVE" | "COMPLETED" | "FAILED";

function formatMoney(minor: string, currency: string) {
  const amount = Number(minor) / 100;

  if (!Number.isFinite(amount)) {
    return `${currency} —`;
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusMeta(status: string) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };

    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
    case "REFUNDED":
      return {
        label: status.charAt(0) + status.slice(1).toLowerCase(),
        className:
          "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300",
        dot: "bg-red-500",
      };

    case "PROCESSING":
      return {
        label: "Processing",
        className:
          "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
        dot: "bg-blue-500",
      };

    case "NUMBER_ASSIGNED":
    case "WAITING_FOR_SMS":
      return {
        label: "Waiting for OTP",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
        dot: "bg-amber-500",
      };

    case "CODE_RECEIVED":
      return {
        label: "OTP received",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };

    default:
      return {
        label: "Pending",
        className:
          "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
        dot: "bg-amber-500",
      };
  }
}

function matchesFilter(order: Order, filter: Filter) {
  if (filter === "ALL") {
    return true;
  }

  if (filter === "COMPLETED") {
    return order.status === "COMPLETED";
  }

  if (filter === "FAILED") {
    return ["FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(
      order.status,
    );
  }

  return !["COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(
    order.status,
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/orders", {
          cache: "no-store",
          credentials: "include",
        });

        const contentType = response.headers.get("content-type") || "";
        const rawBody = await response.text();

        if (!rawBody.trim()) {
          throw new Error(
            response.ok
              ? "The server returned an empty response."
              : `The server returned an empty response (${response.status}).`,
          );
        }

        if (!contentType.toLowerCase().includes("application/json")) {
          throw new Error(
            `The server returned an unexpected response (${response.status}).`,
          );
        }

        let data: {
          success?: boolean;
          error?: string;
          orders?: Order[];
        };

        try {
          data = JSON.parse(rawBody);
        } catch {
          throw new Error("The server returned invalid JSON.");
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load orders");
        }

        if (!cancelled) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load orders",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, filter)),
    [orders, filter],
  );

  return (
    <main className="min-h-screen bg-[#080b0a] text-white">
      <div className="mx-auto min-h-screen max-w-4xl px-4 pb-28 sm:px-6">

        <header className="sticky top-0 z-20 -mx-4 border-b border-white/[0.07] bg-[#080b0a]/90 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-base font-black text-emerald-400">
                N
              </div>

              <div>
                <p className="text-sm font-black tracking-tight">
                  NumberHub
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                  Digital connectivity
                </p>
              </div>
            </Link>

            <Link
              href="/wallet"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/65 transition hover:border-emerald-400/25 hover:text-emerald-400"
            >
              Wallet
            </Link>
          </div>
        </header>

        <section className="pt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
            Activity
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.04em]">
                Your orders
              </h1>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
                View your connectivity purchases and follow each order from
                purchase to completion.
              </p>
            </div>

            <Link
              href="/market"
              className="hidden rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs font-black text-emerald-400 transition hover:bg-emerald-400/15 sm:inline-flex"
            >
              Browse market →
            </Link>
          </div>
        </section>

        <section className="pt-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(
              [
                ["ALL", "All"],
                ["ACTIVE", "Active"],
                ["COMPLETED", "Completed"],
                ["FAILED", "Failed"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${
                  filter === value
                    ? "bg-emerald-400 text-[#04130b] shadow-[0_8px_25px_rgba(53,208,127,.15)]"
                    : "border border-white/10 bg-white/[0.035] text-white/45 hover:border-white/15 hover:text-white/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="pt-5">
          {loading ? (
            <div className="nh-premium-card p-9 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
              <p className="mt-4 text-sm font-bold text-white/35">
                Loading your orders…
              </p>
            </div>
          ) : error ? (
            <div className="rounded-[1.5rem] border border-red-400/20 bg-red-400/[0.06] p-6">
              <p className="font-black text-red-300">
                Couldn&apos;t load orders
              </p>

              <p className="mt-2 text-sm leading-6 text-red-200/60">
                {error}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl bg-red-400 px-4 py-3 text-xs font-black text-black"
              >
                Try again
              </button>
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="nh-premium-card p-9 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-emerald-400/15 bg-emerald-400/10 text-2xl text-emerald-400">
                ◈
              </div>

              <h2 className="mt-5 text-xl font-black">
                {filter === "ALL" ? "No orders yet" : "No matching orders"}
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/35">
                {filter === "ALL"
                  ? "Your NumberHub purchases will appear here once you place an order."
                  : "Try another filter or browse the marketplace for available products."}
              </p>

              <Link
                href="/market"
                className="nh-premium-button mt-6 inline-flex px-5 py-3 text-sm"
              >
                Browse marketplace →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map((order) => {
                const meta = statusMeta(order.status);

                const card = (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.07] bg-black/20 text-xl">
                        {order.countryFlag || "🌐"}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate font-black tracking-tight">
                            {order.optionName || `${order.serviceName} number`}
                          </h2>

                          {order.isLegacy && (
                            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/40">
                              Historical
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs font-medium text-white/35">
                          {order.countryName} · {order.serviceName}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-black ${meta.className}`}
                    >
                      <span
                        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`}
                      />
                      {meta.label}
                    </span>
                  </div>
                );

                const details = (
                  <>
                    {card}

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">
                          Amount
                        </p>
                        <p className="mt-1 font-black text-emerald-400">
                          {formatMoney(order.priceMinor, order.currency)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">
                          Ordered
                        </p>
                        <p className="mt-1 text-sm font-bold text-white/70">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                      <p className="truncate text-[10px] font-bold text-white/25">
                        {order.isLegacy
                          ? `Reference ${order.legacyReference || order.id.slice(0, 8).toUpperCase()}`
                          : `Order #${order.id.slice(0, 8).toUpperCase()}`}
                      </p>

                      {order.isLegacy ? (
                        <span className="text-xs font-black text-white/30">
                          Historical record
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400">
                          View details
                          <span aria-hidden="true">→</span>
                        </span>
                      )}
                    </div>
                  </>
                );

                const className =
                  "group block rounded-[1.5rem] border border-white/[0.08] bg-white/[0.035] p-5 shadow-[0_15px_45px_rgba(0,0,0,.16)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/25 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-emerald-400/30";

                return order.isLegacy ? (
                  <div key={order.id} className={className}>
                    {details}
                  </div>
                ) : (
                  <Link
                    key={order.id}
                    href={`/orders/${encodeURIComponent(order.id)}`}
                    className={className}
                  >
                    {details}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <nav className="nh-bottom-nav fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto grid max-w-4xl grid-cols-5 gap-1">
          {[
            ["⌂", "Home", "/dashboard"],
            ["◈", "Market", "/market"],
            ["▣", "Orders", "/orders"],
            ["⇄", "Transaction", "/transactions"],
            ["●", "Me", "/profile"],
          ].map(([icon, label, href]) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-black transition ${
                label === "Orders"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "text-white/30 hover:text-white/70"
              }`}
            >
              <span className="text-base" aria-hidden="true">
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
