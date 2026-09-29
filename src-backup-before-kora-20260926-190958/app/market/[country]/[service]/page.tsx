"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  productOptionName: string;
  optionId: string;
  optionNumber: number;
  priceMinor: string;
  promoPriceMinor: string | null;
  currency: string;
  purchaseLimitPerCustomer: number | null;
  refundEnabled: boolean;
};

function formatMoney(minor: string, currency: string) {
  const amount = Number(minor) / 100;

  if (!Number.isFinite(amount)) return "Price unavailable";

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getDisplayPrice(offering: Offering) {
  const promo =
    offering.promoPriceMinor !== null &&
    Number(offering.promoPriceMinor) >= 0 &&
    Number(offering.promoPriceMinor) < Number(offering.priceMinor);

  return {
    hasPromo: promo,
    minor: promo ? offering.promoPriceMinor! : offering.priceMinor,
  };
}

function TrustItem({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 sm:text-xs">
      <span className="font-black text-emerald-500">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function InfoBox({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-xs font-black ${
          positive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-700 dark:text-slate-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function ServiceMarketPage() {
  const params = useParams<{ country: string; service: string }>();
  const router = useRouter();

  const countryCode = String(params?.country || "").toUpperCase();
  const serviceSlug = String(params?.service || "").toLowerCase();

  const [countries, setCountries] = useState<CatalogCountry[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [selectedOffering, setSelectedOffering] =
    useState<Offering | null>(null);
  const [purchasingId, setPurchasingId] = useState("");
  const [purchaseError, setPurchaseError] = useState("");

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

        setCountries(data.countries ?? []);
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
        if (!cancelled) setLoading(false);
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const country = useMemo(
    () =>
      countries.find(
        (item) => item.code.toUpperCase() === countryCode,
      ) ?? null,
    [countries, countryCode],
  );

  const service = useMemo(
    () =>
      services.find(
        (item) => item.slug.toLowerCase() === serviceSlug,
      ) ?? null,
    [services, serviceSlug],
  );

  const serviceOfferings = useMemo(
    () =>
      offerings.filter(
        (offering) =>
          offering.countryCode.toUpperCase() === countryCode &&
          offering.serviceSlug.toLowerCase() === serviceSlug,
      ),
    [offerings, countryCode, serviceSlug],
  );

  const countryName = country?.name || countryCode;
  const countryFlag = country?.flag || "🌍";
  const serviceName = service?.name || serviceSlug;
  const serviceIcon = service?.icon || "◈";

  if (!loading && !catalogError && (!country || !service)) {
    return (
      <main className="min-h-screen bg-[#f5faf7] text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto min-h-screen max-w-5xl px-4 pb-28 sm:px-6">
          <Header />

          <section className="pt-8">
            <Link
              href="/market"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              ← Marketplace
            </Link>

            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-white/[0.04] sm:p-10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl dark:bg-white/10">
                🔎
              </div>

              <h1 className="mt-6 text-3xl font-black tracking-tight">
                Product not found
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                This country or service is not currently available in the
                NumberHub marketplace catalog.
              </p>

              <Link
                href="/market"
                className="mt-7 inline-flex rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
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
    <main className="min-h-screen bg-[#f5faf7] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto min-h-screen max-w-5xl px-4 pb-28 sm:px-6">
        <Header />

        <section className="pt-6 sm:pt-8">
          <Link
            href={`/market/${countryCode.toLowerCase()}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
          >
            ← Back to {countryName}
          </Link>

          <div className="relative mt-5 overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-[0_24px_80px_rgba(16,185,129,0.10)] dark:border-emerald-400/10 dark:bg-white/[0.04]">
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute -bottom-32 -left-24 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />

            <div className="relative p-6 sm:p-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] bg-emerald-50 text-3xl ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:ring-emerald-400/10">
                    {serviceIcon}
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {countryFlag} {countryName}
                      </span>

                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                        {serviceName}
                      </span>
                    </div>

                    <h1 className="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
                      {serviceName} numbers
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Select a verified marketplace product for {countryName}.
                      Pricing is displayed directly from the current
                      NumberHub catalog.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-400/10 dark:bg-emerald-400/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                    Marketplace
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {loading
                      ? "Checking..."
                      : `${serviceOfferings.length} option${serviceOfferings.length === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-2 border-t border-slate-100 pt-5 dark:border-white/10">
                <TrustItem icon="✓" label="Wallet secured" />
                <TrustItem icon="⚡" label="Fast processing" />
                <TrustItem icon="↻" label="Clear refund terms" />
              </div>
            </div>
          </div>
        </section>

        <section className="pt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                Available products
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight">
                Choose your option
              </h2>
            </div>

            {!loading && !catalogError && (
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10">
                {serviceOfferings.length} available
              </span>
            )}
          </div>

          {catalogError ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-6 dark:border-red-400/20 dark:bg-red-400/5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg shadow-sm dark:bg-white/10">
                !
              </div>

              <h3 className="mt-5 font-black">Marketplace unavailable</h3>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {catalogError}
              </p>
            </div>
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-64 animate-pulse rounded-[1.6rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]"
                />
              ))}
            </div>
          ) : serviceOfferings.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {serviceOfferings.map((offering) => {
                const price = getDisplayPrice(offering);

                return (
                  <article
                    key={offering.optionId}
                    className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_20px_55px_rgba(16,185,129,0.12)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-emerald-400/20"
                  >
                    {price.hasPromo && (
                      <div className="absolute right-4 top-4 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-500/20">
                        Special price
                      </div>
                    )}

                    <div className="flex items-start gap-3 pr-16">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-white/10">
                        {serviceIcon}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                          Product option
                        </p>

                        <h3 className="mt-1 text-lg font-black leading-6">
                          {offering.productOptionName}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        Your price
                      </p>

                      <div className="mt-1 flex items-end gap-2">
                        <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                          {formatMoney(price.minor, offering.currency)}
                        </span>

                        {price.hasPromo && (
                          <span className="mb-1 text-xs font-bold text-slate-400 line-through">
                            {formatMoney(
                              offering.priceMinor,
                              offering.currency,
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <InfoBox
                        label="Availability"
                        value="Available"
                        positive
                      />

                      <InfoBox
                        label="Refund"
                        value={
                          offering.refundEnabled
                            ? "Eligible"
                            : "Not eligible"
                        }
                      />
                    </div>

                    {offering.purchaseLimitPerCustomer && (
                      <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Limit: {offering.purchaseLimitPerCustomer} per
                        customer
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setPurchaseError("");
                        setSelectedOffering(offering);
                      }}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 active:scale-[0.99]"
                    >
                      Continue to purchase
                      <span aria-hidden="true">→</span>
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.6rem] border border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/5">
              <div className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg shadow-sm dark:bg-white/10">
                  ℹ️
                </div>

                <h3 className="mt-5 text-lg font-black">
                  No products available yet
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  NumberHub does not currently have a live supplier-backed{" "}
                  {serviceName} product for {countryName}. Products will
                  appear here when a verified supplier offering is connected.
                </p>

                <Link
                  href={`/market/${countryCode.toLowerCase()}`}
                  className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  Explore other services
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="pt-8">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                ✓
              </div>

              <div>
                <h3 className="text-sm font-black">
                  Transparent purchasing
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  NumberHub only creates a purchase through the real purchase
                  service. This page does not invent numbers, OTP codes,
                  supplier responses, wallet balances, or delivery results.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <BottomNav />

      {selectedOffering && (
        <PurchaseSheet
          offering={selectedOffering}
          countryName={countryName}
          countryFlag={countryFlag}
          serviceName={serviceName}
          serviceIcon={serviceIcon}
          purchasingId={purchasingId}
          purchaseError={purchaseError}
          onClose={() => {
            if (!purchasingId) {
              setSelectedOffering(null);
              setPurchaseError("");
            }
          }}
          onPurchase={async () => {
            if (!selectedOffering) return;

            setPurchasingId(selectedOffering.optionId);
            setPurchaseError("");

            try {
              const response = await fetch("/api/purchases", {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  productOptionId: selectedOffering.optionId,
                  idempotencyKey: crypto.randomUUID(),
                }),
              });

              const text = await response.text();

              let data: {
                success?: boolean;
                error?: string;
                purchase?: {
                  orderId?: string;
                };
              } = {};

              try {
                data = text ? JSON.parse(text) : {};
              } catch {
                throw new Error(
                  "The purchase service returned an invalid response.",
                );
              }

              if (response.status === 401) {
                router.push(
                  `/login?next=${encodeURIComponent(window.location.pathname)}`,
                );
                return;
              }

              if (!response.ok || !data.success) {
                throw new Error(
                  data.error || "Purchase could not be completed.",
                );
              }

              const orderId = data.purchase?.orderId;

              if (!orderId) {
                throw new Error(
                  "Purchase was created, but no order ID was returned.",
                );
              }

              setSelectedOffering(null);
              router.push(`/orders/${encodeURIComponent(orderId)}`);
            } catch (error) {
              setPurchaseError(
                error instanceof Error
                  ? error.message
                  : "Purchase could not be completed.",
              );
            } finally {
              setPurchasingId("");
            }
          }}
        />
      )}
    </main>
  );
}

function PurchaseSheet({
  offering,
  countryName,
  countryFlag,
  serviceName,
  serviceIcon,
  purchasingId,
  purchaseError,
  onClose,
  onPurchase,
}: {
  offering: Offering;
  countryName: string;
  countryFlag: string;
  serviceName: string;
  serviceIcon: string;
  purchasingId: string;
  purchaseError: string;
  onClose: () => void;
  onPurchase: () => void;
}) {
  const price = getDisplayPrice(offering);
  const isPurchasing = purchasingId === offering.optionId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-sheet-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPurchasing) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#0d1210] text-white shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:rounded-[2rem]">

        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-white/15" />
        </div>

        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Order review
            </p>
            <h2
              id="purchase-sheet-title"
              className="mt-1 text-xl font-black tracking-tight"
            >
              Confirm purchase
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPurchasing}
            aria-label="Close purchase confirmation"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-lg text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-5">

          <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="flex items-center gap-3">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10 text-2xl shadow-[0_8px_30px_rgba(53,208,127,.08)]">
                {serviceIcon}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{countryFlag}</span>
                  <span className="text-xs font-bold text-white/55">
                    {countryName}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="text-xs font-bold text-emerald-400">
                    {serviceName}
                  </span>
                </div>

                <p className="mt-1 truncate text-base font-black tracking-tight">
                  {offering.productOptionName}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-black/10">

            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">
                  Product
                </p>
                <p className="mt-1 text-sm font-bold text-white/80">
                  {offering.productOptionName}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between px-4 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">
                  Total
                </p>
                <p className="mt-1 text-xs text-white/40">
                  Charged from wallet
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-black tracking-tight text-emerald-400">
                  {formatMoney(price.minor, offering.currency)}
                </p>

                {price.hasPromo && (
                  <p className="mt-1 text-xs font-bold text-white/30 line-through">
                    {formatMoney(
                      offering.priceMinor,
                      offering.currency,
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-[1.25rem] border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-sm font-black text-emerald-400">
              ₦
            </div>

            <div>
              <p className="text-sm font-black text-white">
                Pay from your NumberHub wallet
              </p>
              <p className="mt-1 text-xs leading-5 text-white/45">
                Your wallet is charged when this purchase is successfully
                accepted. No deposit is required on this screen.
              </p>
            </div>
          </div>

          {purchaseError && (
            <div
              className="mt-4 rounded-[1.25rem] border border-red-400/20 bg-red-400/[0.07] p-4 text-sm font-bold leading-6 text-red-300"
              role="alert"
            >
              {purchaseError}
            </div>
          )}

          <button
            type="button"
            onClick={onPurchase}
            disabled={isPurchasing}
            className="nh-premium-button mt-5 flex w-full items-center justify-center gap-2 px-4 py-4 text-sm"
          >
            {isPurchasing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                Processing purchase...
              </>
            ) : (
              <>
                Pay from wallet
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>

          <p className="mt-3 px-3 text-center text-[10px] leading-5 text-white/30">
            By continuing, you confirm that you have reviewed this product
            and its applicable usage and refund terms.
          </p>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between border-b border-white/[0.07] py-4">
      <Link
        href="/market"
        className="flex items-center gap-3"
        aria-label="NumberHub marketplace"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-base font-black text-emerald-400">
          N
        </div>

        <div>
          <p className="text-base font-black tracking-tight text-white">
            NumberHub
          </p>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
            Digital connectivity
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/wallet"
          className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/70 transition hover:border-emerald-400/25 hover:text-emerald-400 sm:inline-flex"
        >
          Wallet
        </Link>

        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-white/60 transition hover:border-emerald-400/25 hover:text-emerald-400"
          aria-label="Profile"
        >
          ◉
        </Link>
      </div>
    </header>
  );
}

function BottomNav() {
  const items = [
    { href: "/dashboard", label: "Home", icon: "⌂" },
    { href: "/market", label: "Market", icon: "◈" },
    { href: "/orders", label: "Orders", icon: "▣" },
    { href: "/transactions", label: "Wallet", icon: "₦" },
    { href: "/profile", label: "Me", icon: "●" },
  ];

  return (
    <nav className="nh-bottom-nav fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto flex max-w-2xl items-center justify-around">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition ${
              item.label === "Market"
                ? "text-emerald-400"
                : "text-white/30 hover:text-white/70"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black ${
                item.label === "Market"
                  ? "bg-emerald-400/10"
                  : ""
              }`}
              aria-hidden="true"
            >
              {item.icon}
            </span>

            <span className="text-[10px] font-black">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

