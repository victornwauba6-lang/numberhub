"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
};

type Wallet = {
  balanceMinor: string;
  currency: string;
};

type Payment = {
  id: string;
  amountMinor: string;
  currency: string;
  status: string;
  paymentMethod: string | null;
  providerReference: string | null;
  createdAt: string;
  completedAt: string | null;
};

export default function WalletPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  useEffect(() => {
    async function loadWallet() {
      try {
        const userResponse = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const userData = await userResponse.json();

        if (!userResponse.ok || !userData.success) {
          router.replace("/login");
          return;
        }

        setUser(userData.user);

        const [walletResponse, historyResponse] = await Promise.all([
          fetch("/api/wallet", { cache: "no-store" }),
          fetch("/api/payments/history", { cache: "no-store" }),
        ]);

        const walletData = await walletResponse.json();
        const historyData = await historyResponse.json();
        if (walletResponse.ok && walletData.success) {
          setWallet(walletData.wallet);
        }

        if (historyResponse.ok && historyData.success) {
          setPayments(historyData.payments || []);
        }

      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
        setHistoryLoading(false);
      }
    }

    loadWallet();
  }, [router]);

  function formatNaira(balanceMinor: string) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(Number(balanceMinor) / 100);
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "SUCCESS":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
      case "FAILED":
      case "CANCELLED":
      case "EXPIRED":
      case "PAYMENT_REJECTED":
        return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      case "PROCESSING":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
      default:
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "SUCCESS":
        return "Successful";
      case "FAILED":
        return "Failed";
      case "CANCELLED":
        return "Cancelled";
      case "EXPIRED":
        return "Expired";
      case "PROCESSING":
        return "Processing";
      case "REFUNDED":
        return "Refunded";
      case "PAYMENT_REJECTED":
        return "Payment rejected";
      default:
        return "Pending";
    }
  }

  const transactionHistory = payments
    .map((payment) => ({
      id: payment.id,
      amountMinor: payment.amountMinor,
      createdAt: payment.createdAt,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      providerReference: payment.providerReference,
      fundingId: null as string | null,
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );


  async function handleFunding() {
    setMessage("");

    const value = Number(amount);

    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      setMessageType("error");
      setMessage("Enter a valid whole-naira amount.");
      return;
    }

    if (value < 100) {
      setMessageType("error");
      setMessage("Minimum wallet funding amount is ₦100.");
      return;
    }

    setSubmitting(true);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: value,
          idempotencyKey,
          paymentMethod: "KORAPAY",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessageType("error");
        setMessage(data.error || "We couldn't start your payment.");
        return;
      }

      if (!data.payment?.checkoutUrl) {
        setMessageType("error");
        setMessage("Payment checkout is unavailable right now. Please try again.");
        return;
      }

      window.location.href = data.payment.checkoutUrl;
    } catch {
      setMessageType("error");
      setMessage("Something went wrong while starting your payment.");
    } finally {
      setSubmitting(false);
    }
  }






  if (loading) {
    return (
      <main className="min-h-screen bg-[#080b0a] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
            <p className="mt-4 text-sm text-white/40">Loading wallet...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080b0a] text-white">
      <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5 sm:px-5">

        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg text-white/65 transition hover:border-emerald-400/20 hover:text-white"
            aria-label="Go back"
          >
            ←
          </button>

          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
              NumberHub
            </p>
            <p className="mt-0.5 text-xs font-bold text-white/45">
              Wallet
            </p>
          </div>

          <div className="h-10 w-10" />
        </header>

        <section className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
            Available balance
          </p>

          <div className="nh-wallet mt-3 overflow-hidden p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-white/45">
                  Spendable wallet
                </p>

                <p className="mt-3 text-[2.5rem] font-black tracking-[-0.045em] text-white">
                  {wallet ? formatNaira(wallet.balanceMinor) : "₦0.00"}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-lg font-black text-emerald-400">
                ₦
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-white/[0.07] pt-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(53,208,127,.7)]" />
              <span className="text-[11px] font-bold text-white/40">
                Ready for purchases
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
              Funding Center
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              Fund your wallet
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/40">
              Add money securely through Kora. Your wallet is credited
              automatically after the payment is confirmed.
            </p>
          </div>

          <div className="nh-premium-card p-5">
            <label
              htmlFor="amount"
              className="text-xs font-black uppercase tracking-[0.15em] text-white/40"
            >
              Funding amount
            </label>

            <div className="relative mt-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-400">
                ₦
              </span>

              <input
                id="amount"
                type="number"
                min="100"
                step="1"
                inputMode="numeric"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setMessage("");
                }}
                placeholder="0"
                disabled={submitting}
                className="w-full rounded-2xl border border-white/10 bg-black/20 py-4 pl-10 pr-4 text-xl font-black text-white outline-none transition placeholder:text-white/15 focus:border-emerald-400/40 focus:ring-4 focus:ring-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <p className="mt-2 text-[11px] font-bold text-white/30">
              Minimum funding amount: ₦100
            </p>

            <div className="mt-5 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
                    Secure checkout
                  </p>
                  <p className="mt-1 text-base font-black text-white">
                    Kora
                  </p>
                </div>

                <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-black text-emerald-300">
                  Automatic credit
                </span>
              </div>

              <p className="mt-3 text-xs font-medium leading-5 text-white/35">
                You’ll be redirected to a secure payment page to complete
                your wallet funding.
              </p>
            </div>

            {message && (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold leading-5 ${
                  messageType === "success"
                    ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                    : "border-red-400/20 bg-red-400/[0.07] text-red-300"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={handleFunding}
              disabled={submitting}
              className="nh-premium-button mt-5 flex w-full items-center justify-center gap-2 px-5 py-4 text-sm"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Opening secure checkout...
                </>
              ) : (
                <>
                  Continue to payment
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>

            <div className="mt-4 rounded-xl bg-white/[0.025] px-3 py-3 text-center text-[10px] font-bold leading-4 text-white/30">
              Your wallet is credited automatically after successful payment
              confirmation.
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/30">
                Activity
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight">
                Transaction history
              </h2>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1 text-[11px] font-black text-white/35">
              {transactionHistory.length}
            </span>
          </div>

          {historyLoading ? (
            <div className="mt-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-white/35">
                Loading transaction history...
              </p>
            </div>
          ) : transactionHistory.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] px-5 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <span className="text-lg text-white/30">₦</span>
              </div>
              <p className="mt-4 text-sm font-black text-white/60">
                No transactions yet
              </p>
              <p className="mt-1 text-xs font-medium text-white/25">
                Your wallet activity will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {transactionHistory.map((transaction) => (
                <div
                  key={transaction.id}
                  className="nh-premium-card overflow-hidden p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">
                        {transaction.paymentMethod === "WALLET_FUNDING" ||
                        transaction.paymentMethod === "MANUAL_BANK_TRANSFER"
                          ? "Wallet funding"
                          : transaction.paymentMethod === "PURCHASE"
                            ? "Number purchase"
                            : transaction.paymentMethod === "REFUND"
                              ? "Refund"
                              : transaction.paymentMethod === "REVERSAL"
                                ? "Reversal"
                                : "Wallet transaction"}
                      </p>

                      <p className="mt-1 text-[11px] font-medium text-white/25">
                        {formatDate(transaction.createdAt)}
                      </p>
                      {transaction.providerReference &&
                        transaction.paymentMethod !== "MANUAL_BANK_TRANSFER" && (
                          <p className="mt-2 truncate text-[10px] font-medium text-white/20">
                            Ref · {transaction.providerReference}
                          </p>
                        )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-base font-black tracking-tight text-white">
                        {formatNaira(transaction.amountMinor)}
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${
                          getStatusStyle(transaction.status)
                        }`}
                      >
                        {getStatusLabel(transaction.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-7 w-full rounded-2xl border border-white/10 bg-white/[0.025] py-4 text-sm font-black text-white/45 transition hover:border-emerald-400/20 hover:text-white"
        >
          Back to dashboard
        </button>
      </div>

    </main>
  );
}
