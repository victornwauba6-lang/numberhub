"use client";

import Link from "next/link";
import { useState } from "react";

export default function CanadaWhatsAppPage() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <main className="min-h-screen bg-[#f6faf8] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto min-h-screen max-w-3xl px-4 pb-28 sm:px-6">
        <header className="sticky top-0 z-20 -mx-4 border-b border-slate-200/80 bg-[#f6faf8]/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/market/ca" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 font-black text-white shadow-lg shadow-emerald-500/20">
                N
              </div>

              <div>
                <p className="text-sm font-black tracking-tight">NumberHub</p>
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
            href="/market/ca"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
          >
            ← Canada
          </Link>

          <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04]">
            <div className="relative overflow-hidden border-b border-slate-100 p-6 dark:border-white/10 sm:p-8">
              <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                      🇨🇦 Canada
                    </div>

                    <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                      WhatsApp verification number
                    </h1>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      A Canadian virtual number intended for supported WhatsApp
                      verification use cases.
                    </p>
                  </div>

                  <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl dark:bg-emerald-400/10 sm:flex">
                    ◉
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Country
                    </p>
                    <p className="mt-1 font-black">Canada 🇨🇦</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Service
                    </p>
                    <p className="mt-1 font-black">WhatsApp</p>
                  </div>

                  <div className="col-span-2 rounded-2xl bg-slate-50 p-4 dark:bg-white/5 sm:col-span-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Delivery
                    </p>
                    <p className="mt-1 font-black">Live supplier required</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-400/5">
                <div className="flex gap-3">
                  <div className="text-xl">ℹ️</div>

                  <div>
                    <h2 className="font-black">Product not yet available</h2>

                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      NumberHub is currently waiting for a connected supplier
                      to provide live Canadian WhatsApp numbers. We will not
                      display invented prices, stock levels, or delivery
                      information.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-emerald-400/30"
                >
                  <span className="font-black">How this product will work</span>
                  <span className="text-slate-400">
                    {showInfo ? "−" : "+"}
                  </span>
                </button>

                {showInfo && (
                  <div className="mt-2 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    <p>
                      Once a supported supplier is connected, NumberHub will
                      receive live product information, pricing and availability.
                    </p>

                    <p className="mt-3">
                      After a successful purchase, the system will create an
                      order, debit the customer wallet and display the supplier
                      delivery details when they are actually received.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-2xl bg-slate-200 px-5 py-4 text-sm font-black text-slate-500 dark:bg-white/10 dark:text-slate-500"
              >
                Currently unavailable
              </button>

              <Link
                href="/market/ca"
                className="mt-3 flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-4 text-sm font-black text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-white/10 dark:text-slate-200 dark:hover:border-emerald-400/30 dark:hover:text-emerald-400"
              >
                Explore other Canada services
              </Link>
            </div>
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2">
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
    </main>
  );
}
