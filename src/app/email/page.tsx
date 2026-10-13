"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type EmailDomain = {
  domain: string;
  supplierPrice?: number | string;
  supplierCurrency?: string;
  customerPriceMinor: number | string;
  customerPriceNgn: number | string;
  available: boolean | null;
  stock?: number | null;
};

type Activation = {
  id: string;
  site: string;
  domain: string;
  emailAddress?: string | null;
  status: string;
  priceMinor: number | string;
  currency?: string;
  otp?: string | null;
  html?: string | null;
  errorMessage?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  uncertain?: boolean;
  activationId?: string;
  activation?: Activation;
  activations?: Activation[];
  domains?: EmailDomain[];
  refreshWarning?: string;
  message?: string;
  retryAfterSec?: number;
};

function money(value: number | string | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Price unavailable";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function dateLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

function serviceLabel(value?: string | null) {
  const hostname = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];

  const labels: Record<string, string> = {
    "facebook.com": "Facebook",
    "facebook": "Facebook",
    "instagram.com": "Instagram",
    "instagram": "Instagram",
    "tiktok.com": "TikTok",
    "tiktok": "TikTok",
    "gmail.com": "Gmail",
    "gmail": "Gmail",
    "outlook.com": "Outlook",
    "outlook": "Outlook",
    "telegram.org": "Telegram",
    "telegram": "Telegram",
    "whatsapp.com": "WhatsApp",
    "whatsapp": "WhatsApp",
    "discord.com": "Discord",
    "discord": "Discord",
    "twitter.com": "X",
    "x.com": "X",
    "snapchat.com": "Snapchat",
    "snapchat": "Snapchat",
    "linkedin.com": "LinkedIn",
    "linkedin": "LinkedIn",
    "reddit.com": "Reddit",
    "reddit": "Reddit",
  };

  if (labels[hostname]) return labels[hostname];

  const firstPart = hostname.split(".")[0] || "Email service";
  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
}

function safeActivationNotice(activation: Activation) {
  switch (activation.status.toUpperCase()) {
    case "REFUNDED":
      return "Your refund has been confirmed and credited to your NumberHub wallet.";
    case "CANCELLED":
      return "This activation is cancelled. If you expected a refund, check your wallet transactions or contact support.";
    case "CANCEL_PENDING":
      return "Your cancellation is being checked. Refresh the activation status before trying again.";
    default:
      return "We couldn't complete the last update. Refresh the status or contact support.";
  }
}

