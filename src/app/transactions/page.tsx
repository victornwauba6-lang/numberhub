"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Transaction = {
  id: string;
  transactionType: string;
  direction: string;
  amountMinor: string;
  balanceBeforeMinor: string;
  balanceAfterMinor: string;
  reference: string;
  externalReference: string | null;
  description: string | null;
  manualFundingStatus?: "PENDING" | "REJECTED";
  fundingId?: string | null;
  legacyStatus?: string;
  isLegacy?: boolean;
  createdAt: string;
};

function formatNaira(minor: string | number) {
  return `₦${(Number(minor) / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function labelForTransaction(transaction: Transaction) {
  if (transaction.manualFundingStatus === "PENDING") {
    return "Manual bank transfer funding";
  }

  if (transaction.manualFundingStatus === "REJECTED") {
    return "Payment rejected";
  }

  if (transaction.description === "Manual bank transfer funding") return "Successful";

  if (transaction.isLegacy) {
    switch (transaction.transactionType.toUpperCase()) {
      case "DEPOSIT":
        return "Wallet funding";
      case "PURCHASE":
        return "Number purchase";
      case "REFUND":
        return "Purchase refund";
      default:
        return "Wallet transaction";
    }
  }

  if (transaction.description) return transaction.description;

  switch (transaction.transactionType.toUpperCase()) {
    case "DEPOSIT":
      return "Wallet funding";
    case "PURCHASE":
      return "Number purchase";
    case "REFUND":
      return "Purchase refund";
    default:
      return "Wallet transaction";
  }
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletBalanceMinor, setWalletBalanceMinor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        setLoading(true);
        setError("");

        const [transactionsResponse, fundingResponse, walletResponse] =
          await Promise.all([
            fetch("/api/wallet/transactions", { cache: "no-store" }),
            fetch("/api/manual-funding/history", { cache: "no-store" }),
            fetch("/api/wallet", { cache: "no-store" }),
          ]);

        const transactionData = await transactionsResponse.json();
        const fundingData = await fundingResponse.json();
        const walletData = await walletResponse.json();

        if (!transactionsResponse.ok || !transactionData.success) {
          throw new Error(
            transactionData.error || "Transactions could not be loaded",
          );
        }

        const walletTransactions = (transactionData.transactions ?? []).filter(
          (transaction: Transaction) =>
            !transaction.reference.startsWith("LEGACY-BALANCE-"),
        );

        if (walletResponse.ok && walletData.success && walletData.wallet) {
          setWalletBalanceMinor(String(walletData.wallet.balanceMinor));
        }

        const manualFundingTransactions =
          fundingResponse.ok && fundingData.success
            ? (fundingData.fundingRequests ?? [])
                .filter(
                  (request: { status: string }) =>
                    request.status === "PENDING" ||
                    request.status === "REJECTED",
                )
                .map(
                  (request: {
                    id: string;
                    fundingId: string;
                    amountMinor: string;
                    createdAt: string;
                    status: string;
                  }) => ({
                    id: `manual-funding-${request.id}`,
                    transactionType: "DEPOSIT",
                    direction: "CREDIT",
                    amountMinor: request.amountMinor,
                    balanceBeforeMinor: "0",
                    balanceAfterMinor: "0",
                    reference: request.fundingId,
                    externalReference: null,
                    description: null,
                    createdAt: request.createdAt,
                    manualFundingStatus:
                      request.status === "REJECTED"
                        ? "REJECTED"
                        : "PENDING",
                    fundingId: request.fundingId,
                  }),
                )
            : [];

        if (!cancelled) {
          setTransactions(
            [...walletTransactions, ...manualFundingTransactions].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Transactions could not be loaded",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "IN" && transaction.direction.toUpperCase() === "CREDIT") ||
        (filter === "OUT" && transaction.direction.toUpperCase() === "DEBIT");

      const searchable = [
        labelForTransaction(transaction),
        transaction.reference,
        transaction.externalReference ?? "",
        transaction.transactionType,
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [transactions, filter, search]);

  return (
    <main className="min-h-screen bg-[#f7faf8] pb-28 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f7faf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
            aria-label="NumberHub dashboard"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#073b2a] text-lg font-black text-white shadow-sm">
              N
            </div>
            <div>
              <p className="text-[15px] font-black tracking-tight">NumberHub</p>
              <p className="text-[11px] font-medium text-slate-500">
                Global connectivity
              </p>
            </div>
          </Link>

          <Link
            href="/wallet"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm"
          >
            Fund wallet
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 pt-7">
        <div className="rounded-[28px] bg-[#073b2a] p-6 text-white shadow-[0_18px_45px_rgba(7,59,42,0.16)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
            Wallet activity
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Transactions
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-emerald-50/80">
            Review your actual wallet activity, purchases, credits and refunds.
          </p>
        </div>

        <div className="mt-6">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none transition focus:border-[#073b2a] focus:ring-4 focus:ring-emerald-900/5"
          />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {[
            ["ALL", "All"],
            ["IN", "Money in"],
            ["OUT", "Money out"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as "ALL" | "IN" | "OUT")}
              className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold transition ${
                filter === value
                  ? "bg-[#073b2a] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black tracking-tight">
              Recent activity
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {filteredTransactions.length}{" "}
              {filteredTransactions.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-3xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-100 bg-white p-6">
              <p className="font-bold text-red-700">
                Transactions could not be loaded
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                ↔
              </div>
              <h3 className="mt-5 text-lg font-black tracking-tight">
                No transactions yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Your real wallet activity will appear here after a successful
                wallet credit, purchase, or refund.
              </p>
              <Link
                href="/wallet"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#073b2a] px-5 text-sm font-bold text-white shadow-sm"
              >
                Fund wallet
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => {
                const isCredit =
                  transaction.direction.toUpperCase() === "CREDIT";

                const legacyStatus = transaction.legacyStatus?.toLowerCase();

                const statusLabel =
                  transaction.manualFundingStatus === "PENDING"
                    ? "Pending"
                    : transaction.manualFundingStatus === "REJECTED"
                      ? "Payment rejected"
                      : transaction.isLegacy && legacyStatus === "successful"
                        ? "Successful"
                        : transaction.isLegacy && legacyStatus === "pending"
                          ? "Pending"
                          : transaction.isLegacy && legacyStatus === "failed"
                            ? "Failed"
                            : transaction.isLegacy && legacyStatus === "cancelled"
                              ? "Cancelled"
                              : null;

                const statusColor =
                  statusLabel === "Pending"
                    ? "bg-amber-50 text-amber-700"
                    : statusLabel === "Failed" ||
                        statusLabel === "Cancelled" ||
                        statusLabel === "Payment rejected"
                      ? "bg-red-50 text-red-700"
                      : statusLabel === "Successful"
                        ? "bg-emerald-50 text-emerald-700"
                        : null;

                return (
                  <div
                    key={transaction.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.045)]"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
                          statusColor ??
                          (isCredit
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-700")
                        }`}
                      >
                        {statusLabel === "Pending"
                          ? "…"
                          : statusLabel === "Failed" ||
                              statusLabel === "Cancelled" ||
                              statusLabel === "Payment rejected"
                            ? "!"
                            : isCredit
                              ? "+"
                              : "−"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black">
                              {labelForTransaction(transaction)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatDate(transaction.createdAt)}
                            </p>
                          </div>

                          <p
                            className={`shrink-0 text-sm font-black ${
                              transaction.manualFundingStatus === "PENDING"
                                ? "text-amber-700"
                                : transaction.manualFundingStatus === "REJECTED"
                                  ? "text-red-700"
                                  : isCredit
                                    ? "text-emerald-700"
                                    : "text-slate-900"
                            }`}
                          >
                            {transaction.manualFundingStatus === "REJECTED"
                              ? ""
                              : isCredit
                                ? "+"
                                : "−"}
                            {formatNaira(transaction.amountMinor)}
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-400">
                          <span>
                            Balance{" "}
                            {formatNaira(
                              transaction.manualFundingStatus &&
                                walletBalanceMinor !== null
                                ? walletBalanceMinor
                                : transaction.balanceAfterMinor,
                            )}
                          </span>

                          {statusLabel && (
                            <span
                              className={`rounded-full px-2.5 py-1 font-black ${
                                statusColor ??
                                "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          )}

                          <span>
                            {transaction.fundingId
                              ? `Funding ID: ${transaction.fundingId}`
                              : `Ref: ${transaction.reference}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {[
            ["⌂", "Home", "/dashboard"],
            ["◈", "Market", "/market"],
            ["□", "Orders", "/orders"],
            ["↔", "Transactions", "/transactions"],
            ["●", "Me", "/profile"],
          ].map(([icon, label, href]) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-bold ${
                href === "/transactions"
                  ? "text-[#073b2a]"
                  : "text-slate-400"
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
