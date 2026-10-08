"use client";

import { useState } from "react";

type Payment = {
  paymentId: string;
  userId: string;
  walletId: string;
  email: string;
  amountNgn: number;
  currency: string;
  status: string;
  providerReference: string | null;
  createdAt: string;
  verification: {
    success?: boolean;
    providerPaymentId?: string;
    providerReference?: string | null;
    amountMinor?: string | bigint | null;
    currency?: string | null;
    rawStatus?: string | null;
    error?: string;
  } | null;
};

export default function PaymentRecoveryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveringId, setRecoveringId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  async function inspectPayments() {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/payment-recovery", {
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to inspect payments");
      }

      setPayments(result.payments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inspection failed");
    } finally {
      setLoading(false);
    }
  }

  async function recoverPayment(payment: Payment) {
    if (!payment.verification?.success) {
      setError("This payment has not been confirmed successful by Korapay.");
      return;
    }

    const confirmed = window.confirm(
      `Recover ₦${payment.amountNgn.toLocaleString()} for ${payment.email}?\n\nKora reference: ${payment.providerReference}\n\nThis will credit the wallet and mark the payment successful.`
    );

    if (!confirmed) {
      return;
    }

    setRecoveringId(payment.paymentId);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/payment-recovery", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: payment.paymentId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Recovery failed");
      }

      if (result.alreadyRecovered) {
        setSuccessMessage(
          "This payment was already recovered or had already been credited."
        );
      } else {
        setSuccessMessage(
          `Recovery successful. ₦${payment.amountNgn.toLocaleString()} was credited to ${payment.email}.`
        );
      }

      await inspectPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recovery failed");
    } finally {
      setRecoveringId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Payment Recovery</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inspect ₦100 Korapay payments and recover a confirmed successful payment.
          </p>
        </div>

        <button
          type="button"
          onClick={inspectPayments}
          disabled={loading}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check ₦100 Payments"}
        </button>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
            {successMessage}
          </div>
        ) : null}

        {payments.length === 0 && !loading && !error ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            No pending ₦100 payments found.
          </div>
        ) : null}

        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment.paymentId} className="rounded-2xl border p-5">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-medium">{payment.email}</p>
                </div>

                <div>
                  <span className="text-muted-foreground">Amount</span>
                  <p className="font-medium">
                    ₦{payment.amountNgn.toLocaleString()}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground">Payment status</span>
                  <p className="font-medium">{payment.status}</p>
                </div>

                <div>
                  <span className="text-muted-foreground">Kora reference</span>
                  <p className="break-all font-medium">
                    {payment.providerReference || "None"}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p>{new Date(payment.createdAt).toLocaleString()}</p>
                </div>

                <div>
                  <span className="text-muted-foreground">Kora status</span>
                  <p className="font-medium">
                    {payment.verification?.rawStatus || "Unknown"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-muted/50 p-4 text-sm">
                <p>
                  Kora verified:{" "}
                  <strong>
                    {payment.verification?.success ? "YES" : "NO"}
                  </strong>
                </p>

                {payment.verification?.error ? (
                  <p className="mt-2 text-destructive">
                    {payment.verification.error}
                  </p>
                ) : null}

                {payment.verification?.success && payment.status !== "SUCCESS" ? (
                  <button
                    type="button"
                    onClick={() => recoverPayment(payment)}
                    disabled={recoveringId !== null}
                    className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {recoveringId === payment.paymentId
                      ? "Recovering..."
                      : "Recover ₦100"}
                  </button>
                ) : null}

                {payment.status === "SUCCESS" ? (
                  <p className="mt-4 text-sm font-medium">
                    Already marked successful
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
