"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NumberHubAssistant from "@/app/_components/NumberHubAssistant";

type User = {
  id: string;
  email: string;
  name?: string | null;
};

type Transaction = {
  balanceMinor: number;
  currency: string;
};

type Order = {
  id: string;
  status: string;
  priceMinor: number;
  currency: string;
  countryName?: string | null;
  countryFlag?: string | null;
  serviceName?: string | null;
  optionName?: string | null;
  phoneNumber?: string | null;
  supplierNumberReference?: string | null;
  assignedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

function formatMoney(minor: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `₦${(minor / 100).toFixed(2)}`;
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "CREATED":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "NUMBER_ASSIGNED":
      return "Number ready";
    case "WAITING_FOR_SMS":
      return "Waiting for OTP";
    case "CODE_RECEIVED":
      return "Code received";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-400/15 bg-emerald-400/10 text-emerald-300";
    case "PROCESSING":
    case "CREATED":
    case "NUMBER_ASSIGNED":
    case "WAITING_FOR_SMS":
      return "border-amber-400/15 bg-amber-400/10 text-amber-300";
    case "CODE_RECEIVED":
      return "border-emerald-400/15 bg-emerald-400/10 text-emerald-300";
    case "FAILED":
    case "CANCELLED":
      return "border-red-400/15 bg-red-400/10 text-red-300";
    case "REFUNDED":
      return "border-sky-400/15 bg-sky-400/10 text-sky-300";
    default:
      return "border-white/10 bg-white/[0.06] text-white/60";
  }
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [wallet, setTransaction] = useState<Transaction | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setOrdersLoading(true);

        const [meResponse, walletResponse, ordersResponse] =
          await Promise.all([
            fetch("/api/auth/me", {
              credentials: "include",
              cache: "no-store",
            }),
            fetch("/api/wallet", {
              credentials: "include",
              cache: "no-store",
            }),
            fetch("/api/orders", {
              credentials: "include",
              cache: "no-store",
            }),
          ]);

        if (!meResponse.ok) {
          router.replace("/login?next=/dashboard");
          return;
        }

        const meData = await meResponse.json();
        const walletData = walletResponse.ok
          ? await walletResponse.json()
          : null;
        const ordersData = ordersResponse.ok
          ? await ordersResponse.json()
          : null;

        if (cancelled) return;

        setUser(meData.user ?? meData);
        setTransaction(walletData?.wallet ?? null);

        const nextOrders = Array.isArray(ordersData?.orders)
          ? ordersData.orders
          : Array.isArray(ordersData)
            ? ordersData
            : [];

        setOrders(nextOrders);
      } catch {
        if (!cancelled) {
          setError("We couldn't load your dashboard. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setOrdersLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!orders.some((order) =>
      [
        "CREATED",
        "PROCESSING",
        "NUMBER_ASSIGNED",
        "WAITING_FOR_SMS",
        "CODE_RECEIVED",
      ].includes(order.status),
    )) {
      return;
    }

    let cancelled = false;

    const refreshOrders = async () => {
      try {
        const response = await fetch("/api/orders", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();
        const nextOrders = Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data)
            ? data
            : [];

        if (!cancelled) {
          setOrders(nextOrders);
        }
      } catch {
        // Keep the existing dashboard state if a background refresh fails.
      }
    };

    const interval = window.setInterval(() => {
      void refreshOrders();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [orders]);

  const stats = useMemo(() => {
    const active = orders.filter((order) =>
      ["CREATED", "PROCESSING"].includes(order.status),
    ).length;

    const completed = orders.filter(
      (order) => order.status === "COMPLETED",
    ).length;

    return {
      total: orders.length,
      active,
      completed,
    };
  }, [orders]);

  const firstName =
    user?.name?.trim()?.split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "there";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080b0a] text-white">
        <div className="mx-auto min-h-screen max-w-2xl px-5 pb-28 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
              <div className="mt-3 h-7 w-40 animate-pulse rounded-xl bg-white/10" />
            </div>
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-white/10" />
          </div>

          <div className="mt-8 h-64 animate-pulse rounded-[28px] bg-white/[0.06]" />

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <div className="h-28 animate-pulse rounded-3xl bg-white/[0.06]" />
            <div className="h-28 animate-pulse rounded-3xl bg-white/[0.06]" />
            <div className="h-28 animate-pulse rounded-3xl bg-white/[0.06]" />
          </div>

          <div className="mt-5 h-28 animate-pulse rounded-3xl bg-white/[0.06]" />
          <div className="mt-3 h-28 animate-pulse rounded-3xl bg-white/[0.06]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080b0a] text-white">
      <div className="mx-auto max-w-2xl px-5 pb-28 pt-6 sm:px-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[12px] shadow-lg shadow-emerald-500/10">
                <img
                  src="/brand/numberhub-symbol.svg"
                  alt="NumberHub"
                  className="h-full w-full object-cover"
                />
              </span>
              <div className="text-[15px] font-black tracking-tight">
                NumberHub
              </div>
            </div>
            <h1 className="mt-3 text-[25px] font-black tracking-[-0.04em]">
              Welcome, {firstName}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => router.push("/profile")}
            aria-label="Open profile"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-black text-white shadow-lg shadow-black/20 transition hover:border-emerald-400/30 hover:bg-white/[0.09] active:scale-95"
          >
            {(user?.name?.trim()?.charAt(0) ||
              user?.email?.charAt(0) ||
              "N").toUpperCase()}
          </button>
        </header>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        {/* Transaction */}
        <section className="nh-wallet mt-7 overflow-hidden p-6 sm:p-7">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300/80">
                    Available balance
                  </p>
                </div>

                <p className="mt-4 text-[34px] font-black tracking-[-0.05em] sm:text-[40px]">
                  {wallet
                    ? formatMoney(wallet.balanceMinor, wallet.currency)
                    : "₦0.00"}
                </p>

                <p className="mt-2 text-[11px] text-white/40">
                  Your wallet balance is used for eligible purchases.
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                NGN
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.push("/wallet")}
                className="nh-premium-button px-4 py-3.5 text-sm"
              >
                Fund wallet
              </button>

              <button
                type="button"
                onClick={() => router.push("/market")}
                className="min-h-[54px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/[0.1] active:scale-[0.98]"
              >
                Browse market
              </button>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="mt-7">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                Overview
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">
                Your activity
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="nh-premium-card p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">
                Orders
              </p>
              <p className="mt-3 text-2xl font-black tracking-tight">
                {stats.total}
              </p>
              <p className="mt-1 text-[10px] text-white/35">Total</p>
            </div>

            <div className="nh-premium-card p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">
                Active
              </p>
              <p className="mt-3 text-2xl font-black tracking-tight">
                {stats.active}
              </p>
              <p className="mt-1 text-[10px] text-white/35">In progress</p>
            </div>

            <div className="nh-premium-card p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">
                Completed
              </p>
              <p className="mt-3 text-2xl font-black tracking-tight">
                {stats.completed}
              </p>
              <p className="mt-1 text-[10px] text-white/35">Delivered</p>
            </div>
          </div>
        </section>

        {/* Active verification */}
        {(() => {
          const activeOrder = orders.find((order) =>
            [
              "NUMBER_ASSIGNED",
              "WAITING_FOR_SMS",
              "CODE_RECEIVED",
            ].includes(order.status),
          );

          if (!activeOrder) return null;

          const isWaiting =
            activeOrder.status === "WAITING_FOR_SMS" ||
            activeOrder.status === "NUMBER_ASSIGNED";

          return (
            <section className="mt-7">
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                  Active verification
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">
                  Your number
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/orders/${encodeURIComponent(activeOrder.id)}`,
                  )
                }
                className="group w-full overflow-hidden rounded-[28px] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.12] via-white/[0.045] to-white/[0.025] p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,.18)] transition hover:border-emerald-400/30 active:scale-[0.995]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.9)]" />
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                        {isWaiting ? "Waiting for OTP" : "Code received"}
                      </p>
                    </div>

                    <p className="mt-4 text-sm font-bold text-white/70">
                      {activeOrder.countryFlag || "🌐"}{" "}
                      {activeOrder.countryName || "International"} ·{" "}
                      {activeOrder.serviceName || "Verification"}
                    </p>

                    {activeOrder.phoneNumber ? (
                      <p className="mt-2 text-[25px] font-black tracking-[-0.04em] text-white">
                        {activeOrder.phoneNumber}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm font-bold text-white/50">
                        Number is being assigned…
                      </p>
                    )}

                    <p className="mt-2 text-xs leading-5 text-white/40">
                      {isWaiting
                        ? "Keep this page open while NumberHub waits for the verification SMS."
                        : "A verification code has arrived. Open the order to view it."}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white/70 transition group-hover:border-emerald-400/20 group-hover:text-emerald-300">
                    View
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
                    Live order
                  </span>
                  <span className="text-xs font-bold text-emerald-300">
                    Open order →
                  </span>
                </div>
              </button>
            </section>
          );
        })()}

        {/* Quick actions */}
        <section className="mt-7">
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
              Quick access
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => router.push("/market")}
              className="group nh-premium-card p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/25 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl text-emerald-300">
                  ☎
                </span>

                <span className="text-xl text-white/20 transition group-hover:translate-x-1 group-hover:text-emerald-400">
                  →
                </span>
              </div>

              <h3 className="mt-5 text-base font-black tracking-tight">
                Buy a number
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-white/40">
                Choose a country, service and available number.
              </p>
            </button>

            <button
              type="button"
              onClick={() => router.push("/orders")}
              className="group nh-premium-card p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/25 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-xl text-white/70">
                  ◫
                </span>

                <span className="text-xl text-white/20 transition group-hover:translate-x-1 group-hover:text-emerald-400">
                  →
                </span>
              </div>

              <h3 className="mt-5 text-base font-black tracking-tight">
                Track orders
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-white/40">
                Review your purchases and order status.
              </p>
            </button>

            <a
              href="https://whatsapp.com/channel/0029VbDRxIfD38CSw1z02m3H"
              target="_blank"
              rel="noopener noreferrer"
              className="group nh-premium-card p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/30 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M12 2a9.9 9.9 0 0 0-8.57 14.87L2 22l5.31-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.07-1.11l-.29-.17-3.15.83.84-3.06-.19-.3A8 8 0 1 1 12 20Zm4.38-5.99c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
                  </svg>
                </span>

                <span className="text-xl text-white/20 transition group-hover:translate-x-1 group-hover:text-emerald-400">
                  →
                </span>
              </div>

              <h3 className="mt-5 text-base font-black tracking-tight">
                WhatsApp Channel
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-white/40">
                Get NumberHub updates, announcements and offers.
              </p>
            </a>
          </div>
        </section>

        {/* Recent orders */}
        <section className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                Activity
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">
                Recent orders
              </h2>
            </div>

            <button
              type="button"
              onClick={() => router.push("/orders")}
              className="rounded-full px-3 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-400/10"
            >
              View all
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {ordersLoading ? (
              <>
                <div className="h-24 animate-pulse rounded-3xl bg-white/[0.06]" />
                <div className="h-24 animate-pulse rounded-3xl bg-white/[0.06]" />
              </>
            ) : orders.length === 0 ? (
              <div className="nh-premium-card border-dashed px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl text-emerald-300">
                  ◫
                </div>

                <p className="mt-4 text-sm font-bold">
                  No orders yet
                </p>

                <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-white/40">
                  Your recent purchases will appear here after you complete
                  your first eligible order.
                </p>

                <button
                  type="button"
                  onClick={() => router.push("/market")}
                  className="mt-5 rounded-2xl bg-emerald-400 px-5 py-3 text-xs font-black text-[#04130b] shadow-[0_8px_25px_rgba(53,208,127,.16)] transition hover:bg-emerald-300 active:scale-[0.98]"
                >
                  Explore market
                </button>
              </div>
            ) : (
              orders.slice(0, 4).map((order) => (
                <button
                  type="button"
                  key={order.id}
                  onClick={() =>
                    router.push(`/orders/${encodeURIComponent(order.id)}`)
                  }
                  className="group flex w-full items-center gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-4 text-left transition hover:border-emerald-400/20 hover:bg-white/[0.05] active:scale-[0.995]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.05] text-lg">
                    {order.countryFlag || "🌐"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold">
                        {order.serviceName || "Connectivity service"}
                      </p>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wide ${statusClasses(
                          order.status,
                        )}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-[10px] text-white/35">
                      {order.countryName || "International"} ·{" "}
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black">
                      {formatMoney(order.priceMinor, order.currency)}
                    </p>
                    <p className="mt-1 text-xs text-white/20 transition group-hover:text-emerald-400">
                      →
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Trust */}
        <section className="mt-7 overflow-hidden rounded-[24px] border border-emerald-400/10 bg-emerald-400/[0.055] p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-400/10 text-lg text-emerald-300">
              ✦
            </div>

            <div>
              <h3 className="text-sm font-black">
                Built for simple, secure connectivity
              </h3>

              <p className="mt-1 text-xs leading-5 text-white/40">
                Your wallet balance and order activity are connected to your
                NumberHub account. Availability is shown only when supported
                by the live catalog.
              </p>
            </div>
          </div>
        </section>

      </div>

      <NumberHubAssistant />

      {/* Bottom navigation */}
      <nav className="nh-bottom-nav fixed bottom-0 left-0 right-0 z-30 px-2 py-2">
        <div className="mx-auto flex max-w-2xl items-center justify-around">
          {[
            { label: "Home", icon: "⌂", path: "/dashboard", active: true },
            { label: "Market", icon: "◈", path: "/market", active: false },
            { label: "Orders", icon: "□", path: "/orders", active: false },
            { label: "Transaction", icon: "₦", path: "/transactions", active: false },
            { label: "Me", icon: "●", path: "/profile", active: false },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.path)}
              className={`flex min-w-[58px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-bold transition active:scale-95 ${
                item.active
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
