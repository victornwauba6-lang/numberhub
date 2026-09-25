"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  status: string;
  currency: string;
  priceMinor: string;
  refundEnabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  serviceSlug: string;
  serviceName: string;
  serviceIcon: string;
  optionName: string;
  phoneNumber: string | null;
  supplierNumberReference: string | null;
  assignedAt: string | null;
};

function formatMoney(minor: string, currency: string) {
  const amount = Number(minor) / 100;

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusMeta(status: string) {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return {
        label: "Completed",
        description: "The verification has been completed successfully.",
        className:
          "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    case "CODE_RECEIVED":
      return {
        label: "Code received",
        description: "A verification code has been received for this number.",
        className:
          "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };
    case "WAITING_FOR_SMS":
      return {
        label: "Waiting for OTP",
        description: "Your number is active and waiting for a verification SMS.",
        className:
          "bg-amber-50 text-amber-700 ring-amber-200",
      };
    case "NUMBER_ASSIGNED":
      return {
        label: "Number ready",
        description: "Your verification number has been assigned and is ready.",
        className:
          "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };

    case "PROCESSING":
      return {
        label: "Processing",
        description: "Your order is being processed.",
        className:
          "bg-blue-50 text-blue-700 ring-blue-200",
      };

    case "CREATED":
      return {
        label: "Order created",
        description: "Your order has been created and is waiting for processing.",
        className:
          "bg-amber-50 text-amber-700 ring-amber-200",
      };

    case "FAILED":
      return {
        label: "Failed",
        description: "This order could not be completed.",
        className:
          "bg-red-50 text-red-700 ring-red-200",
      };

    case "REFUNDED":
      return {
        label: "Refunded",
        description: "This order has been refunded.",
        className:
          "bg-violet-50 text-violet-700 ring-violet-200",
      };

    case "CANCELLED":
      return {
        label: "Cancelled",
        description: "This order has been cancelled.",
        className:
          "bg-slate-100 text-slate-700 ring-slate-200",
      };

    default:
      return {
        label: status || "Unknown",
        description: "The current order status is being updated.",
        className:
          "bg-slate-100 text-slate-700 ring-slate-200",
      };
  }
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const orderId = String(params?.id || "");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);

  async function cancelNumber() {
    if (!orderId || cancelLoading) return;

    const confirmed = window.confirm(
      "Cancel this number and receive an instant wallet refund? This should only be used if you have not received an OTP."
    );

    if (!confirmed) return;

    setCancelLoading(true);
    setCancelError("");
    setCancelSuccess(false);

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error("Unexpected cancellation response");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to cancel this number",
        );
      }

      setCancelSuccess(true);
      setOrder((current) =>
        current
          ? {
              ...current,
              status: "REFUNDED",
            }
          : current,
      );
      setVerificationCode(null);
      setVerificationMessage("");
    } catch (cancelRequestError) {
      setCancelError(
        cancelRequestError instanceof Error
          ? cancelRequestError.message
          : "Unable to cancel this number. Please contact our team.",
      );
    } finally {
      setCancelLoading(false);
    }
  }

  async function checkVerification() {
    if (!orderId) return;

    setVerificationLoading(true);

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/verification`,
        {
          cache: "no-store",
        },
      );

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error("Unexpected verification response");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to check verification status",
        );
      }

      const verification = data.verification;

      if (verification?.phoneNumber) {
        setOrder((current) =>
          current
            ? {
                ...current,
                phoneNumber: verification.phoneNumber,
                status: verification.status || current.status,
              }
            : current,
        );
      } else if (verification?.status) {
        setOrder((current) =>
          current
            ? {
                ...current,
                status: verification.status,
              }
            : current,
        );
      }

      setVerificationCode(
        verification?.verificationCode || null,
      );
      setVerificationMessage(
        verification?.message || "",
      );
    } catch (verificationError) {
      console.error(
        "[Order Detail] Verification check failed:",
        verificationError,
      );
    } finally {
      setVerificationLoading(false);
    }
  }

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    async function loadOrder() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(orderId)}`,
          {
            cache: "no-store",
          },
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          throw new Error("Unexpected server response");
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load this order");
        }

        if (!cancelled) {
          setOrder(data.order);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this order",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !order) return;

    const activeStatuses = new Set([
      "NUMBER_ASSIGNED",
      "WAITING_FOR_SMS",
      "CODE_RECEIVED",
    ]);

    if (!activeStatuses.has(order.status.toUpperCase())) {
      return;
    }

    void checkVerification();

    const interval = window.setInterval(() => {
      void checkVerification();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [orderId, order?.status]);

  const status = useMemo(
    () => getStatusMeta(order?.status || ""),
    [order?.status],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8f7] text-slate-950">
        <div className="mx-auto min-h-screen max-w-2xl px-4 pb-10">
          <div className="flex items-center justify-between py-5">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-6 w-28 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
          </div>

          <div className="mt-4 space-y-4">
            <div className="h-40 animate-pulse rounded-[28px] bg-slate-200" />
            <div className="h-56 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-200" />
            <div className="h-48 animate-pulse rounded-[28px] bg-white ring-1 ring-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[#f6f8f7] text-slate-950">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-10">
          <header className="flex items-center justify-between py-5">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
              aria-label="Go back"
            >
              ←
            </button>

            <div className="text-center">
              <p className="text-sm font-black tracking-tight text-slate-950">
                NumberHub
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                Order details
              </p>
            </div>

            <div className="h-10 w-10" />
          </header>

          <section className="flex flex-1 items-center justify-center py-16">
            <div className="w-full rounded-[28px] bg-white p-7 text-center shadow-sm ring-1 ring-slate-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                !
              </div>

              <h1 className="mt-5 text-xl font-black tracking-tight">
                Order unavailable
              </h1>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {error || "We couldn't find this order."}
              </p>

              <Link
                href="/orders"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#087f5b] px-6 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#066b4d]"
              >
                Back to orders
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] text-slate-950">
      <div className="mx-auto min-h-screen max-w-2xl px-4 pb-28">
        <header className="flex items-center justify-between py-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lg text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            aria-label="Go back"
          >
            ←
          </button>

          <div className="text-center">
            <p className="text-sm font-black tracking-tight">NumberHub</p>
            <p className="text-[11px] font-medium text-slate-500">
              Order details
            </p>
          </div>

          <Link
            href="/orders"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            aria-label="Orders"
          >
            □
          </Link>
        </header>

        <section className="overflow-hidden rounded-[30px] bg-gradient-to-br from-[#087f5b] via-[#07966a] to-[#065f46] p-6 text-white shadow-xl shadow-emerald-900/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
                Order
              </p>

              <h1 className="mt-2 break-all text-xl font-black tracking-tight">
                #{order.id}
              </h1>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur">
              {order.serviceIcon}
            </div>
          </div>

          <div className="mt-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-100">
                Amount paid
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight">
                {formatMoney(order.priceMinor, order.currency)}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-2 text-xs font-extrabold ring-1 ${status.className}`}
            >
              {status.label}
            </span>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
              {order.countryFlag}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                Product
              </p>

              <h2 className="mt-1 truncate text-lg font-black">
                {order.optionName}
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                {order.serviceName} · {order.countryName}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black">Order progress</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {status.description}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-[#087f5b]">
              ✓
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="flex gap-3">
              <div className="flex w-6 flex-col items-center">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#087f5b] text-xs font-black text-white">
                  ✓
                </div>
                <div className="mt-1 h-9 w-px bg-emerald-100" />
              </div>

              <div className="pb-2">
                <p className="text-sm font-bold">Order created</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex w-6 flex-col items-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                    order.status.toUpperCase() === "CREATED"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-[#087f5b] text-white"
                  }`}
                >
                  {order.status.toUpperCase() === "CREATED" ? "•" : "✓"}
                </div>
                <div className="mt-1 h-9 w-px bg-slate-100" />
              </div>

              <div className="pb-2">
                <p className="text-sm font-bold">
                  {order.status.toUpperCase() === "CREATED"
                    ? "Waiting for processing"
                    : "Processing"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(order.updatedAt)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex w-6 items-start justify-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                    order.status.toUpperCase() === "COMPLETED"
                      ? "bg-[#087f5b] text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {order.status.toUpperCase() === "COMPLETED" ? "✓" : "•"}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold">
                  {order.status.toUpperCase() === "COMPLETED"
                    ? "Completed"
                    : "Delivery pending"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {order.assignedAt
                    ? formatDate(order.assignedAt)
                    : order.completedAt
                      ? formatDate(order.completedAt)
                      : "Will update when real supplier delivery data is available."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {(order.status.toUpperCase() === "NUMBER_ASSIGNED" ||
          order.status.toUpperCase() === "WAITING_FOR_SMS") &&
          !verificationCode && (
            <section className="mt-4 overflow-hidden rounded-[30px] border border-amber-200/80 bg-gradient-to-br from-white via-white to-amber-50/60 shadow-sm ring-1 ring-amber-100">
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl ring-1 ring-amber-200">
                    <span className="absolute inset-0 animate-ping rounded-2xl bg-amber-200/30" />
                    <span className="relative">⌁</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black tracking-tight text-slate-950">
                        Waiting for OTP
                      </h2>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-700">
                        Active
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Your verification number is active. We&apos;re waiting for the
                      verification SMS to arrive.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50/90 p-4 ring-1 ring-slate-200/80">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-sm text-slate-400">i</div>
                    <p className="text-xs font-medium leading-5 text-slate-500">
                      Haven&apos;t received an OTP? You can cancel this number and
                      receive the amount back in your wallet instantly.
                    </p>
                  </div>
                </div>

                {cancelError && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-xs font-bold leading-5 text-red-700">
                      {cancelError}
                    </p>
                  </div>
                )}

                {cancelSuccess ? (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-black text-emerald-700">
                      ✓
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-900">
                        Number cancelled and refund credited
                      </p>
                      <p className="mt-1 text-xs font-medium leading-5 text-emerald-700">
                        The amount has been returned to your NumberHub wallet.
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void cancelNumber()}
                    disabled={cancelLoading}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancelLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Cancelling securely…
                      </>
                    ) : (
                      <>
                        Cancel number
                        <span className="text-white/50">·</span>
                        Get refund
                      </>
                    )}
                  </button>
                )}

                <p className="mt-3 text-center text-[11px] font-medium leading-5 text-slate-400">
                  Cancellation is available only before an OTP is received.
                </p>
              </div>
            </section>
          )}

        {order.status.toUpperCase() === "CODE_RECEIVED" && verificationCode && (
          <section className="mt-4 rounded-[30px] border border-emerald-200/80 bg-emerald-50/50 p-5 shadow-sm ring-1 ring-emerald-100">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-black text-emerald-700">
                ✓
              </div>
              <div>
                <p className="text-sm font-black text-emerald-950">
                  OTP received
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-emerald-800/70">
                  This number has already received an OTP. Any refund request
                  now requires review by our team.
                </p>
              </div>
            </div>
          </section>
        )}

        {verificationCode && (
          <section className="mt-4 overflow-hidden rounded-[28px] border border-emerald-200 bg-white p-5 shadow-sm ring-1 ring-emerald-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                  Verification code
                </p>
                <p className="mt-2 text-4xl font-black tracking-[0.18em] text-slate-950">
                  {verificationCode}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Received from the connected supplier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(
                    verificationCode,
                  );
                }}
                className="shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              >
                Copy
              </button>
            </div>
          </section>
        )}

        {order.phoneNumber && (
          <section className="mt-4 overflow-hidden rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                  Verification number
                </p>
                <p className="mt-2 break-all text-2xl font-black tracking-tight text-emerald-950 dark:text-emerald-100">
                  {order.phoneNumber}
                </p>
                {order.assignedAt && (
                  <p className="mt-2 text-xs font-medium text-emerald-800/70 dark:text-emerald-200/70">
                    Assigned {formatDate(order.assignedAt)}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(order.phoneNumber || "");
                }}
                className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-50 dark:bg-white/10 dark:text-emerald-200 dark:ring-emerald-400/20"
              >
                Copy
              </button>
            </div>
          </section>
        )}

        <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-black">Order information</h2>

          <div className="mt-4 divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm text-slate-500">Country</span>
              <span className="text-right text-sm font-bold">
                {order.countryFlag} {order.countryName}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm text-slate-500">Service</span>
              <span className="text-right text-sm font-bold">
                {order.serviceName}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm text-slate-500">Order date</span>
              <span className="text-right text-sm font-bold">
                {formatDate(order.createdAt)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm text-slate-500">Refund eligibility</span>
              <span
                className={`text-right text-sm font-bold ${
                  order.refundEnabled
                    ? "text-emerald-700"
                    : "text-slate-700"
                }`}
              >
                {order.refundEnabled ? "Eligible" : "Not available"}
              </span>
            </div>


            {order.expiresAt && (
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-slate-500">Expires</span>
                <span className="text-right text-sm font-bold">
                  {formatDate(order.expiresAt)}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="mt-4 rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#087f5b] shadow-sm">
              i
            </div>

            <div>
              <h2 className="text-sm font-black text-emerald-950">
                Supplier delivery
              </h2>

              <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                NumberHub only displays delivery information when it comes from
                a connected supplier. No phone number, verification code, or
                supplier response is being invented or simulated here.
              </p>
            </div>
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-slate-500"
          >
            <span className="text-lg">⌂</span>
            Home
          </Link>

          <Link
            href="/market"
            className="flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-slate-500"
          >
            <span className="text-lg">◈</span>
            Market
          </Link>

          <Link
            href="/orders"
            className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-50 py-2 text-[11px] font-extrabold text-[#087f5b]"
          >
            <span className="text-lg">□</span>
            Orders
          </Link>

          <Link
            href="/wallet"
            className="flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-slate-500"
          >
            <span className="text-lg">₦</span>
            Wallet
          </Link>
        </div>
      </nav>
    </main>
  );
}
