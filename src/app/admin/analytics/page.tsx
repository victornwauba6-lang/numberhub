"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AnalyticsData = {
  connected: boolean;
  message: string;
  metrics: {
    visitorsToday: number | null;
    liveVisitors: number | null;
    sessions: number | null;
    newVisitors: number | null;
    marketplaceVisits: number | null;
    purchaseAttempts: number | null;
    customerSignupsToday: number;
    ordersToday: number;
    completedOrdersToday: number;
    successfulPaymentsToday: number;
    walletDepositsTodayMinor: number;
    purchaseRevenueTodayMinor: number;
  };
  businessTraffic: {
    day: string;
    signups: number;
    orders: number;
    completedOrders: number;
    successfulPayments: number;
    walletDepositsMinor: number;
    purchaseRevenueMinor: number;
  }[];
  traffic: {
    day: string;
    visitors: number;
    pageviews: number;
    sessions: number;
  }[];
  liveVisitors: {
    event: string;
    timestamp: string;
    distinctId: string;
    pathname: string;
  }[];
  topPages: {
    pathname: string;
    views: number;
  }[];
  countries: {
    country: string;
    visitors: number;
  }[];
  devices: {
    device: string;
    visitors: number;
  }[];
  funnel: unknown[];
};

const metricCards = [
  ["visitorsToday", "Visitors today", "👥", "Unique visitors today"],
  ["liveVisitors", "Live visitors", "●", "Active in the last 5 minutes"],
  ["sessions", "Sessions", "◌", "Sessions in the last 7 days"],
  ["newVisitors", "New visitors", "✦", "First-time visitors today"],
  ["marketplaceVisits", "Marketplace visits", "◈", "Marketplace pageviews today"],
  ["purchaseAttempts", "Purchase attempts", "↗", "Business purchase events"],
] as const;

function formatNumber(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString();
}

function formatNaira(minor: number) {
  return `₦${Math.round(minor / 100).toLocaleString("en-NG")}`;
}

function formatBusinessDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
  });
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    try {
      setError("");

      const response = await fetch("/api/admin/analytics", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (response.status === 403) {
        setError("You do not have permission to access analytics.");
        return;
      }

      if (!response.ok) {
        throw new Error("Analytics request failed");
      }

      const result = (await response.json()) as AnalyticsData;
      setData(result);
    } catch {
      setError("Unable to load analytics right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();

    const interval = window.setInterval(loadAnalytics, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const connected = data?.connected === true;

  return (
    <main className="min-h-screen bg-[#f3f7f5] text-[#10231a]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[30px] bg-[#062d1d] shadow-[0_24px_70px_rgba(6,45,29,0.20)]">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative p-5 sm:p-7 lg:p-9">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/10"
              >
                ← Dashboard
              </Link>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    connected ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/65">
                  {connected ? "Analytics connected" : "Analytics setup"}
                </span>
              </div>
            </div>

            <div className="mt-8 max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                NumberHub intelligence
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                Website Analytics
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                Real visitor activity from NumberHub&apos;s analytics
                provider. Data refreshes automatically every 30 seconds.
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {metricCards.map(([key, label, icon, description]) => {
            const value = data?.metrics?.[key];

            return (
              <div
                key={key}
                className="rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-[0_8px_30px_rgba(16,35,26,0.045)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f4ed] text-sm text-[#087443]">
                  {icon}
                </div>

                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {label}
                </p>

                <p className="mt-1 text-2xl font-extrabold tracking-tight">
                  {loading ? "—" : formatNumber(value ?? null)}
                </p>

                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                  {description}
                </p>
              </div>
            );
          })}
        </section>

                  <section className="mt-5 rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)] sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087443]">
                  NumberHub business
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight">
                  Business performance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Real customer, order, payment and wallet activity recorded in the NumberHub database.
                </p>
              </div>
              <div className="rounded-xl bg-[#e8f4ed] px-3 py-2 text-xs font-bold text-[#087443]">
                Database data
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Customer signups", data?.metrics?.customerSignupsToday ?? 0],
                ["Orders", data?.metrics?.ordersToday ?? 0],
                ["Completed orders", data?.metrics?.completedOrdersToday ?? 0],
                ["Successful payments", data?.metrics?.successfulPaymentsToday ?? 0],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[20px] border border-black/[0.05] bg-[#f8faf9] p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight">
                    {loading ? "—" : Number(value).toLocaleString("en-NG")}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">Today</p>
                </div>
              ))}

              <div className="rounded-[20px] border border-black/[0.05] bg-[#f8faf9] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  Wallet deposits
                </p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight">
                  {loading ? "—" : formatNaira(data?.metrics?.walletDepositsTodayMinor ?? 0)}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">Today</p>
              </div>

              <div className="rounded-[20px] border border-black/[0.05] bg-[#f8faf9] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  Completed sales
                </p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight">
                  {loading ? "—" : formatNaira(data?.metrics?.purchaseRevenueTodayMinor ?? 0)}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Completed order value today
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                7-day business activity
              </p>

              <div className="mt-3 overflow-x-auto">
                <div className="min-w-[850px]">
                  <div className="grid grid-cols-[110px_80px_80px_100px_100px_130px_140px] gap-3 border-b border-slate-100 px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    <span>Day</span>
                    <span>Signups</span>
                    <span>Orders</span>
                    <span>Completed</span>
                    <span>Payments</span>
                    <span>Wallet deposits</span>
                    <span>Completed sales</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {data?.businessTraffic?.length ? (
                      data.businessTraffic.map((row) => (
                        <div
                          key={row.day}
                          className="grid grid-cols-[110px_80px_80px_100px_100px_130px_140px] gap-3 px-3 py-4 text-sm"
                        >
                          <span className="font-bold">
                            {formatBusinessDay(row.day)}
                          </span>
                          <span>{row.signups.toLocaleString("en-NG")}</span>
                          <span>{row.orders.toLocaleString("en-NG")}</span>
                          <span>{row.completedOrders.toLocaleString("en-NG")}</span>
                          <span>{row.successfulPayments.toLocaleString("en-NG")}</span>
                          <span>{formatNaira(row.walletDepositsMinor)}</span>
                          <span>{formatNaira(row.purchaseRevenueMinor)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f9fbfa] p-8 text-center">
                        <p className="font-bold">No business activity yet</p>
                        <p className="mt-2 text-sm text-slate-500">
                          Customer, order, payment and wallet activity will appear here when recorded.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

<section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087443]">
                  Website traffic
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight">
                  7-day traffic trend
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Visitors, pageviews and sessions recorded by PostHog.
                </p>
              </div>
              <div className="rounded-xl bg-[#e8f4ed] px-3 py-2 text-xs font-bold text-[#087443]">
                PostHog
              </div>
            </div>

            <div className="mt-7">
              {data?.traffic.length ? (
                <>
                  <div className="relative h-44">
                    <div className="absolute inset-0 flex flex-col justify-between">
                      <div className="border-t border-slate-100" />
                      <div className="border-t border-slate-100" />
                      <div className="border-t border-slate-100" />
                      <div className="border-t border-slate-100" />
                    </div>

                    <div className="absolute inset-0 flex items-end justify-between gap-2 px-1">
                      {data.traffic.map((day) => {
                        const maxTraffic = Math.max(
                          ...data.traffic.map((item) =>
                            Math.max(item.visitors, item.pageviews, item.sessions),
                          ),
                          1,
                        );

                        const visitorHeight = Math.max(
                          day.visitors > 0 ? 8 : 2,
                          Math.round((day.visitors / maxTraffic) * 100),
                        );

                        const pageviewHeight = Math.max(
                          day.pageviews > 0 ? 8 : 2,
                          Math.round((day.pageviews / maxTraffic) * 100),
                        );

                        const sessionHeight = Math.max(
                          day.sessions > 0 ? 8 : 2,
                          Math.round((day.sessions / maxTraffic) * 100),
                        );

                        return (
                          <div
                            key={day.day}
                            className="flex h-full flex-1 items-end justify-center gap-0.5"
                            title={`${formatBusinessDay(day.day)} — ${day.visitors} visitors, ${day.pageviews} pageviews, ${day.sessions} sessions`}
                          >
                            <div
                              className="w-1.5 rounded-t-full bg-[#087443]"
                              style={{ height: `${visitorHeight}%` }}
                            />
                            <div
                              className="w-1.5 rounded-t-full bg-emerald-300"
                              style={{ height: `${pageviewHeight}%` }}
                            />
                            <div
                              className="w-1.5 rounded-t-full bg-slate-300"
                              style={{ height: `${sessionHeight}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-7 gap-2">
                    {data.traffic.map((day) => (
                      <div
                        key={day.day}
                        className="min-w-0 text-center text-[10px] font-semibold text-slate-400"
                      >
                        {formatDay(day.day)}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#087443]" />
                      Visitors
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-300" />
                      Pageviews
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      Sessions
                    </span>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500">
                  No website traffic data yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087443]">
                  Business activity
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight">
                  7-day business trend
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Customer signups, orders, completions and payments.
                </p>
              </div>
              <div className="rounded-xl bg-[#e8f4ed] px-3 py-2 text-xs font-bold text-[#087443]">
                Database
              </div>
            </div>

            <div className="mt-7">
              {data?.businessTraffic.length ? (
                <>
                  <div className="space-y-4">
                    {data.businessTraffic.map((day) => {
                      const values = [
                        day.signups,
                        day.orders,
                        day.completedOrders,
                        day.successfulPayments,
                      ];

                      const maxBusiness = Math.max(...values, 1);

                      return (
                        <div key={day.day}>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">
                              {formatBusinessDay(day.day)}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {formatNumber(
                                day.signups +
                                  day.orders +
                                  day.completedOrders +
                                  day.successfulPayments,
                              )}{" "}
                              total
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            {values.map((value, index) => (
                              <div
                                key={`${day.day}-${index}`}
                                className="flex h-14 flex-col justify-end overflow-hidden rounded-lg bg-slate-50"
                                title={`${value}`}
                              >
                                <div
                                  className="rounded-t-lg bg-[#087443] transition-all"
                                  style={{
                                    height: `${Math.max(
                                      value > 0 ? 12 : 3,
                                      Math.round((value / maxBusiness) * 100),
                                    )}%`,
                                  }}
                                />
                              </div>
                            ))}
                          </div>

                          <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-center text-[9px] font-semibold text-slate-400">
                            <span>{day.signups} signups</span>
                            <span>{day.orders} orders</span>
                            <span>{day.completedOrders} completed</span>
                            <span>{day.successfulPayments} payments</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-500">
                    Every value above comes directly from the NumberHub
                    PostgreSQL database.
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500">
                  No business activity yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087443]">
                Traffic overview
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                Visitor activity
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Real visitor and pageview activity from the last 7 days.
              </p>
            </div>

            <div className="rounded-xl bg-[#e8f4ed] px-3 py-2 text-xs font-bold text-[#087443]">
              Live data
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {data?.traffic?.length ? (
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[90px_1fr_1fr_1fr] gap-3 border-b border-slate-100 px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  <span>Day</span>
                  <span>Visitors</span>
                  <span>Pageviews</span>
                  <span>Sessions</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {data.traffic.map((row) => (
                    <div
                      key={row.day}
                      className="grid grid-cols-[90px_1fr_1fr_1fr] gap-3 px-3 py-4 text-sm"
                    >
                      <span className="font-bold">{formatDay(row.day)}</span>
                      <span>{row.visitors.toLocaleString()}</span>
                      <span>{row.pageviews.toLocaleString()}</span>
                      <span>{row.sessions.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-[#f9fbfa] p-10 text-center">
                <p className="font-bold">No traffic data yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  New website activity will appear here automatically.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <section className="rounded-[26px] border border-black/[0.06] bg-white p-5 shadow-[0_8px_30px_rgba(16,35,26,0.045)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087443]">
                  Content
                </p>
                <h2 className="mt-1 font-bold">Top pages</h2>
              </div>
              <span className="text-lg">◈</span>
            </div>

            <div className="mt-5 space-y-3">
              {data?.topPages?.length ? (
                data.topPages.map((page) => (
                  <div
                    key={page.pathname}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-[#f8faf9] p-3"
                  >
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {page.pathname}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-[#087443]">
                      {page.views.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f8faf9] p-4 text-sm text-slate-400">
                  No pageview data yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[26px] border border-black/[0.06] bg-white p-5 shadow-[0_8px_30px_rgba(16,35,26,0.045)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087443]">
                  Audience
                </p>
                <h2 className="mt-1 font-bold">Devices</h2>
              </div>
              <span className="text-lg">▣</span>
            </div>

            <div className="mt-5 space-y-3">
              {data?.devices?.length ? (
                data.devices.map((device) => (
                  <div
                    key={device.device}
                    className="flex items-center justify-between rounded-2xl bg-[#f8faf9] p-3"
                  >
                    <span className="text-sm font-semibold">
                      {device.device}
                    </span>
                    <span className="text-xs font-bold text-[#087443]">
                      {device.visitors.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f8faf9] p-4 text-sm text-slate-400">
                  No device data yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[26px] border border-black/[0.06] bg-white p-5 shadow-[0_8px_30px_rgba(16,35,26,0.045)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087443]">
                  Audience
                </p>
                <h2 className="mt-1 font-bold">Countries</h2>
              </div>
              <span className="text-lg">◎</span>
            </div>

            <div className="mt-5 space-y-3">
              {data?.countries?.length ? (
                data.countries.map((country) => (
                  <div
                    key={country.country}
                    className="flex items-center justify-between rounded-2xl bg-[#f8faf9] p-3"
                  >
                    <span className="text-sm font-semibold">
                      {country.country}
                    </span>
                    <span className="text-xs font-bold text-[#087443]">
                      {country.visitors.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f8faf9] p-4 text-sm text-slate-400">
                  No country data yet.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)] sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087443]">
                Live activity
              </p>
              <h2 className="mt-1 text-xl font-bold">Recent website events</h2>
              <p className="mt-1 text-sm text-slate-500">
                Events received by NumberHub in the last 10 minutes.
              </p>
            </div>

            <div className="rounded-xl bg-[#e8f4ed] px-3 py-2 text-xs font-bold text-[#087443]">
              Refreshes every 30s
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {data?.liveVisitors?.length ? (
              data.liveVisitors.map((item, index) => (
                <div
                  key={`${item.timestamp}-${item.event}-${index}`}
                  className="flex flex-col gap-2 rounded-2xl bg-[#f8faf9] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{item.event}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {item.pathname || "Unknown page"}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f9fbfa] p-8 text-center">
                <p className="font-bold">No recent activity</p>
                <p className="mt-2 text-sm text-slate-500">
                  Visit NumberHub in another browser or device and new events
                  will appear here.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-br from-[#eaf7ef] to-white p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087443]">
                Data integrity
              </p>
              <h2 className="mt-1 text-xl font-bold">
                Real analytics only
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Website activity comes from PostHog. Customer, order,
                payment and wallet figures come directly from NumberHub&apos;s
                PostgreSQL database. No business figures are invented.
              </p>
            </div>

            <div
              className={`shrink-0 rounded-2xl border px-5 py-3 text-sm font-bold shadow-sm ${
                connected
                  ? "border-emerald-200 bg-white text-[#087443]"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {connected ? "Connected" : "Needs setup"}
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-black/[0.06] pt-6 text-center text-xs text-slate-400">
          NumberHub Administration · Website intelligence
        </footer>
      </div>
    </main>
  );
}
