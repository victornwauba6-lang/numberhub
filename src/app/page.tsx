"use client";

import Link from "next/link";
import { useState } from "react";
import NumberHubAI from "@/components/numberhub-ai";

const destinations = [
  {
    flag: "🇺🇸",
    name: "United States",
    description: "Verification numbers for supported services.",
    href: "/market/us",
  },
  {
    flag: "🇬🇧",
    name: "United Kingdom",
    description: "UK numbers for supported verification services.",
    href: "/market/gb",
  },
  {
    flag: "🇨🇦",
    name: "Canada",
    description: "Canadian numbers for supported services.",
    href: "/market/ca",
  },
  {
    flag: "🇩🇪",
    name: "Germany",
    description: "German numbers for supported services.",
    href: "/market/de",
  },
];

const publicPromoServices = [
  { slug: "whatsapp", name: "WhatsApp", icon: "💬", price: "₦50" },
  { slug: "telegram", name: "Telegram", icon: "✈️", price: "₦100" },
  { slug: "facebook", name: "Facebook", icon: "f", price: "₦150" },
  { slug: "tiktok", name: "TikTok", icon: "♪", price: "₦200" },
  { slug: "instagram", name: "Instagram", icon: "◎", price: "₦250" },
  { slug: "google", name: "Google", icon: "G", price: "₦300" },
  { slug: "twitter", name: "X / Twitter", icon: "𝕏", price: "₦500" },
];

const categories = [
  {
    icon: "01",
    title: "Verification Numbers",
    description: "Virtual numbers for supported verification use cases.",
  },
  {
    icon: "02",
    title: "SMS",
    description: "Explore SMS-based connectivity products as they become available.",
  },
  {
    icon: "03",
    title: "eSIM",
    description: "Digital connectivity for travel and everyday use.",
    comingSoon: true,
  },
  {
    icon: "04",
    title: "Mobile Data",
    description: "Flexible digital data products from supported providers.",
    comingSoon: true,
  },
];

const steps = [
  {
    number: "01",
    title: "Choose a destination",
    description: "Select a country and the service you need.",
  },
  {
    number: "02",
    title: "Explore products",
    description: "View available products and current pricing.",
  },
  {
    number: "03",
    title: "Fund your wallet",
    description: "Add funds securely when you are ready to purchase.",
  },
  {
    number: "04",
    title: "Purchase & track",
    description: "Complete your order and follow its status.",
  },
];