export default function EmailVerificationPage() {
  const router = useRouter();

  const [site, setSite] = useState("");
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [activations, setActivations] = useState<Activation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchaseConfirmation, setShowPurchaseConfirmation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [uncertainPurchase, setUncertainPurchase] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);

  const selectedActivation =
    activations.find((item) => item.id === selectedId) ?? null;

  const loadHistory = useCallback(async () => {
    setHistoryReady(false);
    try {
      const response = await fetch("/api/email/activations", {
        method: "GET",
        cache: "no-store",
      });
      const data: ApiResponse = await response.json();

      if (response.status === 401) {
        setMessage("Please sign in to use email verification.");
        return;
      }

      if (!response.ok || !data.success) {
        setMessage("Unable to load your email history. Please refresh and try again.");
        return;
      }

      setHistoryReady(true);

      const rows = data.activations ?? [];

      const unresolvedPurchase = rows.some((item) =>
        ["UNKNOWN", "PROCESSING"].includes(item.status),
      );

      if (unresolvedPurchase) {
        setUncertainPurchase(true);
      }

      setActivations(rows);

      setSelectedId((current) => {
        if (current && rows.some((item) => item.id === current)) return current;
        return rows[0]?.id ?? "";
      });
    } catch {
      setMessage("Unable to connect to the email service. Please try again.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadHistory]);

  async function loadDomains(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const normalizedSite = site.trim().toLowerCase();

    if (!normalizedSite) {
      setMessage("Enter the target website first.");
      return;
    }

    setLoadingDomains(true);
    setMessage("");
    setWarning("");
    setDomains([]);
    setSelectedDomain("");

    try {
      const response = await fetch(
        `/api/email/domains?site=${encodeURIComponent(normalizedSite)}`,
        { cache: "no-store" },
      );

      const data: ApiResponse = await response.json();

      if (response.status === 401) {
        setMessage("Please sign in to view available domains.");
        return;
      }

      if (!response.ok || !data.success) {
        setMessage("Unable to load available email domains. Check the website and try again.");
        return;
      }

      setSite(normalizedSite);
      setDomains(data.domains ?? []);

      if ((data.domains ?? []).length === 0) {
        setMessage("No email domains were returned for this website.");
      }
    } catch {
      setMessage("Could not connect to the email service. Please try again.");
    } finally {
      setLoadingDomains(false);
    }
  }

  async function purchaseEmail(confirmed = false) {
    const domain = domains.find((item) => item.domain === selectedDomain);

    if (!domain || domain.available === false) {
      setMessage("Choose an available email domain first.");
      return;
    }

    if (!historyReady) {
      setMessage(
        "Your email activation history could not be verified. Refresh your history before making a purchase.",
      );
      return;
    }

    if (uncertainPurchase) {
      setMessage(
        "A previous purchase has an uncertain outcome. Refresh your history or contact support before making another purchase.",
      );
      return;
    }

    const price = Number(domain.customerPriceNgn);

    if (!Number.isFinite(price) || price <= 0) {
      setMessage("The customer price is invalid. Purchase has been stopped.");
      return;
    }

    if (!confirmed) {
      setShowPurchaseConfirmation(true);
      return;
    }

    setShowPurchaseConfirmation(false);
    setPurchasing(true);
    setMessage("");
    setWarning("");

    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `email-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const response = await fetch("/api/email/activations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ site, domain: domain.domain }),
      });

      const data: ApiResponse = await response.json();

      if (response.status === 202 || data.uncertain) {
        setUncertainPurchase(true);
        setMessage(
          "The purchase outcome is still being checked. Do not purchase again yet; refresh your history or contact support.",
        );
        if (data.activationId) setSelectedId(data.activationId);
        await loadHistory();
        return;
      }

      if (!response.ok || !data.success || !data.activation) {
        setMessage("The email purchase could not be completed. Check your activation history before trying again.");
        await loadHistory();
        return;
      }

      setUncertainPurchase(false);
      setSelectedId(data.activation.id);
      setMessage("Email activation created successfully.");
      await loadHistory();
    } catch {
      setUncertainPurchase(true);
      setMessage(
        "We could not confirm the purchase result. Do not purchase again until your history is checked or support reconciles it.",
      );
      await loadHistory();
    } finally {
      setPurchasing(false);
    }
  }

  const refreshActivation = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `/api/email/activations/${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const data: ApiResponse = await response.json();

      if (response.status === 202 || data.uncertain) {
        setUncertainPurchase(true);
        setWarning("This purchase needs to be checked. Refresh your activation history or contact support before purchasing again.");
        return;
      }

      if (!response.ok || !data.success || !data.activation) {
        setWarning("Could not refresh this activation. Please try again.");
        return;
      }

      const activation = data.activation;

      setActivations((current) =>
        current.map((item) => (item.id === activation.id ? activation : item)),
      );

      setWarning(data.refreshWarning ? "The latest status could not be fully refreshed. Showing the saved activation information." : "");
    } catch {
      setWarning("Could not refresh the latest status. Showing saved information.");
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    const activeStatuses = ["PENDING", "PROCESSING", "CODE_RECEIVED", "UNKNOWN"];
    const selected = activations.find((item) => item.id === selectedId);

    if (!selected || !activeStatuses.includes(selected.status)) return;

    const timer = window.setInterval(() => {
      void refreshActivation(selectedId);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [selectedId, activations, refreshActivation]);

  async function refreshNow() {
    if (!selectedId) {
      await loadHistory();
      return;
    }

    setRefreshing(true);
    await refreshActivation(selectedId);
    await loadHistory();
    setRefreshing(false);
  }

  async function cancelSelectedActivation() {
    if (!selectedActivation || cancelling) return;

    setCancelling(true);
    setMessage("");
    setWarning("");

    try {
      const response = await fetch(
        `/api/email/activations/${encodeURIComponent(selectedActivation.id)}/cancel`,
        {
          method: "POST",
          cache: "no-store",
        },
      );

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        if (data.uncertain) {
          setMessage(
            "We couldn't confirm the cancellation result yet. Check your activation history before trying again.",
          );
        } else {
          const retryMessage =
            data.retryAfterSec && data.retryAfterSec > 0
              ? ` Please wait ${data.retryAfterSec} seconds before trying again.`
              : "";
          setWarning(
            `Cancellation was not confirmed. No refund has been confirmed. Refresh your activation history.${retryMessage}`,
          );
        }
      } else {
        setMessage(
          "Your cancellation request has been processed. Refresh your activation history to confirm the final status.",
        );
      }

      setShowCancelConfirmation(false);
      await loadHistory();
    } catch {
      setShowCancelConfirmation(false);
      setWarning(
        "We couldn't confirm the cancellation result. Check your activation history or contact support before retrying.",
      );
      await loadHistory();
    } finally {
      setCancelling(false);
    }
  }

  const selectedDomainInfo = domains.find(
    (item) => item.domain === selectedDomain,
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060908] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-36 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/[0.10] blur-[100px]" />
        <div className="absolute right-[-120px] top-[420px] h-64 w-64 rounded-full bg-teal-400/[0.06] blur-[90px]" />
        <div className="absolute bottom-20 left-[-120px] h-64 w-64 rounded-full bg-emerald-700/[0.08] blur-[100px]" />
      </div>

      <div className="relative mx-auto min-h-screen max-w-2xl px-5 pb-16 sm:px-6">
        <header className="flex items-center justify-between border-b border-white/[0.06] py-5">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-2.5 text-xs font-bold text-white/70 transition hover:text-white"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-emerald-400 to-emerald-700 text-sm font-black text-[#04120b]">
              N
            </span>
            <span className="text-left">
              <span className="block text-sm font-black">NumberHub</span>
              <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.17em] text-white/35">
                Digital services
              </span>
            </span>
          </button>
        </header>

        <section className="pt-9 sm:pt-12">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
            Email solutions
          </p>
          <h1 className="mt-4 text-[34px] font-black leading-tight tracking-tight sm:text-[42px]">
            Email{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              Verification.
            </span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/50">
            Choose a supported website, check the available email domains, and
            track your verification messages.
          </p>
        </section>

        {(message || warning) && (
          <div
            role="status"
            className="mt-6 space-y-2 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-4 text-sm leading-6 text-emerald-100"
          >
            {message && <p>{message}</p>}
            {warning && <p className="text-amber-200">{warning}</p>}
          </div>
        )}

        <section className="mt-7 rounded-[26px] border border-white/[0.09] bg-gradient-to-b from-[#101713] to-[#080b09] p-5 shadow-2xl sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/80">
            Get started
          </p>
          <h2 className="mt-2 text-lg font-black">
            Create a verification request
          </h2>
          <p className="mt-2 text-xs leading-5 text-white/45">
            Choose the website you want to verify. Available email domains and prices are shown before you purchase.
          </p>

          <form onSubmit={loadDomains} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="email-site"
                className="mb-2 block text-xs font-bold text-white/75"
              >
                Target website / service
              </label>
              <input
                id="email-site"
                value={site}
                onChange={(event) => setSite(event.target.value)}
                placeholder="e.g. facebook.com"
                autoComplete="off"
                required
                maxLength={120}
                className="min-h-[54px] w-full rounded-2xl border border-white/[0.10] bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40"
              />
              <p className="mt-3 text-[11px] font-medium text-white/40">
                Popular suggestions
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["facebook.com", "instagram.com", "tiktok.com", "gmail.com", "outlook.com", "telegram.org"].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setSite(suggestion)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      site === suggestion
                        ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.03] text-white/65 hover:border-emerald-300/30 hover:text-emerald-200"
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingDomains || !site.trim()}
              className="min-h-[52px] w-full rounded-2xl border border-white/[0.10] bg-white/[0.045] px-4 text-sm font-bold text-white transition hover:border-emerald-300/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingDomains ? "Loading domains…" : "Check available domains"}
            </button>
          </form>

          {domains.length > 0 && (
            <div className="mt-6">
              <label
                htmlFor="email-domain"
                className="mb-2 block text-xs font-bold text-white/75"
              >
                Email domain
              </label>
              <select
                id="email-domain"
                value={selectedDomain}
                onChange={(event) => setSelectedDomain(event.target.value)}
                className="min-h-[54px] w-full rounded-2xl border border-white/[0.10] bg-[#0b100e] px-4 text-sm text-white outline-none focus:border-emerald-300/40"
              >
                <option value="">Select an available domain</option>
                {domains.map((item) => (
                  <option
                    key={item.domain}
                    value={item.domain}
                    disabled={item.available === false}
                  >
                    {item.domain} —{" "}
                    {item.available === false
                      ? "Unavailable"
                      : money(item.customerPriceNgn)}

                  </option>
                ))}
              </select>

              {selectedDomainInfo && (
                <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.045] p-4">
                  <p className="text-xs font-bold text-white/75">
                    Price before purchase
                  </p>
                  <p className="mt-2 text-2xl font-black text-emerald-200">
                    {money(selectedDomainInfo.customerPriceNgn)}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-white/40">
                    This is the customer price returned by NumberHub&apos;s
                    pricing API. Confirm the amount before proceeding.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => void purchaseEmail()}
                disabled={
                  purchasing ||
                  !selectedDomain ||
                  selectedDomainInfo?.available === false ||
                  uncertainPurchase
                }
                className="mt-4 min-h-[56px] w-full rounded-2xl border border-emerald-300/20 bg-gradient-to-r from-emerald-400/20 to-teal-400/10 px-5 text-sm font-black text-emerald-100 transition hover:border-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {purchasing
                  ? "Processing purchase…"
                  : uncertainPurchase
                    ? "Purchase paused — check with support"
                    : "Purchase email activation →"}
              </button>

              <p className="mt-3 text-center text-[10px] leading-5 text-white/35">
                Your wallet is charged only when you confirm the purchase.
                Do not repeat a purchase if its outcome is uncertain.
              </p>
            </div>
          )}
        </section>

        <section className="mt-12 rounded-[26px] border border-white/[0.07] bg-white/[0.015] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/80">
                YOUR ACTIVATIONS
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight">Email history</h2>
              <p className="mt-1 text-xs text-white/40">Your requests, status and verification details</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshNow()}
              disabled={refreshing || loadingHistory}
              className="rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 py-2.5 text-xs font-bold text-white/70 disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {loadingHistory ? (
            <p className="mt-5 rounded-2xl border border-white/[0.07] p-5 text-sm text-white/45">
              Loading your email history…
            </p>
          ) : activations.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
              <p className="text-sm font-bold text-white/75">
                No email requests yet
              </p>
              <p className="mt-2 text-xs leading-5 text-white/40">
                Your activations and verification messages will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {activations.map((activation) => (
                <button
                  type="button"
                  key={activation.id}
                  onClick={() => setSelectedId(activation.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedId === activation.id
                      ? "border-emerald-300/30 bg-emerald-400/[0.06]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-bold text-white/90">
                        {activation.emailAddress || activation.domain}
                      </p>
                      <p className="mt-1 text-[11px] text-white/40">
                        {serviceLabel(activation.site)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-2.5 py-1 text-[10px] font-bold text-emerald-200">
                      {statusLabel(activation.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/40">
                    <span>{dateLabel(activation.createdAt)}</span>
                    <span>{money(Number(activation.priceMinor) / 100)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedActivation && (
            <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-gradient-to-b from-emerald-400/[0.07] to-transparent p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black">Verification details</h3>
                <span className="text-[10px] text-white/40">
                  {statusLabel(selectedActivation.status)}
                </span>
              </div>

              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-white/40">
                Email address
              </p>
              <p className="mt-1 break-all text-sm font-bold text-white">
                {selectedActivation.emailAddress || "Preparing your email address…"}
              </p>

              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-white/40">
                Verification code
              </p>
              <p className="mt-1 break-all font-mono text-2xl font-black tracking-wider text-emerald-200">
                {selectedActivation.status === "REFUNDED"
                  ? "Activation refunded — no OTP expected"
                  : selectedActivation.otp || "Waiting for code…"}
              </p>

              {selectedActivation.errorMessage && (
                <p className="mt-3 text-xs leading-5 text-amber-200">
                  {safeActivationNotice(selectedActivation)}
                </p>
              )}

              {selectedActivation.expiresAt && (
                <p className="mt-3 text-[11px] text-white/40">
                  Expires: {dateLabel(selectedActivation.expiresAt)}
                </p>
              )}

              {selectedActivation.html && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-bold text-emerald-200">
                    View message content
                  </summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/30 p-3 text-xs text-white/70">
                    {selectedActivation.html.replace(/<[^>]*>/g, " ").trim()}
                  </pre>
                </details>
              )}

              <button
                type="button"
                onClick={() => void refreshNow()}
                disabled={refreshing}
                className="mt-5 min-h-[44px] w-full rounded-xl border border-white/[0.10] bg-white/[0.035] px-4 text-xs font-bold text-white/80 disabled:opacity-50"
              >
                {refreshing ? "Checking status…" : "Check latest verification status"}
              </button>

              {selectedActivation.status === "PENDING" &&
                !selectedActivation.otp && (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirmation(true)}
                    disabled={cancelling}
                    className="mt-3 min-h-[44px] w-full rounded-xl border border-red-400/25 bg-red-500/[0.08] px-4 text-xs font-bold text-red-200 transition hover:bg-red-500/[0.14] disabled:opacity-50"
                  >
                    Cancel email activation
                  </button>
                )}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-white/[0.06] pt-6 text-center">
          <p className="text-[10px] font-bold tracking-wide text-white/30">
            NUMBERHUB <span className="mx-1.5 text-emerald-400/60">·</span>
            EMAIL VERIFICATION
          </p>
          <p className="mt-2 text-[10px] text-white/25">
            Check availability and price before confirming a purchase.
          </p>
        </footer>
      </div>

      {showCancelConfirmation && selectedActivation && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-5 py-8 backdrop-blur-sm"
          role="presentation"
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-email-title"
            aria-describedby="cancel-email-description"
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101713] p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-xl text-red-200">
              !
            </div>

            <h2
              id="cancel-email-title"
              className="text-lg font-extrabold text-white"
            >
              Cancel this email activation?
            </h2>

            <p
              id="cancel-email-description"
              className="mt-3 text-sm leading-6 text-white/65"
            >
              This requests cancellation of your pending activation. If cancellation is confirmed and no verification code has been received, your wallet will be refunded. If the result is uncertain, check your activation history before trying again.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirmation(false)}
                disabled={cancelling}
                className="min-h-[46px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-white/75 disabled:opacity-50"
              >
                Keep activation
              </button>

              <button
                type="button"
                onClick={() => void cancelSelectedActivation()}
                disabled={cancelling}
                className="min-h-[46px] rounded-xl bg-red-500 px-3 text-xs font-extrabold text-white transition hover:bg-red-400 disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Confirm cancellation"}
              </button>
            </div>
          </section>
        </div>
      )}

      {showPurchaseConfirmation && selectedDomainInfo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-5 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowPurchaseConfirmation(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-purchase-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-300/20 bg-[#0b110e] shadow-2xl shadow-black/50"
          >
            <div className="border-b border-white/[0.07] bg-emerald-400/[0.06] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-emerald-700 text-lg font-black text-[#04120b]">
                  N
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                    NumberHub
                  </p>
                  <h2
                    id="email-purchase-dialog-title"
                    className="mt-1 text-lg font-black text-white"
                  >
                    Confirm email purchase
                  </h2>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-sm text-white/45">Website</span>
                  <span className="max-w-[65%] break-all text-right text-sm font-bold text-white">
                    {site}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] py-3">
                  <span className="text-sm text-white/45">Domain</span>
                  <span className="max-w-[65%] break-all text-right text-sm font-bold text-white">
                    {selectedDomainInfo.domain}
                  </span>
                </div>
                <div className="mt-1 border-t border-white/[0.07] pt-4">
                  <p className="text-xs text-white/45">Total purchase price</p>
                  <p className="mt-1 text-3xl font-black text-emerald-200">
                    {money(selectedDomainInfo.customerPriceNgn)}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-6 text-white/55">
                Your wallet will be charged if you confirm this purchase.
                Please review the details before continuing.
              </p>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPurchaseConfirmation(false)}
                  className="min-h-[50px] flex-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 text-sm font-bold text-white/75 transition hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void purchaseEmail(true)}
                  disabled={
                    purchasing ||
                    !selectedDomain ||
                    selectedDomainInfo.available === false ||
                    uncertainPurchase
                  }
                  className="min-h-[50px] flex-1 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-4 text-sm font-black text-[#04120b] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {purchasing ? "Processing…" : "Confirm Purchase"}
                </button>
              </div>
              <p className="text-center text-[10px] text-white/30">
                Secure purchase · Review before confirming
              </p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
