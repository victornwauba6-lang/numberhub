"use client";

import { useRouter } from "next/navigation";

export default function EmailVerificationPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060908] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-36 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/[0.10] blur-[100px]" />
        <div className="absolute right-[-120px] top-[420px] h-64 w-64 rounded-full bg-teal-400/[0.06] blur-[90px]" />
        <div className="absolute bottom-20 left-[-120px] h-64 w-64 rounded-full bg-emerald-700/[0.08] blur-[100px]" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-2xl px-5 pb-16 sm:px-6">
        <header className="flex items-center justify-between border-b border-white/[0.06] py-5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-2.5 text-xs font-bold text-white/70 transition hover:border-emerald-400/30 hover:text-white"
          >
            <span className="text-base" aria-hidden="true">←</span>
            Back
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2.5"
          >
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] border border-emerald-300/20 bg-gradient-to-br from-emerald-400 to-emerald-700 text-sm font-black text-[#04120b] shadow-[0_5px_25px_rgba(16,185,129,0.14)]">
              N
            </span>
            <span className="text-left">
              <span className="block text-sm font-black tracking-tight">
                NumberHub
              </span>
              <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.17em] text-white/35">
                Digital services
              </span>
            </span>
          </button>
        </header>

        <section className="pt-9 sm:pt-12">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
              Email solutions
            </p>
          </div>

          <div className="relative mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[34px] font-black leading-[1.08] tracking-[-0.045em] sm:text-[42px]">
                Email
                <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  Verification.
                </span>
              </h1>
              <p className="mt-4 max-w-sm text-[13px] leading-6 text-white/50 sm:text-sm">
                Your next-generation workspace for email verification.
                A cleaner way to organize requests, inboxes and verification activity.
              </p>
            </div>

            <div className="relative mt-1 flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[25px] border border-emerald-300/20 bg-gradient-to-br from-emerald-400/[0.16] to-emerald-900/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-[88px] sm:w-[88px]">
              <div className="absolute inset-2 rounded-[19px] border border-white/[0.04]" />
              <svg
                viewBox="0 0 48 48"
                className="relative h-10 w-10 text-emerald-300 sm:h-12 sm:w-12"
                fill="none"
                aria-hidden="true"
              >
                <rect x="7" y="12" width="34" height="25" rx="5" stroke="currentColor" strokeWidth="2" />
                <path d="m9 16 15 11 15-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5" />
              </svg>
            </div>
          </div>

          <div className="relative mt-7 flex items-center gap-3 overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-r from-emerald-400/[0.09] via-emerald-400/[0.035] to-transparent px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 3 19 6v5c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V6l7-3Z" strokeLinejoin="round" />
                <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-emerald-100">
                Your email workspace is taking shape
              </p>
              <p className="mt-1 text-[11px] leading-4 text-white/40">
                A premium experience is in development. Purchases are not available yet.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
              Preview
            </span>
          </div>
        </section>

        <section className="relative mt-7 overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-b from-[#101713] via-[#0b100e] to-[#080b09] shadow-[0_24px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl">
          <div className="border-b border-white/[0.07] bg-white/[0.012] px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/80">
                  Get started
                </p>
                <h2 className="mt-2 text-lg font-black tracking-tight">
                  Create a verification request
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-white/40">
                  Choose your preferred service and email domain.
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-white/50">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z" />
                  <path d="M8 8h8M8 12h8M8 16h4" strokeLinecap="round" />
                </svg>
              </span>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <div>
              <label className="mb-2.5 block text-xs font-bold text-white/75">
                Target website
              </label>
              <div className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/[0.09] bg-black/25 px-4 transition">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.045] text-white/45">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
                  </svg>
                </span>
                <span className="flex-1 text-[13px] text-white/35">
                  Select a website
                </span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/30" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <div>
              <label className="mb-2.5 block text-xs font-bold text-white/75">
                Email domain
              </label>
              <div className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/[0.09] bg-black/25 px-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.045] text-white/45">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="flex-1 text-[13px] text-white/35">
                  Available domains will appear here
                </span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/30" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/[0.08] text-emerald-300">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                    <path d="M12 3v18M17 7.5c0-1.7-2-2.5-5-2.5s-5 1-5 3 2 3 5 4 5 2 5 4-2 3-5 3-5-.8-5-2.5" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white/80">
                    Clear pricing, before purchase
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-white/40">
                    Pricing and availability will be shown when the supplier is connected.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="flex min-h-[58px] w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-2xl border border-emerald-300/15 bg-gradient-to-r from-emerald-400/[0.16] via-emerald-400/[0.10] to-teal-400/[0.07] px-5 py-4 text-sm font-black tracking-tight text-emerald-100/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              Email service coming soon
              <span aria-hidden="true">→</span>
            </button>

            <p className="px-2 text-center text-[10px] leading-5 text-white/30">
              Email purchases and inbox access will be enabled after the supplier integration is tested.
            </p>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="group rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.035] to-white/[0.012] p-4 transition duration-300 hover:border-emerald-300/20 hover:from-emerald-400/[0.045] sm:p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/50">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z" />
                <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="mt-4 text-xs font-black">Verification inbox</h3>
            <p className="mt-1.5 text-[11px] leading-5 text-white/40">
              View received messages when available.
            </p>
          </div>

          <div className="group rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.035] to-white/[0.012] p-4 transition duration-300 hover:border-emerald-300/20 hover:from-emerald-400/[0.045] sm:p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/50">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="mt-4 text-xs font-black">Request history</h3>
            <p className="mt-1.5 text-[11px] leading-5 text-white/40">
              Keep track of your email requests.
            </p>
          </div>
        </section>

        <footer className="mt-9 border-t border-white/[0.06] pt-6 text-center">
          <p className="text-[10px] font-bold tracking-wide text-white/30">
            NUMBERHUB <span className="mx-1.5 text-emerald-400/60">·</span> EMAIL VERIFICATION
          </p>
          <p className="mt-2 text-[10px] text-white/20">
            A new service experience, coming soon.
          </p>
        </footer>
      </div>
    </main>
  );
}
