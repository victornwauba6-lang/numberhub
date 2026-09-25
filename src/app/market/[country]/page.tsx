"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type CatalogCountry = {
  id: string;
  code: string;
  name: string;
  flag?: string | null;
};

type CatalogService = {
  id?: string;
  code?: string;
  slug: string;
  name: string;
  icon?: string | null;
};

type Offering = {
  id: string;
  countryId: string;
  serviceId: string;
  name?: string | null;
  priceNgn?: number | null;
  price?: number | null;
  available?: boolean | null;
};

type LiveOption = {
  id?: string;
  productOptionId?: string;
  optionNumber?: number;
  name?: string | null;
  supplier?: string | null;
  customerPriceNgn?: number | null;
  priceNgn?: number | null;
  price?: number | null;
  available?: boolean | null;
  purchasable?: boolean | null;
  materializedPriceNgn?: number | null;
  materializedPromoPriceNgn?: number | null;
  description?: string | null;
};

type CatalogResponse = {
  countries?: CatalogCountry[];
  services?: CatalogService[];
  offerings?: Offering[];
};

type LiveResponse = {
  options?: LiveOption[];
};

const serviceIcons: Record<string, string> = {
  whatsapp: "◉",
  facebook: "f",
  telegram: "✈",
  tiktok: "♪",
  instagram: "◎",
  google: "G",
};

const descriptions: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  DE: "Germany",
};

function money(value: number) {
  return `₦${Math.round(value).toLocaleString("en-NG")}`;
}

