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
  const [fundingRequests, setFundingRequests] = useState<Array<{ id: string; fundingId: string; amountMinor: string; currency: string; status: string; adminNote: string | null; createdAt: string; reviewedAt: string | null }>>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [showFundingSuccess, setShowFundingSuccess] = useState(false);
  const [submittedFundingAmount, setSubmittedFundingAmount] = useState(0);

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

        const [walletResponse, historyResponse, fundingResponse] = await Promise.all([
          fetch("/api/wallet", { cache: "no-store" }),
          fetch("/api/payments/history", { cache: "no-store" }),
          fetch("/api/manual-funding/history", { cache: "no-store" }),
        ]);

        const walletData = await walletResponse.json();
        const historyData = await historyResponse.json();
        const fundingData = await fundingResponse.json();

        if (walletResponse.ok && walletData.success) {
          setWallet(walletData.wallet);
        }

        if (historyResponse.ok && historyData.success) {
          setPayments(historyData.payments || []);
        }

        if (fundingResponse.ok && fundingData.success) {
          setFundingRequests(fundingData.fundingRequests || []);
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

  const transactionHistory = [
    ...payments.map((payment) => ({
      id: payment.id,
      amountMinor: payment.amountMinor,
      createdAt: payment.createdAt,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      providerReference: payment.providerReference,
      fundingId: null as string | null,
    })),
    ...fundingRequests
      .filter((request) => request.status !== "APPROVED")
      .map((request) => ({
        id: `funding-${request.id}`,
        amountMinor: request.amountMinor,
        createdAt: request.createdAt,
        status:
          request.status === "REJECTED"
            ? "PAYMENT_REJECTED"
            : "PENDING",
        paymentMethod: "WALLET_FUNDING",
        providerReference: null,
        fundingId: request.fundingId,
      })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  );

  async function handleManualFunding() {
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
      const response = await fetch("/api/manual-funding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: value }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessageType("error");
        setMessage(data.error || "We couldn't create your funding request.");
        return;
      }

      if (data.fundingRequest) {
        setFundingRequests((current) => [
          data.fundingRequest,
          ...current,
        ]);
      }

      setSubmittedFundingAmount(value);
      setAmount("");
      setMessage("");
      setShowFundingSuccess(true);
    } catch {
      setMessageType("error");
      setMessage(
        "Something went wrong while creating your funding request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getFundingStatusStyle(status: string) {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
      case "REJECTED":
        return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400";
      default:
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    }
  }

  function getFundingStatusLabel(status: string) {
    switch (status) {
      case "APPROVED":
        return "Approved";
      case "REJECTED":
        return "Rejected";
      default:
        return "Pending review";
    }
  }

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText("3004234965");
      setMessageType("success");
      setMessage("Account number copied.");
    } catch {
      setMessageType("error");
      setMessage("Couldn't copy the account number.");
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
              Transfer funds to our business account and we’ll verify the
              payment before adding the money to your wallet.
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

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
                    Bank transfer
                  </p>
                  <p className="mt-1 text-base font-black text-white">
                    Kuda
                  </p>
                </div>

                <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-black text-emerald-300">
                  Manual verification
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
                    Account name
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    NUMBERBRIDGE TECHNOLOGIES
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
                    Account number
                  </p>

                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-lg font-black tracking-[0.08em] text-white">
                      3004234965
                    </p>

                    <button
                      type="button"
                      onClick={copyAccountNumber}
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-black text-white/70 transition hover:bg-white/[0.08]"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
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
              onClick={handleManualFunding}
              disabled={submitting}
              className="nh-premium-button mt-5 flex w-full items-center justify-center gap-2 px-5 py-4 text-sm"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Creating funding request...
                </>
              ) : (
                <>
                  I’ve made the payment
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>

            <div className="mt-4 rounded-xl bg-white/[0.025] px-3 py-3 text-center text-[10px] font-bold leading-4 text-white/30">
              Your wallet is not credited automatically. We verify the bank
              transfer first, then credit the exact amount to your wallet.
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

                      {transaction.fundingId && (
                        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/25">
                          Funding ID · {transaction.fundingId}
                        </p>
                      )}

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

      {showFundingSuccess && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="funding-success-title"
        >
          <div className="relative w-full max-w-[390px] overflow-hidden rounded-[32px] border border-white/[0.12] bg-[#0d1210] shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-400/[0.08] blur-3xl" />
            <div className="absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-emerald-500/[0.05] blur-3xl" />

            <div className="relative px-6 pb-6 pt-7">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl" />

                  <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/[0.10]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 shadow-[0_8px_30px_rgba(52,211,153,0.25)]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-7 w-7 text-[#06100b]"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 12.5 9.2 17 19 7"
                          stroke="currentColor"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <span className="absolute -right-1 -top-1 text-base">✦</span>
                  <span className="absolute -bottom-1 -left-2 text-xs text-emerald-300">✦</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400/70">
                  Funding request
                </p>

                <h2
                  id="funding-success-title"
                  className="mt-2 text-[25px] font-black tracking-tight text-white"
                >
                  Payment submitted
                </h2>

                <p className="mt-2 text-sm font-medium text-white/40">
                  Your payment has been submitted successfully.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-5 py-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                  Payment amount
                </p>

                <p className="mt-1 text-[30px] font-black tracking-tight text-white">
                  {formatNaira(String(submittedFundingAmount * 100))}
                </p>

                <div className="mx-auto mt-2 h-px w-10 bg-emerald-400/30" />

                <p className="mt-2 text-[11px] font-bold text-white/30">
                  Pending confirmation
                </p>
              </div>

              <p className="mt-5 px-2 text-center text-xs font-medium leading-5 text-white/35">
                Your wallet will be updated once the payment is confirmed.
              </p>

              <button
                type="button"
                onClick={() => setShowFundingSuccess(false)}
                className="mt-6 flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-[#06100b] shadow-[0_10px_30px_rgba(52,211,153,0.14)] transition duration-200 hover:bg-emerald-300 active:scale-[0.98]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