export default function HomePage() {
  const [selectedPromoCountry, setSelectedPromoCountry] = useState("");
  const [selectedPromoService, setSelectedPromoService] = useState("");

  const promoCountries = [
    { code: "US", flag: "🇺🇸", name: "United States", href: "/market/us" },
    { code: "GB", flag: "🇬🇧", name: "United Kingdom", href: "/market/gb" },
    { code: "CA", flag: "🇨🇦", name: "Canada", href: "/market/ca" },
  ];

  const selectedCountry = promoCountries.find(
    (country) => country.code === selectedPromoCountry
  );

  const selectedPromo = publicPromoServices.find(
    (service) => service.slug === selectedPromoService
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-950 dark:bg-[#06100c] dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-2xl dark:border-white/[0.07] dark:bg-[#06100c]/85">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] shadow-lg shadow-emerald-500/10">
              <img
                src="/brand/numberhub-symbol.svg"
                alt="NumberHub"
                className="h-full w-full object-cover"
              />
            </span>
            <div>
              <div className="text-[15px] font-black tracking-tight">NumberHub</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Global connectivity
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex dark:text-slate-300">
            <Link href="/market" className="transition hover:text-emerald-600">
              Marketplace
            </Link>
            <a href="#how-it-works" className="transition hover:text-emerald-600">
              How it works
            </a>
            <a href="#support" className="transition hover:text-emerald-600">
              Support
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/login"
              className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-300/20 blur-[110px] dark:bg-emerald-500/[0.08]" />
        <div className="absolute -right-40 top-32 h-80 w-80 rounded-full bg-teal-200/30 blur-[100px] dark:bg-teal-500/[0.05]" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
              Digital connectivity marketplace
            </div>

            <h1 className="max-w-3xl text-[3.2rem] font-black leading-[0.95] tracking-[-0.065em] sm:text-6xl lg:text-[5.2rem]">
              Global connectivity.
              <span className="mt-2 block bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Made simple.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-[15px] leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
              Find digital connectivity products by country and service,
              purchase securely and manage everything from one account.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                Explore marketplace
                <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
              </Link>

              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
              >
                Create free account
              </Link>
            </div>

            <p className="mt-4 text-[11px] font-medium leading-5 text-slate-400">
              Prices and availability may vary by country, service and live supplier availability.
            </p>

            <div className="mt-9 flex items-center gap-5 border-t border-slate-200/80 pt-7 dark:border-white/[0.08]">
              <div>
                <div className="text-2xl font-black tracking-tight">Trusted digital connectivity</div>
                <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Fast, secure access when you need it.
                </div>
              </div>

              <div className="h-10 w-px bg-slate-200 dark:bg-white/10" />

              <div className="max-w-[230px] text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
                
              </div>
            </div>
          </div>

          {/* Product preview */}
          <div className="relative mx-auto w-full max-w-[500px] lg:ml-auto">
            <div className="absolute -inset-5 rounded-[3rem] bg-emerald-400/[0.07] blur-2xl" />

            <div className="relative rounded-[2rem] border border-slate-200/80 bg-white/90 p-2 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/[0.09] dark:bg-white/[0.035] dark:shadow-black/30">
              <div className="overflow-hidden rounded-[1.55rem] bg-[#08120f] p-5 text-white sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-xs font-black">
                      N
                    </span>
                    <span className="text-sm font-black">NumberHub</span>
                  </div>

                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                    Marketplace
                  </span>
                </div>

                <div className="mt-12">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Explore connectivity
                  </div>
                  <div className="mt-2 max-w-xs text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                    {selectedPromoService
                      ? "Your public offer."
                      : selectedPromoCountry
                        ? "Choose a service."
                        : "Choose your destination."}
                  </div>
                  <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
                    {selectedPromoService
                      ? "Promotional public price. Actual marketplace availability and pricing may vary by country, service, and live availability."
                      : selectedPromoCountry
                        ? `See promotional pricing for ${selectedCountry?.name || "this destination"}.`
                        : "Select a country first, then choose the service you need."}
                  </p>
                </div>

                {!selectedPromoCountry && (
                  <div className="mt-7 space-y-2.5">
                    {promoCountries.map((destination) => (
                      <button
                        key={destination.code}
                        type="button"
                        onClick={() => {
                          setSelectedPromoCountry(destination.code);
                          setSelectedPromoService("");
                        }}
                        className="group flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3.5 text-left transition hover:border-emerald-400/20 hover:bg-white/[0.08]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-xl">
                            {destination.flag}
                          </span>
                          <div>
                            <div className="text-sm font-bold">{destination.name}</div>
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              Choose country
                            </div>
                          </div>
                        </div>
                        <span className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-400">
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedPromoCountry && !selectedPromoService && (
                  <div className="mt-7">
                    <button
                      type="button"
                      onClick={() => setSelectedPromoCountry("")}
                      className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 transition hover:text-emerald-400"
                    >
                      ← Change country
                    </button>

                    <div className="grid grid-cols-2 gap-2.5">
                      {publicPromoServices.map((service) => (
                        <button
                          key={service.slug}
                          type="button"
                          onClick={() => setSelectedPromoService(service.slug)}
                          className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3 text-left transition hover:border-emerald-400/25 hover:bg-white/[0.08]"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-black text-white/75">
                            {service.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">
                              {service.name}
                            </span>
                            <span className="mt-0.5 block text-[9px] font-semibold text-slate-500">
                              View offer
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPromoCountry && selectedPromoService && selectedPromo && (
                  <div className="mt-7">
                    <button
                      type="button"
                      onClick={() => setSelectedPromoService("")}
                      className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 transition hover:text-emerald-400"
                    >
                      ← Change service
                    </button>

                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.055] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.07] text-base font-black">
                            {selectedPromo.icon}
                          </span>
                          <div>
                            <div className="text-sm font-black">
                              {selectedPromo.name}
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              {selectedCountry?.flag} {selectedCountry?.name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-black tracking-tight text-emerald-300">
                            {selectedPromo.price}
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300/50">
                            public promo
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-white/[0.07] pt-3">
                        <p className="text-[10px] leading-5 text-slate-400">
                          Resellers can get special pricing. Contact support for reseller rates.
                        </p>

                        <Link
                          href={selectedCountry?.href || "/market"}
                          className="mt-3 flex items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black text-[#06100c] transition hover:bg-emerald-300"
                        >
                          Sign in to continue →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                  <span className="text-[10px] font-semibold text-slate-500">
                    Built for mobile
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400">
                    {selectedPromoService ? "Public offer" : "Explore →"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-y border-slate-200/80 bg-slate-50/70 dark:border-white/[0.07] dark:bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-px px-5 py-5 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Simple experience", "Find what you need without unnecessary steps."],
            ["02", "Wallet-powered", "Keep your purchasing balance in one place."],
            ["03", "Multiple destinations", "Explore products across supported countries."],
            ["04", "Mobile-first", "Designed around the way you use your phone."],
          ].map(([number, title, description]) => (
            <div
              key={number}
              className="rounded-2xl p-5 transition hover:bg-white dark:hover:bg-white/[0.035]"
            >
              <div className="text-[10px] font-black tracking-[0.18em] text-emerald-600">
                {number}
              </div>
              <h2 className="mt-3 text-sm font-black">{title}</h2>
              <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-y border-slate-200/80 bg-slate-50/70 dark:border-white/[0.07] dark:bg-white/[0.018]"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              How it works
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              From search to purchase in a few simple steps.
            </h2>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative rounded-[1.5rem] border border-slate-200 bg-white p-6 dark:border-white/[0.08] dark:bg-white/[0.025]"
              >
                {index < steps.length - 1 && (
                  <div className="absolute right-[-17px] top-1/2 z-10 hidden text-slate-300 lg:block dark:text-slate-700">
                    →
                  </div>
                )}

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {step.number}
                </div>

                <h3 className="mt-6 text-sm font-black">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secure & transparent */}
      <section className="border-b border-slate-200/80 bg-white dark:border-white/[0.07] dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              Secure & transparent
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Clear, simple and transparent.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Know what you are paying for, keep track of your balance and follow
              your orders from one account.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <div className="text-sm font-black">Clear pricing</div>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                See the applicable price before completing a purchase.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <div className="text-sm font-black">Wallet records</div>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Keep track of your available balance and transaction history.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 dark:border-white/[0.07] dark:bg-white/[0.025]">
              <div className="text-sm font-black">Order visibility</div>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Follow your purchases and order status from your account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
            Connectivity
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            More than numbers.
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            NumberHub is being built as a broader digital connectivity marketplace.
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <div
              key={category.title}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.025]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-[0.18em] text-emerald-600">
                  {category.icon}
                </span>

                {category.comingSoon && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                    Coming soon
                  </span>
                )}
              </div>

              <h3 className="mt-8 text-sm font-black">{category.title}</h3>

              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {category.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* WhatsApp Channel */}
      <section className="px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-6 py-10 shadow-[0_20px_70px_rgba(16,185,129,0.08)] dark:border-emerald-900/40 dark:from-[#071710] dark:via-[#08120f] dark:to-[#06100c] sm:px-10 sm:py-12">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/15 blur-[90px] dark:bg-emerald-500/10" />

          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 fill-current"
                  aria-hidden="true"
                >
                  <path d="M12 2a9.9 9.9 0 0 0-8.57 14.87L2 22l5.31-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.07-1.11l-.29-.17-3.15.83.84-3.06-.19-.3A8 8 0 1 1 12 20Zm4.38-5.99c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
                </svg>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  NumberHub Updates
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950 dark:text-white sm:text-3xl">
                  Stay connected with NumberHub.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Get product updates, availability announcements and important
                  platform news directly through our WhatsApp Channel.
                </p>
              </div>
            </div>

            <a
              href="https://whatsapp.com/channel/0029VbDRxIfD38CSw1z02m3H"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              Join WhatsApp Channel
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="support"
   className="border-t border-slate-200 dark:border-white/[0.07]"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white">
                N
              </span>
              <span className="text-sm font-black">NumberHub</span>
            </div>
            <p className="mt-3 max-w-sm text-xs leading-5 text-slate-400">
              A digital connectivity marketplace for supported products and destinations.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <a href="mailto:numberhubsupport@gmail.com" className="hover:text-emerald-600">
              Support
            </a>
            <Link href="/terms" className="hover:text-emerald-600">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-emerald-600">
              Privacy
            </Link>
            <Link href="/refunds" className="hover:text-emerald-600">
              Refunds & Cancellation
            </Link>
            <Link href="/acceptable-use" className="hover:text-emerald-600">
              Acceptable Use
            </Link>
            <Link href="/market" className="hover:text-emerald-600">
              Marketplace
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-6 dark:border-white/[0.05]">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-slate-600 dark:text-slate-300">NUMBERBRIDGE TECHNOLOGIES</p>
              <p className="mt-1">Digital Connectivity Marketplace · Telecommunications · Nigeria</p>
            </div>
            <a
              href="mailto:numberhubsupport@gmail.com"
              className="font-semibold hover:text-emerald-600"
            >
              numberhubsupport@gmail.com
            </a>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-5 text-center text-[10px] font-medium text-slate-400 dark:border-white/[0.05]">
          © {new Date().getFullYear()} NumberHub. All rights reserved.
        </div>
      </footer>

      <NumberHubAI />
    </main>
  );
}
