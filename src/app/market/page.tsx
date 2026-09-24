"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Country = {
  code: string;
  name: string;
  flag: string;
  description: string;
  services: string[];
};

type CatalogService = {
  slug: string;
  name: string;
  icon: string | null;
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
  US: "Verification numbers",
  GB: "Verification numbers",
  CA: "Verification numbers",
  DE: "Verification numbers",
};

const countryAccent: Record<string, string> = {
  US: "bg-emerald-500/10",
  GB: "bg-blue-500/10",
  CA: "bg-red-500/10",
  DE: "bg-amber-500/10",
};

const POPULAR_COUNTRY_CODES = ["US", "GB", "CA", "DE"];

export default function MarketPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        setLoading(true);
        setCatalogError("");

        const response = await fetch("/api/catalog", {
          credentials: "include",
          cache: "no-store",
        });

        const text = await response.text();

        let data: {
          countries?: Array<{
            code: string;
            name: string;
            flag: string | null;
          }>;
          services?: CatalogService[];
          offerings?: Offering[];
          error?: string;
        } = {};

        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error("Invalid catalog response");
        }

        if (!response.ok) {
          throw new Error(data.error || "Unable to load marketplace");
        }

        if (cancelled) return;

        const loadedServices = data.services ?? [];
        const loadedOfferings = data.offerings ?? [];

        const loadedCountries: Country[] = (data.countries ?? []).map(
          (country) => ({
            code: country.code,
            name: country.name,
            flag: country.flag || "🌍",
            description:
              countryDescriptions[country.code] ||
              "Verification numbers",
            services: loadedOfferings
              .filter((item) => item.countryCode === country.code)
              .map((item) => item.serviceName)
              .filter(
                (name, index, list) => list.indexOf(name) === index,
              ),
          }),
        );

        setCountries(loadedCountries);
        setServices(loadedServices);
        setOfferings(loadedOfferings);
      } catch (error) {
        if (!cancelled) {
          console.error("Marketplace catalog error:", error);

          setCatalogError(
            error instanceof Error
              ? error.message
              : "Unable to load marketplace catalog",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const offeringServiceSlugs = useMemo(
    () => new Set(offerings.map((item) => item.serviceSlug)),
    [offerings],
  );

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return countries.filter((country) =>
        POPULAR_COUNTRY_CODES.includes(country.code.toUpperCase()),
      );
    }

    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.services.some((service) =>
          service.toLowerCase().includes(query),
        ),
    );
  }, [search, countries]);

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-[#101412] dark:bg-[#050807] dark:text-white">
      <div className="mx-auto min-h-screen max-w-2xl pb-32">

        {/* HEADER */}
        <header className="px-5 pt-5">
          <div className="flex items-center justify-between">

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-3"
            >
              <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[15px] bg-[#0d1915] text-white shadow-[0_8px_30px_rgba(16,185,129,0.16)] dark:bg-emerald-500">
                <span className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-transparent" />
                <span className="relative text-sm font-black">N</span>
              </span>

              <span className="text-left">
                <span className="block text-[15px] font-black tracking-[-0.02em]">
                  NumberHub
                </span>

                <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                  Digital connectivity
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/wallet")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold shadow-sm transition hover:border-emerald-300 dark:border-white/[0.08] dark:bg-white/[0.04]"
              aria-label="Wallet"
            >
              ₦
            </button>
          </div>
        </header>

        {/* HERO */}
        <section className="px-5 pt-10">

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">
              Marketplace
            </span>
          </div>

          <h1 className="mt-4 max-w-[360px] text-[38px] font-black leading-[0.98] tracking-[-0.055em]">
            Connectivity.
            <br />
            <span className="text-slate-400 dark:text-slate-600">
              Ready when you are.
            </span>
          </h1>

          <p className="mt-5 max-w-[390px] text-[13px] leading-6 text-slate-500 dark:text-slate-400">
            Explore verification numbers by country and service.
            Choose what you need and continue when you're ready.
          </p>

          {/* SEARCH */}
          <div className="relative mt-7">
            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg text-slate-400">
              ⌕
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search country or service"
              className="h-[58px] w-full rounded-[19px] border border-slate-200 bg-white pl-13 pr-5 text-[13px] font-semibold outline-none shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/[0.07] dark:bg-white/[0.035] dark:shadow-none dark:placeholder:text-slate-600"
            />
          </div>
        </section>

        {/* DESTINATIONS */}
        <section className="mt-11">

          <div className="flex items-end justify-between px-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">
                Explore
              </p>

              <h2 className="mt-2 text-[22px] font-black tracking-[-0.035em]">
                Popular destinations
              </h2>
            </div>


          </div>

          {loading ? (
            <div className="mt-5 grid grid-cols-2 gap-3 px-5">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-[178px] animate-pulse rounded-[26px] bg-slate-200 dark:bg-white/[0.04]"
                />
              ))}
            </div>
          ) : catalogError ? (
            <div className="mx-5 mt-5 rounded-[25px] border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/5">
              <p className="text-sm font-black text-red-700 dark:text-red-300">
                Marketplace unavailable
              </p>

              <p className="mt-2 text-xs leading-5 text-red-600/80 dark:text-red-300/70">
                {catalogError}
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 px-5">

              {filteredCountries.map((country) => {
                const countryCode = country.code.toUpperCase();
                const flag = countryCode.length === 2
                  ? String.fromCodePoint(
                      ...countryCode.split("").map(
                        (char) => char.charCodeAt(0) + 127397,
                      ),
                    )
                  : "◈";

                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/market/${country.code.toLowerCase()}`,
                      )
                    }
                    className="group relative min-h-[178px] overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-5 text-left shadow-[0_10px_35px_rgba(15,23,42,0.045)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/70 hover:shadow-[0_18px_45px_rgba(16,185,129,0.10)] active:scale-[0.985] dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-none dark:hover:border-emerald-400/25 dark:hover:bg-white/[0.05]"
                  >
                    <div
                      className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full ${
                        countryAccent[country.code] ?? "bg-emerald-500/10"
                      } opacity-70 blur-3xl`}
                    />

                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[17px] border border-slate-100 bg-slate-50 text-[29px] shadow-sm dark:border-white/[0.06] dark:bg-white/[0.045]">
                          {flag}
                        </div>

                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-slate-50 text-slate-400 transition-all duration-200 group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-white/35 dark:group-hover:border-emerald-400/20 dark:group-hover:bg-emerald-400/10 dark:group-hover:text-emerald-300">
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M7 17 17 7" />
                            <path d="M8 7h9v9" />
                          </svg>
                        </span>
                      </div>

                      <div className="mt-auto pt-8">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/70 dark:text-emerald-300/55">
                          {countryCode}
                        </p>

                        <h3 className="mt-1.5 text-[16px] font-black tracking-[-0.025em] text-slate-950 dark:text-white">
                          {country.name}
                        </h3>

                        <p className="mt-1 text-[10px] font-semibold tracking-[-0.01em] text-slate-400 dark:text-white/35">
                          {countryCode} · Connectivity services
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

            </div>
          )}

          {!loading &&
            !catalogError &&
            filteredCountries.length === 0 && (
              <div className="mx-5 mt-5 rounded-[25px] border border-dashed border-slate-300 bg-white p-9 text-center dark:border-white/10 dark:bg-white/[0.025]">
                <p className="text-sm font-black">
                  No matching destination
                </p>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Try another country or service.
                </p>
              </div>
            )}
        </section>

        {/* SERVICES */}
        {!loading &&
          !catalogError &&
          search.trim().length > 0 &&
          services.length > 0 && (
          <section className="mt-12 px-5">

            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">
              Browse by
            </p>

            <div className="mt-2 flex items-end justify-between">
              <h2 className="text-[22px] font-black tracking-[-0.035em]">
                Services
              </h2>

              <span className="text-[10px] font-semibold text-slate-400">
                {services.filter((service) => {
                  const query = search.trim().toLowerCase();
                  return (
                    service.name.toLowerCase().includes(query) ||
                    service.slug.toLowerCase().includes(query)
                  );
                }).length} matching
              </span>
            </div>

            <div className="mt-5 space-y-2">

              {services
                .filter((service) => {
                  const query = search.trim().toLowerCase();

                  return (
                    service.name.toLowerCase().includes(query) ||
                    service.slug.toLowerCase().includes(query)
                  );
                })
                .slice(0, 50)
                .map((service) => {
                  const available = offeringServiceSlugs.has(service.slug);

                  return (
                  <button
                    key={service.slug}
                    type="button"
                    onClick={() => setSearch(service.name)}
                    className="group flex w-full items-center justify-between rounded-[21px] border border-slate-200 bg-white p-3.5 text-left shadow-[0_7px_25px_rgba(15,23,42,0.025)] transition hover:border-emerald-300 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.035] dark:shadow-none"
                  >

                    <div className="flex items-center gap-3">

                      <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-slate-100 text-sm font-black text-slate-700 dark:bg-white/[0.06] dark:text-white">
                        {service.icon || "•"}
                      </span>

                      <span>
                        <span className="block text-[13px] font-black">
                          {service.name}
                        </span>

                        <span
                          className={`mt-1 block text-[9px] font-bold ${
                            available
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400"
                          }`}
                        >
                          {available
                            ? "Available now"
                            : "Coming soon"}
                        </span>
                      </span>
                    </div>

                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:bg-white/[0.04]">
                      →
                    </span>
                  </button>
                );
              })}

            </div>
          </section>
        )}

        {/* FUTURE PRODUCTS */}
        <section className="mx-5 mt-12 overflow-hidden rounded-[30px] border border-emerald-500/15 bg-[#09120f] p-6 text-white shadow-[0_20px_60px_rgba(6,78,59,0.12)]">

          <div className="relative">

            <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="flex items-center justify-between">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Coming soon
              </span>

              <span className="text-lg text-emerald-400">✦</span>
            </div>

            <h2 className="mt-6 max-w-[290px] text-[25px] font-black leading-[1.08] tracking-[-0.04em]">
              More ways to stay connected.
            </h2>

            <p className="mt-3 max-w-[340px] text-[12px] leading-5 text-slate-400">
              NumberHub is expanding into more digital connectivity
              products. These services are not available yet.
            </p>

            <div className="mt-6 grid gap-2">

              {[
                {
                  name: "eSIM",
                  description: "Digital SIM connectivity",
                },
                {
                  name: "Mobile Data",
                  description: "Flexible data connectivity",
                },
                {
                  name: "More products",
                  description: "Additional connectivity services",
                },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-[18px] border border-white/[0.07] bg-white/[0.035] px-4 py-3.5"
                >
                  <div>
                    <p className="text-[12px] font-black">
                      {item.name}
                    </p>

                    <p className="mt-1 text-[9px] text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.15em] text-emerald-300">
                    Soon
                  </span>
                </div>
              ))}

            </div>
          </div>
        </section>

        {/* BOTTOM NAVIGATION */}
        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-2xl -translate-x-1/2 border-t border-slate-200/80 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-2xl dark:border-white/[0.07] dark:bg-[#050807]/95">

          <div className="grid grid-cols-5 gap-1">

            {[
              {
                label: "Home",
                path: "/dashboard",
                icon: "⌂",
              },
              {
                label: "Market",
                path: "/market",
                icon: "◈",
              },
              {
                label: "Orders",
                path: "/orders",
                icon: "□",
              },
              {
                label: "Transaction",
                path: "/transactions",
                icon: "⇄",
              },
              {
                label: "Me",
                path: "/profile",
                icon: "●",
              },
            ].map((item) => {
              const active = item.label === "Market";

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => router.push(item.path)}
                  className={`relative rounded-[17px] px-1 py-2 transition ${
                    active
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {active && (
                    <span className="absolute left-1/2 top-0 h-0.5 w-5 -translate-x-1/2 rounded-full bg-emerald-500" />
                  )}

                  <span className="block text-[16px] leading-5">
                    {item.icon}
                  </span>

                  <span className="mt-1 block truncate text-[8px] font-black">
                    {item.label}
                  </span>
                </button>
              );
            })}

          </div>
        </nav>

      </div>
    </main>
  );
}
