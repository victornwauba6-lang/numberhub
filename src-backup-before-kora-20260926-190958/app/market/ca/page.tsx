"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CatalogCountry = {
  code: string;
  name: string;
  flag: string | null;
  sortOrder: number;
};

type CatalogService = {
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
};

type Offering = {
  countryCode: string;
  countryName: string;
  countryFlag: string | null;
  serviceSlug: string;
  serviceName: string;
  serviceIcon: string | null;
  productId: string;
  optionId: string;
};

const countryDescriptions: Record<string, string> = {
  US: "Verification numbers for supported services in the United States.",
  GB: "UK numbers for supported verification services.",
  CA: "Canadian numbers for supported verification services.",
  DE: "German numbers for supported verification services.",
};

export default function CountryMarketPage() {
  const params = { country: "ca" };
  const countryCode = String(params?.country || "").toUpperCase();

  const [country, setCountry] = useState<CatalogCountry | null>(null);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setLoading(true);
      setCatalogError("");

      try {
        const response = await fetch("/api/catalog", {
          credentials: "include",
          cache: "no-store",
        });

        const text = await response.text();

        let data: {
          countries?: CatalogCountry[];
          services?: CatalogService[];
          offerings?: Offering[];
        } = {};

        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error("The catalog response was not valid JSON.");
        }

        if (!response.ok) {
          throw new Error("Unable to load the marketplace catalog.");
        }

        if (cancelled) return;

        const matchedCountry =
          (data.countries ?? []).find(
            (item) => item.code.toUpperCase() === countryCode,
          ) ?? null;

        setCountry(matchedCountry);
        setServices(data.services ?? []);
        setOfferings(data.offerings ?? []);
      } catch (error) {
        if (cancelled) return;

        setCatalogError(
          error instanceof Error
            ? error.message
            : "Unable to load the marketplace.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (countryCode) {
      loadCatalog();
    }

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  const countryOfferings = useMemo(
    () =>
      offerings.filter(
        (offering) => offering.countryCode.toUpperCase() === countryCode,
      ),
    [offerings, countryCode],
  );

  const availableServiceSlugs = useMemo(
    () => new Set(countryOfferings.map((offering) => offering.serviceSlug)),
    [countryOfferings],
  );

  const displayServices = services;

  const flag = country?.flag || "🌍";
  const name = country?.name || countryCode;
  const description =
    countryDescriptions[countryCode] ||
    `${name} connectivity products for supported services.`;

  if (!loading && !country && !catalogError) {
    return (
      <main className="min-h-screen bg-[#f6faf8] text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto min-h-screen max-w-5xl px-4 pb-28 sm:px-6">
          <header className="sticky top-0 z-20 -mx-4 border-b border-slate-200/80 bg-[#f6faf8]/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between">
              <Link href="/market" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 font-black text-white shadow-lg shadow-emerald-500/20">
                  N
                </div>

                <div>
                  <p className="text-sm font-black tracking-tight">
                    NumberHub
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Global connectivity
                  </p>
                </div>
              </Link>

              <Link
                href="/wallet"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                Wallet
              </Link>
            </div>
          </header>

          <section className="pt-8">
            <Link
              href="/market"
              className="text-sm font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              ← Back to marketplace
            </Link>

            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
              <div className="text-4xl">🌍</div>

              <h1 className="mt-5 text-3xl font-black tracking-tight">
                Country not available
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                We couldn't find this country in the current NumberHub
                marketplace catalog.
              </p>

              <Link
                href="/market"
                className="mt-6 inline-flex rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
              >
                Browse marketplace
              </Link>
            </div>
          </section>
        </div>

        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faf8] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto min-h-screen max-w-5xl px-4 pb-28 sm:px-6">
        <header className="sticky top-0 z-20 -mx-4 border-b border-slate-200/80 bg-[#f6faf8]/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/market" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 font-black text-white shadow-lg shadow-emerald-500/20">
                N
              </div>

              <div>
                <p className="text-sm font-black tracking-tight">
                  NumberHub
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Global connectivity
                </p>
              </div>
            </Link>

            <Link
              href="/wallet"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              Wallet
            </Link>
          </div>
        </header>

        <section className="pt-7">
          <Link
            href="/market"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
          >
            ← Back to marketplace
          </Link>

          <div className="mt-6 overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_20px_70px_rgba(16,185,129,0.10)] dark:border-emerald-400/10 dark:bg-white/[0.04]">
            <div className="relative overflow-hidden p-6 sm:p-8">
              <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                    {flag} {name}
                  </div>

                  <h1 className="max-w-xl text-3xl font-black tracking-tight sm:text-4xl">
                    {name} numbers
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                </div>

                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl dark:bg-emerald-400/10 sm:flex">
                  {flag}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                Services
              </p>

              <h2 className="mt-1 text-xl font-black tracking-tight">
                Choose a service
              </h2>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
              {loading ? "Loading..." : `${displayServices.length} services`}
            </span>
          </div>

          {catalogError ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 dark:border-red-400/20 dark:bg-red-400/5">
              <h3 className="font-black">Marketplace unavailable</h3>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {catalogError}
              </p>
            </div>
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-[1.5rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]"
                />
              ))}
            </div>
          ) : displayServices.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {displayServices.map((service) => {
                const available = availableServiceSlugs.has(service.slug);

                return (
                  <a
                    key={service.slug}
                    href={`/market/ca/${encodeURIComponent(service.slug)}`}
                    className="block rounded-[1.5rem] border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-700 dark:bg-white/10 dark:text-white">
                        {service.icon || "◈"}
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                          available
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                        }`}
                      >
                        {available ? "Available" : "Unavailable"}
                      </span>
                    </div>

                    <h3 className="mt-5 font-black">{service.name}</h3>

                    <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
                      {name} numbers for supported {service.name} use cases.
                    </p>

                    <div
                      className={`mt-5 text-xs font-bold ${
                        available
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {available
                        ? "Live product available →"
                        : "Currently unavailable →"}
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-400/5">
              <div className="flex gap-3">
                <div className="text-xl">ℹ️</div>

                <div>
                  <h3 className="font-black">
                    Availability coming soon
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    NumberHub does not currently have a live supplier offering
                    for {name}. We will show services here when real product
                    availability is connected.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="pt-8">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              NumberHub
            </p>

            <h2 className="mt-2 text-lg font-black">
              Secure wallet-powered purchases
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Your wallet will be used for eligible purchases once live
              products and suppliers are connected.
            </p>

            <Link
              href="/wallet"
              className="mt-5 inline-flex rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
            >
              View wallet
            </Link>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
      <div className="mx-auto grid max-w-5xl grid-cols-4 gap-2">
        <Link
          href="/dashboard"
          className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400"
        >
          <span className="text-base">⌂</span>
          Home
        </Link>

        <Link
          href="/market"
          className="flex flex-col items-center gap-1 rounded-xl bg-emerald-50 py-2 text-[11px] font-black text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
        >
          <span className="text-base">◈</span>
          Market
        </Link>

        <Link
          href="/orders"
          className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400"
        >
          <span className="text-base">□</span>
          Orders
        </Link>

        <Link
          href="/wallet"
          className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400"
        >
          <span className="text-base">₦</span>
          Wallet
        </Link>
      </div>
    </nav>
  );
}