export default function MarketCountryPage() {
  const params = useParams();
  const router = useRouter();
  const countryCode = String(params.country || "").toUpperCase();

  const [catalog, setCatalog] = useState<CatalogResponse>({});
  const [liveOptions, setLiveOptions] = useState<LiveOption[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceChosen, setServiceChosen] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/catalog", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Unable to load marketplace");

      const data: CatalogResponse = await res.json();
      setCatalog(data);

      const services = data.services || [];
      if (services.length) {
        setSelectedService((current) => current || services[0].slug);
      }
    } catch {
      setError("We couldn't load the marketplace right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLive = useCallback(async () => {
    if (!countryCode || !selectedService) return;

    try {
      setLiveLoading(true);
      setError("");

      const res = await fetch(
        `/api/catalog/live?country=${encodeURIComponent(countryCode)}&service=${encodeURIComponent(selectedService)}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!res.ok) throw new Error("Unable to load live options");

      const data = await res.json();

      const options = Array.isArray(data?.options)
        ? data.options
        : [];

      setLiveOptions(options);
    } catch {
      setLiveOptions([]);
      setError("Live options are temporarily unavailable.");
    } finally {
      setLiveLoading(false);
    }
  }, [countryCode, selectedService]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    loadLive();
  }, [loadLive]);

  const country = useMemo(
    () => (catalog.countries || []).find((item) => item.code.toUpperCase() === countryCode),
    [catalog.countries, countryCode]
  );

  const services = useMemo(() => catalog.services || [], [catalog.services]);

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();

    if (!query) return [];

    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(query) ||
        service.slug.toLowerCase().includes(query),
    );
  }, [services, serviceSearch]);

  const currentService = services.find(
    (item) => item.slug === selectedService
  );

  const lowestPrice = useMemo(() => {
    const prices = liveOptions
      .map((item) => Number(item.priceNgn ?? item.price ?? 0))
      .filter((price) => price > 0);

    return prices.length ? Math.min(...prices) : null;
  }, [liveOptions]);

  async function purchase(option: LiveOption) {
    if (buying) return;

    try {
      setBuying(option.productOptionId || option.id || null);
      setError("");

      const res = await fetch("/api/purchases", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productOptionId: option.productOptionId || option.id,
          idempotencyKey: `${option.id}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
        }),
      });

      if (res.status === 401) {
        router.push(`/login?next=/market/${countryCode.toLowerCase()}`);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Purchase could not be completed");
      }

      if (!data?.purchase?.orderId) {
        throw new Error("Order was created but no order ID was returned.");
      }

      router.push(`/orders/${data.purchase.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed.");
    } finally {
      setBuying(null);
    }
  }


  return (
    <main className="min-h-screen bg-[#050706] text-white">
      <div className="mx-auto min-h-screen max-w-2xl px-4 pb-28 sm:px-6">

        {/* TOP BAR */}
        <header className="flex items-center justify-between py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-400 text-lg font-black text-[#06100a]">
              N
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-tight">
                NumberHub
              </div>
              <div className="text-[11px] text-white/40">
                Digital connectivity
              </div>
            </div>
          </Link>

          <Link
            href="/wallet"
            className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-semibold text-white/80 backdrop-blur"
          >
            Wallet
          </Link>
        </header>

        {/* PREMIUM COUNTRY + SERVICE DISCOVERY */}
        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-gradient-to-br from-[#101a14] via-[#0a100c] to-[#060806] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.08] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-emerald-500/[0.035] blur-3xl" />

          <div className="relative">
            <button
              type="button"
              onClick={() => router.push("/market")}
              className="mb-7 flex items-center gap-2 text-[12px] font-bold text-white/45 transition hover:text-emerald-300"
            >
              <span className="text-lg leading-none">←</span>
              <span>
                {country?.name || descriptions[countryCode] || countryCode}
              </span>
            </button>

            <div className="flex items-center gap-4">
              <div className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-[21px] border border-white/[0.08] bg-white/[0.045] text-[39px] shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
                {countryCode.length === 2
                  ? String.fromCodePoint(
                      ...countryCode.split("").map(
                        (char) => char.charCodeAt(0) + 127397,
                      ),
                    )
                  : country?.flag || "◈"}
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300/60">
                  Country marketplace
                </p>
                <h1 className="mt-1 text-[25px] font-black tracking-[-0.045em] text-white">
                  {country?.name || descriptions[countryCode] || countryCode}
                </h1>
                <p className="mt-1 text-[12px] font-medium text-white/38">
                  Verification numbers & connectivity
                </p>
              </div>
            </div>

            <div className="relative mt-7">
              <div className="pointer-events-none absolute -inset-1 rounded-[22px] bg-emerald-400/[0.045] blur-xl" />

              <div className="relative flex h-[58px] items-center overflow-hidden rounded-[20px] border border-white/[0.09] bg-white/[0.045] shadow-[0_14px_45px_rgba(0,0,0,0.22)] transition-all duration-200 focus-within:border-emerald-400/35 focus-within:bg-white/[0.06] focus-within:shadow-[0_14px_45px_rgba(16,185,129,0.08)]">
                <div className="ml-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/[0.07] text-white/40">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-[17px] w-[17px]"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                </div>

                <input
                  type="search"
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                  placeholder="Search services"
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-[13px] font-bold tracking-[-0.01em] text-white outline-none placeholder:text-white/28"
                  aria-label="Search services"
                />

                {serviceSearch && (
                  <button
                    type="button"
                    onClick={() => setServiceSearch("")}
                    className="mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-white/40 transition hover:bg-emerald-400/10 hover:text-emerald-300"
                    aria-label="Clear service search"
                  >
                    <span className="text-[16px] leading-none">×</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

          {serviceSearch.trim() && (
            <div className="mt-4 space-y-2">
              {filteredServices.slice(0, 50).map((service) => {
                const active = selectedService === service.slug;
                const icon =
                  serviceIcons[String(service.code || "").toLowerCase()] ||
                  service.icon ||
                  "•";

                return (
                  <button
                    key={service.id || service.slug}
                    type="button"
                    onClick={() => {
                      setSelectedService(service.slug);
                      setServiceSearch("");
                      setServiceChosen(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`group flex w-full items-center gap-3 rounded-[20px] border p-3 text-left transition-all ${
                      active
                        ? "border-emerald-400/25 bg-emerald-400/[0.07]"
                        : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.045]"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white/[0.055] text-sm font-black text-white/65">
                      {icon}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-white/85">
                        {service.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] font-medium text-white/28">
                        Connectivity service
                      </span>
                    </span>

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.045] text-white/25 transition group-hover:bg-emerald-400/10 group-hover:text-emerald-300">
                      →
                    </span>
                  </button>
                );
              })}

              {filteredServices.length === 0 && (
                <div className="rounded-[20px] border border-dashed border-white/[0.09] bg-white/[0.02] px-5 py-8 text-center">
                  <div className="text-sm font-bold text-white/65">
                    No matching service
                  </div>
                  <p className="mt-1 text-xs text-white/30">
                    Try another service name.
                  </p>
                </div>
              )}
            </div>
          )}

        {/* POPULAR SERVICES */}
        {!serviceSearch.trim() && !serviceChosen && (
          <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/28">
                Explore
              </p>
              <h2 className="mt-1.5 text-[19px] font-black tracking-[-0.035em] text-white">
                Popular services
              </h2>
            </div>

            <span className="text-[10px] font-semibold text-white/25">
              Quick access
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {["whatsapp", "telegram", "facebook", "tiktok"].map((slug) => {
              const service = services.find(
                (item) =>
                  item.slug.toLowerCase() === slug ||
                  item.name.toLowerCase() ===
                    slug.charAt(0).toUpperCase() + slug.slice(1),
              );

              if (!service) return null;

              const active = selectedService === service.slug;
              const icon =
                serviceIcons[String(service.code || "").toLowerCase()] ||
                serviceIcons[slug] ||
                service.icon ||
                "•";

              return (
                <button
                  key={service.id || service.slug}
                  type="button"
                  onClick={() => setSelectedService(service.slug)}
                  className={`group relative min-h-[138px] overflow-hidden rounded-[24px] border p-4 text-left transition-all duration-300 active:scale-[0.985] ${
                    active
                      ? "border-emerald-400/30 bg-emerald-400/[0.08] shadow-[0_16px_45px_rgba(16,185,129,0.08)]"
                      : "border-white/[0.08] bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/[0.05] blur-2xl" />

                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/[0.07] bg-white/[0.06] text-lg font-black text-white/75">
                        {icon}
                      </span>

                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                          active
                            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                            : "border-white/[0.07] bg-white/[0.035] text-white/30 group-hover:border-emerald-400/20 group-hover:text-emerald-300"
                        }`}
                      >
                        <svg
                          width="14"
                          height="14"
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

                    <div className="mt-auto pt-6">
                      <h3 className="text-[14px] font-black tracking-[-0.02em] text-white">
                        {service.name}
                      </h3>

                      <p className="mt-1 text-[10px] font-semibold text-emerald-300/60">
                        {active ? "Selected" : "View options"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        )}

        {/* ALL SERVICES */}
        <section className="mt-9">
          <div className="mb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/28">
              Full catalogue
            </p>
            <h2 className="mt-1.5 text-[19px] font-black tracking-[-0.035em] text-white">
              All services
            </h2>
          </div>



        </section>

        {/* PRODUCT AREA */}
        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30">
                Live options
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                {currentService?.name || "Available numbers"}
              </h2>
            </div>

            {liveOptions.length > 0 && (
              <span className="text-xs text-white/35">
                {liveOptions.length} option{liveOptions.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {loading || liveLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[142px] animate-pulse rounded-[22px] border border-white/[0.06] bg-white/[0.035]"
                />
              ))}
            </div>
          ) : liveOptions.length === 0 ? (
            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] px-5 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-xl">
                —
              </div>
              <div className="font-semibold">
                No live options available
              </div>
              <p className="mt-1 text-sm text-white/40">
                Try another service or check again shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveOptions.map((option, index) => {
                const price = Number(
                  option.customerPriceNgn ??
                    option.materializedPromoPriceNgn ??
                    option.materializedPriceNgn ??
                    option.priceNgn ??
                    option.price ??
                    0
                );
                const unavailable =
                  option.available === false ||
                  option.purchasable === false;
                const isLowest =
                  lowestPrice !== null &&
                  price === lowestPrice &&
                  !unavailable;

                return (
                  <article
                    key={option.productOptionId || option.id || option.optionNumber}
                    className="group relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0b100d] p-4 transition hover:border-white/[0.13]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-bold">
                            {serviceIcons[
                              String(selectedService || "").toLowerCase()
                            ] || "N"}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-semibold">
                              {option.name ||
                                `${currentService?.name || "Verification"} Number #${option.optionNumber || ""}`}
                            </h3>
                            <p className="mt-0.5 text-xs text-white/35">
                              {country?.name || countryCode} · One-time SMS
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-semibold tracking-tight">
                          {price > 0 ? money(price) : "—"}
                        </div>
                        {isLowest && (
                          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                            Lowest available
                          </div>
                        )}
                      </div>
                    </div>

                    {option.description && (
                      <p className="mt-3 text-xs leading-5 text-white/35">
                        {option.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                          unavailable
                            ? "text-white/25"
                            : "text-emerald-300/80"
                        }`}
                      >
                        {unavailable ? "Unavailable" : "Ready"}
                      </span>

                      <button
                        type="button"
                        disabled={unavailable || buying === (option.productOptionId || option.id)}
                        onClick={() => purchase(option)}
                        className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-bold text-[#06100a] shadow-[0_8px_24px_rgba(52,211,153,0.14)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {buying === (option.productOptionId || option.id)
                          ? "Processing…"
                          : "Get number"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ERROR */}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200/80">
            {error}
          </div>
        )}

        {/* WALLET STRIP */}
        <Link
          href="/wallet"
          className="mt-7 flex items-center justify-between rounded-[20px] border border-white/[0.07] bg-white/[0.025] px-4 py-4 transition hover:bg-white/[0.045]"
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
              Your wallet
            </div>
            <div className="mt-1 text-sm font-medium text-white/75">
              Fund your wallet before purchasing
            </div>
          </div>

          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/[0.10] text-emerald-300">
            →
          </span>
        </Link>
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-[#050706]/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          {[
            ["Home", "/dashboard", "⌂"],
            ["Market", "/market", "◈"],
            ["Orders", "/orders", "□"],
            ["Transaction History", "/transactions", "↕"],
            ["Me", "/profile", "○"],
          ].map(([label, href, icon]) => {
            const active = label === "Market";

            return (
              <Link
                key={label}
                href={href}
                className={`flex min-w-[58px] flex-col items-center gap-1 rounded-xl px-3 py-2 ${
                  active ? "text-emerald-300" : "text-white/35"
                }`}
              >
                <span
                  className={`text-base ${
                    active ? "font-bold" : ""
                  }`}
                >
                  {icon}
                </span>
                <span className="text-[10px] font-semibold">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
