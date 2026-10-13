"use client";

import { useState } from "react";

const orders = [
  {
    id: "e23b54cc-4ffb-46ab-a5e3-4e502faf835f",
    country: "Austria",
    code: "AT",
    service: "Facebook",
  },
  {
    id: "d0dbcba2-b917-46d8-9570-d294b5e2cf8f",
    country: "Canada",
    code: "CA",
    service: "Facebook",
  },
  {
    id: "88c0043b-5795-467b-9ae8-4de67f28ef30",
    country: "Philippines",
    code: "PH",
    service: "Facebook",
  },
  {
    id: "84bd38ba-cfb0-4c22-8230-5fc75fc2a64c",
    country: "Affected customer order",
    code: "wa",
    service: "SMSBulk",
  },
];

type Result = {
  success: boolean;
  error?: string;
  result?: {
    orderId: string;
    countryCode: string;
    status: string;
    refunded: boolean;
    refundId?: string;
    amountMinor?: number;
    message?: string;
  };
};

export default function SmsbulkRefundReconciliationPage() {
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function processRefund(order: (typeof orders)[number]) {
    if (busy) return;

    const confirmed = window.confirm(
      order.id === "84bd38ba-cfb0-4c22-8230-5fc75fc2a64c"
        ? `SMSBulk reported: "No numbers available right now."\n\nConfirm you have reviewed this supplier response. The server will check the order and refund records before proceeding.`
        : `Process the NumberHub customer refund for ${order.country}?\n\nOnly continue if you have confirmed that SMSBulk returned the supplier funds.`
    );

    if (!confirmed) return;

    setBusy(order.id);
    setError("");
    setResults((previous) => ({
      ...previous,
      [order.id]: "Processing refund...",
    }));

    try {
      const response = await fetch("/api/admin/reconcile-smsbulk-refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = (await response.json()) as Result;

      if (!response.ok || !data.success || !data.result?.refunded) {
        setResults((previous) => ({
          ...previous,
          [order.id]: "Not confirmed — check the response before taking further action.",
        }));
        setError(
          data.error ||
            "The refund was not confirmed. Check the order and refund records before retrying."
        );
        return;
      }

      const amount =
        typeof data.result.amountMinor === "number"
          ? new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
            }).format(data.result.amountMinor / 100)
          : "Amount not returned";

      setResults((previous) => ({
        ...previous,
        [order.id]:
          `Refund confirmed: ${amount}. Order status: ${data.result!.status}. ` +
          `Refund ID: ${data.result!.refundId || "not returned"}.`,
      }));
    } catch {
      setResults((previous) => ({
        ...previous,
        [order.id]:
          "Response not confirmed. Verify the order and refund records before retrying.",
      }));
      setError(
        "The request result could not be confirmed. Do not submit this order again until its refund status has been checked."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f7f5] px-4 py-8 text-[#10231a]">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-[#062d1d] p-6 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            NumberHub administration
          </p>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
            SMSBulk refund reconciliation
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/75">
            Process each approved customer refund separately. The server
            verifies the order before making changes.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Only process an order after confirming the supplier-side refund.
          If a request has an unclear result, stop and verify its refund record
          before trying again. The UK order is intentionally excluded.
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {orders.map((order) => (
            <section
              key={order.id}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">{order.country}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {order.service} · {order.code}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-slate-500">
                    Order: {order.id}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => processRefund(order)}
                  className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === order.id ? "Processing..." : "Process refund"}
                </button>
              </div>

              {results[order.id] && (
                <p
                  aria-live="polite"
                  className="mt-4 break-words rounded-xl bg-slate-50 p-3 text-sm"
                >
                  {results[order.id]}
                </p>
              )}
            </section>
          ))}
        </div>

        <p className="mt-6 text-sm text-slate-600">
          Process one order, check its result, and only then move to the next.
        </p>
      </div>
    </main>
  );
}
