"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Country = {
  code: string;
  name: string;
};

type Service = {
  slug: string;
  name: string;
};

type SyncResult = {
  country: string;
  service: string;
  productId: string;
  createdOptions: number;
  updatedOptions: number;
  unavailableOptions: number;
  skippedOptions: number;
  optionIds: string[];
};

type FullSyncResult = {
  discoveredCountries: number;
  discoveredServices: number;
  discoveredPairs: number;
  createdCountries: number;
  existingCountries: number;
  skippedCountries: number;
  createdServices: number;
  existingServices: number;
  createdProducts: number;
  existingProducts: number;
  skippedPairs: number;
  unresolvedCountries: string[];
};

type PricingOption = {
  optionId: string;
  supplier: string;
  supplierOption: string;
  cost: number | null;
  currency: string;
  customerPriceNgn: number | null;
  pricingSource: "manual_override" | "automatic_rule" | "unpriced";
  available: boolean;
  stock: number | null;
};

export default function AdminCatalogPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [country, setCountry] = useState("");
  const [service, setService] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SyncResult | null>(null);
  const [fullSyncResult, setFullSyncResult] =
    useState<FullSyncResult | null>(null);
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState<string | null>(null);
  const [pricingPrices, setPricingPrices] =
    useState<Record<string, string>>({});
  const [pricingMessage, setPricingMessage] = useState("");
  const [pricingCountry, setPricingCountry] = useState("");
  const [pricingService, setPricingService] = useState("");

  useEffect(() => {
    async function loadOptions() {
      try {
        const response = await fetch(
          "/api/admin/catalog/options",
          { cache: "no-store" },
        );

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (response.status === 403) {
          setError("You do not have permission to manage the catalog.");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load catalog options.");
        }

        const data = await response.json();

        setCountries(data.countries || []);
        setServices(data.services || []);

        if (data.countries?.[0]) {
          setCountry(data.countries[0].code.toLowerCase());
        }

        if (data.services?.[0]) {
          setService(data.services[0].slug);
        }

        if (data.countries?.[0]) {
          setPricingCountry(data.countries[0].code.toLowerCase());
        }

        const pricingDefaultService =
          data.services?.find(
            (item: Service) => item.slug.toLowerCase() === "whatsapp",
          ) ?? data.services?.[0];

        if (pricingDefaultService) {
          setPricingService(pricingDefaultService.slug);
        }
      } catch {
        setError("Unable to load catalog options right now.");
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, []);

  async function syncCatalog() {
    if (!country || !service) {
      setError("Select a country and service first.");
      return;
    }

    setSyncing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/admin/catalog/materialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            country,
            service,
          }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (response.status === 403) {
        setError("You do not have permission to sync the catalog.");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Catalog synchronization failed.",
        );
      }

      setResult(data.result);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Catalog synchronization failed.",
      );
    } finally {
      setSyncing(false);
    }
  }

  async function loadPricingOptions() {
    if (!pricingCountry || !pricingService) {
      setPricingOptions([]);
      return;
    }

    setPricingLoading(true);
    setPricingMessage("");

    try {
      const response = await fetch(
        `/api/catalog/live?country=${encodeURIComponent(
          pricingCountry,
        )}&service=${encodeURIComponent(pricingService)}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load live pricing.",
        );
      }

      const options: PricingOption[] = (data.options || []).map(
        (option: PricingOption) => option,
      );

      setPricingOptions(options);

      setPricingPrices((current) => {
        const next = { ...current };

        for (const option of options) {
          if (
            next[option.optionId] === undefined &&
            option.customerPriceNgn !== null
          ) {
            next[option.optionId] = String(
              option.customerPriceNgn,
            );
          }
        }

        return next;
      });
    } catch (pricingError) {
      setPricingOptions([]);
      setPricingMessage(
        pricingError instanceof Error
          ? pricingError.message
          : "Unable to load live pricing.",
      );
    } finally {
      setPricingLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && country && service) {
      loadPricingOptions();
    }
  }, [loading, pricingCountry, pricingService]);

  async function saveDynamicPrice(option: PricingOption) {
    const value = pricingPrices[option.optionId] ?? "";
    const customerPriceNgn = Number(value);

    if (!Number.isFinite(customerPriceNgn) || customerPriceNgn <= 0) {
      setPricingMessage(
        "Enter a customer price greater than zero.",
      );
      return;
    }

    setPricingSaving(option.optionId);
    setPricingMessage("");

    try {
      const response = await fetch(
        "/api/admin/pricing/dynamic",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            country: pricingCountry,
            service: pricingService,
            supplier: option.supplier,
            supplierOption: option.supplierOption,
            customerPriceNgn,
          }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (response.status === 403) {
        setPricingMessage(
          "You do not have permission to manage pricing.",
        );
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to save pricing.",
        );
      }

      setPricingMessage(
        `${option.supplierOption} saved at ₦${Number(
          data.customerPriceNgn,
        ).toLocaleString("en-NG")} with a ${Number(
          data.multiplier,
        ).toFixed(2)}× supplier-cost relationship.`,
      );

      await loadPricingOptions();
    } catch (pricingError) {
      setPricingMessage(
        pricingError instanceof Error
          ? pricingError.message
          : "Unable to save pricing.",
      );
    } finally {
      setPricingSaving(null);
    }
  }

  async function syncAllCatalog() {
    setSyncing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/admin/catalog/materialize-all",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (response.status === 403) {
        setError("You do not have permission to sync the catalog.");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "All catalog synchronization failed.",
        );
      }

      setError("");
      setFullSyncResult(data.result);
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "All catalog synchronization failed.",
      );
    } finally {
      setSyncing(false);
    }
  }

  async function repairCatalogSchema() {
    setError("");

    try {
      const response = await fetch("/api/admin/fix-catalog-schema", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Catalog schema repair failed.");
      }

      alert("Catalog schema repaired successfully.");
    } catch (repairError) {
      setError(
        repairError instanceof Error
          ? repairError.message
          : "Catalog schema repair failed.",
      );
    }
  }

  return (
    <>
    <main className="min-h-screen bg-[#f3f7f5] text-[#10231a]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
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
                Live catalog management
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                Supplier Catalog
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                Sync real supplier availability and configured customer
                prices into the trusted NumberHub catalog.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-[26px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)] sm:p-6">
          <div>
            <p className="text-sm font-bold text-[#10231a]">
              Synchronize an offering
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              This reads the live supplier catalog. It does not purchase
              numbers or debit customer wallets.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Country
              </span>

              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                disabled={loading || syncing}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8faf9] px-4 py-3.5 text-sm font-semibold text-[#10231a] outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
              >
                {countries.map((item) => (
                  <option
                    key={item.code}
                    value={item.code.toLowerCase()}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Service
              </span>

              <select
                value={service}
                onChange={(event) => setService(event.target.value)}
                disabled={loading || syncing}
                className="w-full rounded-2xl border border-slate-200 bg-[#f8faf9] px-4 py-3.5 text-sm font-semibold text-[#10231a] outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
              >
                {services.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={syncCatalog}
            disabled={
              loading ||
              syncing ||
              !country ||
              !service
            }
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#087443] px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(8,116,67,0.20)] transition hover:bg-[#066239] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncing ? "Synchronizing live catalog..." : "Sync live catalog"}
          </button>

          <button
            type="button"
            onClick={syncAllCatalog}
            disabled={loading || syncing}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-[#087443] bg-white px-5 py-3.5 text-sm font-extrabold text-[#087443] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncing
              ? "Synchronizing all..."
              : "Sync all catalog"}
          </button>

          <button
            type="button"
            onClick={repairCatalogSchema}
            disabled={syncing}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-amber-500 bg-amber-50 px-5 py-3.5 text-sm font-extrabold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Repair catalog schema
          </button>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-5 overflow-hidden rounded-[26px] border border-black/[0.06] bg-white shadow-[0_10px_35px_rgba(16,35,26,0.05)]">
          <div className="border-b border-black/[0.05] bg-gradient-to-br from-[#062d1d] to-[#0a5637] p-5 text-white sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Dynamic pricing
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.03em]">
                  Pricing Management
                </h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-white/60 sm:text-sm">
                  Set a customer price while NumberHub keeps the supplier-cost
                  relationship. If the supplier price changes later, the
                  customer price changes automatically.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-300/15 bg-white/5 px-3 py-2 text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">
                  Mode
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-200">
                  Supplier-linked
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ["us", "🇺🇸 United States"],
                ["ca", "🇨🇦 Canada"],
                ["gb", "🇬🇧 United Kingdom"],
                ["ph", "🇵🇭 Philippines"],
              ].map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPricingCountry(code)}
                  disabled={loading || syncing || pricingLoading}
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                    pricingCountry === code
                      ? "border-emerald-300 bg-emerald-300 text-[#062d1d]"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["whatsapp", "WhatsApp"],
                ["telegram", "Telegram"],
                ["tiktok", "TikTok"],
                ["instagram", "Instagram"],
                ["facebook", "Facebook"],
              ].map(([slug, label]) => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setPricingService(slug)}
                  disabled={loading || syncing || pricingLoading}
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                    pricingService === slug
                      ? "border-white bg-white text-[#062d1d]"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {pricingMessage && (
              <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                {pricingMessage}
              </div>
            )}

            {pricingLoading ? (
              <div className="rounded-2xl border border-slate-100 bg-[#f8faf9] p-8 text-center">
                <p className="text-sm font-bold text-slate-600">
                  Loading live supplier pricing...
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Reading the current supplier catalog for this offering.
                </p>
              </div>
            ) : pricingOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-[#f8faf9] p-8 text-center">
                <p className="text-sm font-bold text-slate-600">
                  No supplier options available
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Try another country or service, or synchronize the catalog
                  first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pricingOptions.map((option) => (
                  <div
                    key={option.optionId}
                    className="rounded-[22px] border border-slate-100 bg-[#fbfcfb] p-4 transition hover:border-emerald-100 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold text-[#10231a]">
                            {option.supplierOption}
                          </h3>

                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
                            {option.supplier}
                          </span>

                          <span
                            className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                              option.pricingSource === "manual_override"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {option.pricingSource === "manual_override"
                              ? "Dynamic"
                              : "Automatic"}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          Supplier cost:{" "}
                          <span className="font-bold text-slate-700">
                            {option.cost === null
                              ? "Unavailable"
                              : `${option.currency} ${option.cost}`}
                          </span>
                          {option.stock !== null && (
                            <>
                              {" · "}Stock{" "}
                              <span className="font-bold text-slate-700">
                                {option.stock.toLocaleString()}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ${
                          option.available
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {option.available ? "Available" : "Unavailable"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <div className="rounded-2xl bg-white p-3 ring-1 ring-black/[0.04]">
                        <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                          Current customer price
                        </p>
                        <p className="mt-1 text-base font-extrabold text-[#10231a]">
                          {option.customerPriceNgn === null
                            ? "Unpriced"
                            : `₦${option.customerPriceNgn.toLocaleString(
                                "en-NG",
                              )}`}
                        </p>
                      </div>

                      <label className="block">
                        <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                          Set customer price
                        </span>
                        <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10">
                          <span className="flex items-center px-3 text-sm font-bold text-slate-400">
                            ₦
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="100"
                            value={pricingPrices[option.optionId] ?? ""}
                            onChange={(event) =>
                              setPricingPrices((current) => ({
                                ...current,
                                [option.optionId]: event.target.value,
                              }))
                            }
                            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm font-bold text-[#10231a] outline-none"
                            placeholder="1500"
                          />
                        </div>
                      </label>

                      <button
                        type="button"
                        onClick={() => saveDynamicPrice(option)}
                        disabled={
                          pricingSaving === option.optionId ||
                          option.cost === null ||
                          !option.available
                        }
                        className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-[#087443] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(8,116,67,0.18)] transition hover:bg-[#066239] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pricingSaving === option.optionId
                          ? "Saving..."
                          : "Save price"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {result && (
          <section className="mt-5 rounded-[26px] border border-emerald-100 bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">
                  Sync completed
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {result.country.toUpperCase()} · {result.service}
                </h2>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                Database updated
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-[#f8faf9] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Created
                </p>
                <p className="mt-2 text-2xl font-extrabold">
                  {result.createdOptions}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8faf9] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Updated
                </p>
                <p className="mt-2 text-2xl font-extrabold">
                  {result.updatedOptions}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8faf9] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Unavailable
                </p>
                <p className="mt-2 text-2xl font-extrabold">
                  {result.unavailableOptions}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8faf9] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Skipped
                </p>
                <p className="mt-2 text-2xl font-extrabold">
                  {result.skippedOptions}
                </p>
              </div>
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-black/[0.06] pt-6 text-center text-xs text-slate-400">
          NumberHub Administration · Live catalog management
        </footer>
      </div>
    </main>
    </>

  );
}
