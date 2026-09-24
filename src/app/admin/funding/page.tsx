"use client";

import { useEffect, useState } from "react";

type FundingRequest = {
  id: string;
  fundingId: string;
  amountMinor: string;
  currency: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  userEmail: string;
};

function formatNaira(amountMinor: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number(amountMinor) / 100);
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

export default function AdminFundingPage() {
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirmRequest, setConfirmRequest] = useState<FundingRequest | null>(null);
  const [confirmAction, setConfirmAction] = useState<"APPROVE" | "REJECT" | null>(null);

  async function loadRequests() {
    try {
      const response = await fetch("/api/admin/manual-funding", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load funding requests");
      }

      setRequests(data.requests || []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load funding requests",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  function requestAction(
    requestId: string,
    action: "APPROVE" | "REJECT",
  ) {
    const request = requests.find((item) => item.id === requestId);

    if (!request) return;

    setConfirmRequest(request);
    setConfirmAction(action);
  }

  async function handleAction(
    requestId: string,
    action: "APPROVE" | "REJECT",
  ) {
    const request = requests.find((item) => item.id === requestId);

    if (!request) return;

    setProcessing(requestId);
    setMessage("");
    setConfirmRequest(null);
    setConfirmAction(null);

    try {
      const response = await fetch("/api/admin/manual-funding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fundingRequestId: requestId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Action could not be completed");
      }

      setMessage(
        action === "APPROVE"
          ? `${request.fundingId} approved and wallet credited.`
          : `${request.fundingId} rejected.`,
      );

      await loadRequests();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Action could not be completed",
      );
    } finally {
      setProcessing(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8f6] text-[#10231a]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Finance
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Funding requests
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review customer bank-transfer requests and credit wallets only
              after confirming the payment.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-xs font-black text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            {message}
          </div>
        )}

        {confirmRequest && confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[28px] border border-black/[0.06] bg-white p-6 shadow-[0_25px_80px_rgba(16,35,26,0.18)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-black text-emerald-700">
                {confirmAction === "APPROVE" ? "₦" : "!"}
              </div>

              <h2 className="mt-5 text-xl font-black tracking-tight">
                {confirmAction === "APPROVE"
                  ? "Approve funding?"
                  : "Reject funding?"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {confirmAction === "APPROVE"
                  ? `Confirm that you received ${formatNaira(confirmRequest.amountMinor)} from ${confirmRequest.userEmail}. Approving will credit the customer's wallet.`
                  : `Reject ${confirmRequest.fundingId}? The customer's wallet will not be credited.`}
              </p>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-400">
                  FUNDING ID
                </p>
                <p className="mt-1 text-sm font-black text-slate-800">
                  {confirmRequest.fundingId}
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRequest(null);
                    setConfirmAction(null);
                  }}
                  className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-xs font-black text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleAction(confirmRequest.id, confirmAction)
                  }
                  className={`flex-1 rounded-2xl px-4 py-3.5 text-xs font-black text-white ${
                    confirmAction === "APPROVE"
                      ? "bg-[#062d1d]"
                      : "bg-red-600"
                  }`}
                >
                  {confirmAction === "APPROVE" ? "Approve" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-[24px] border border-black/[0.06] bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Loading funding requests...
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-black/[0.06] bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-black">No funding requests</p>
            <p className="mt-2 text-xs text-slate-400">
              New customer funding requests will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {requests.map((request) => {
              const pending = request.status === "PENDING";

              return (
                <div
                  key={request.id}
                  className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_35px_rgba(16,35,26,0.05)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#062d1d] px-3 py-1 text-[10px] font-black tracking-wide text-white">
                          {request.fundingId}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black ${
                            pending
                              ? "bg-amber-50 text-amber-700"
                              : request.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <p className="mt-4 text-2xl font-black">
                        {formatNaira(request.amountMinor)}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {request.userEmail}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        Created {formatDate(request.createdAt)}
                      </p>
                    </div>

                    {pending && (
                      <div className="flex gap-2 sm:pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            requestAction(request.id, "REJECT")
                          }
                          disabled={processing === request.id}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            requestAction(request.id, "APPROVE")
                          }
                          disabled={processing === request.id}
                          className="rounded-xl bg-[#062d1d] px-4 py-3 text-xs font-black text-white transition hover:bg-[#0a432b] disabled:opacity-50"
                        >
                          {processing === request.id
                            ? "Processing..."
                            : "Approve"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
