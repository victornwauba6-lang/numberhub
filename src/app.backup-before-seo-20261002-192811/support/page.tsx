"use client";

import Link from "next/link";
import { useState } from "react";

const faqs = [
  {
    question: "How do I buy a number?",
    answer:
      "Open Marketplace, choose a country, search for the service you need, then select an available option. Review the details and complete the purchase using your NumberHub wallet.",
  },
  {
    question: "How do I fund my wallet?",
    answer:
      "Open Wallet and choose an available funding method. Once your wallet is funded, the balance can be used to purchase available products.",
  },
  {
    question: "Where can I find my purchased number?",
    answer:
      "Open Orders to view your purchases. Select an order to see its current status and the details available for that purchase.",
  },
  {
    question: "I didn't receive an SMS. What should I do?",
    answer:
      "Check the order status first. If the expected message does not arrive, contact support with your order details so the issue can be reviewed.",
  },
  {
    question: "My verification failed. What should I do?",
    answer:
      "Verification results depend on the destination service and the supplied number. Check the order first, then contact support if you believe something went wrong.",
  },
  {
    question: "How do refunds work?",
    answer:
      "Refund eligibility depends on the product, supplier response and order status. Contact support with the relevant order information for a review.",
  },
];

const safetyItems = [
  "Never share your NumberHub password.",
  "Never share account security codes with anyone claiming to be support.",
  "Use only the support channels displayed on this official page.",
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[#f4f7f5] text-[#0b1713]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">

        <header className="flex items-center justify-between">
          <Link
            href="/profile"
            className="group flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.07] bg-white shadow-[0_8px_30px_rgba(12,25,19,0.05)] transition hover:-translate-x-0.5"
            aria-label="Back to profile"
          >
            <span className="text-lg text-black/65 transition group-hover:text-black">
              ←
            </span>
          </Link>

          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-700">
              NumberHub
            </p>
            <p className="mt-0.5 text-xs font-semibold text-black/35">
              Support center
            </p>
          </div>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[32px] bg-[#0c1c16] px-6 py-8 shadow-[0_24px_70px_rgba(8,27,19,0.18)] sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.08] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-emerald-300/[0.05] blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-black text-emerald-300">
                ?
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                Customer care
              </span>
            </div>

            <h1 className="mt-7 max-w-xl text-[34px] font-black leading-[1.03] tracking-[-0.04em] text-white sm:text-5xl">
              Need a hand?
              <span className="block text-white/45">
                We&apos;re here to help.
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-6 text-white/55 sm:text-[15px]">
              Get quick answers or connect directly with NumberHub support for
              help with your account, wallet and orders.
            </p>

            <div className="mt-7 flex items-center gap-2 text-[11px] font-semibold text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Official NumberHub support
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
              Direct support
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">
              Talk to our team
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="https://t.me/numberhubsuppor"
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-[26px] border border-black/[0.06] bg-white p-5 shadow-[0_12px_38px_rgba(12,25,19,0.055)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(12,25,19,0.09)]"
            >
              <div className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f7f4] text-sm text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
                ↗
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-[#eaf6f1] text-[18px] font-black text-emerald-800">
                T
              </div>

              <p className="mt-6 text-base font-black tracking-tight">
                Telegram
              </p>
              <p className="mt-1 text-xs text-black/40">
                Chat directly with NumberHub support
              </p>

              <div className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <span>@numberhubsuppor</span>
                <span className="text-black/20">•</span>
                <span>Open chat</span>
              </div>
            </a>

            <a
              href="mailto:numberhubsupport@gmail.com"
              className="group relative overflow-hidden rounded-[26px] border border-black/[0.06] bg-white p-5 shadow-[0_12px_38px_rgba(12,25,19,0.055)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(12,25,19,0.09)]"
            >
              <div className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f7f4] text-sm text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
                ↗
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-[17px] bg-[#eaf6f1] text-[18px] font-black text-emerald-800">
                @
              </div>

              <p className="mt-6 text-base font-black tracking-tight">
                Email
              </p>
              <p className="mt-1 text-xs text-black/40">
                Send us the details of your issue
              </p>

              <div className="mt-5 truncate text-xs font-bold text-emerald-700">
                numberhubsupport@gmail.com
              </div>
            </a>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
              Knowledge base
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">
              Frequently asked
            </h2>
            <p className="mt-2 text-sm text-black/40">
              Quick answers to common NumberHub questions.
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_12px_38px_rgba(12,25,19,0.045)]">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  key={faq.question}
                  className={index ? "border-t border-black/[0.055]" : ""}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center gap-5 px-5 py-[18px] text-left sm:px-6"
                  >
                    <span className="flex-1 text-[13px] font-bold leading-5 text-black/80 sm:text-sm">
                      {faq.question}
                    </span>

                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2f5f3] text-black/40 transition duration-300 ${
                        isOpen ? "rotate-45 bg-emerald-50 text-emerald-700" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 pr-14 text-[13px] leading-6 text-black/50 sm:px-6 sm:pr-16">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_12px_38px_rgba(12,25,19,0.045)] sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef7f3] text-sm font-black text-emerald-800">
                #
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Orders & payments
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight">
                  Need help with a transaction?
                </h3>
                <p className="mt-2 text-sm leading-6 text-black/45">
                  When contacting support about a purchase, include the
                  relevant order details so the issue can be reviewed faster.
                </p>

                <Link
                  href="/orders"
                  className="mt-5 inline-flex items-center gap-2 text-xs font-black text-emerald-700"
                >
                  View your orders
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="rounded-[28px] border border-emerald-900/[0.07] bg-emerald-50/65 p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-sm font-black text-emerald-800">
                ✓
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Stay protected
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight">
                  Keep your account secure
                </h3>

                <div className="mt-4 space-y-2.5">
                  {safetyItems.map((item) => (
                    <div
                      key={item}
                      className="flex gap-2.5 text-[13px] leading-5 text-black/50"
                    >
                      <span className="mt-0.5 font-black text-emerald-700">
                        •
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-10 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-black/25">
          NumberHub · Digital connectivity marketplace
        </p>
      </div>
    </main>
  );
}
