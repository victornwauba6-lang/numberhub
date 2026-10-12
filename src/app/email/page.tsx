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
  const [refreshing, setRefreshing] = useState(false);
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
        setMessage(data.error || "Unable to load your email history.");
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
        setMessage(data.error || "Unable to load email domains.");
        return;
      }

      setSite(normalizedSite);
      setDomains(data.domains ?? []);

      if ((data.domains ?? []).length === 0) {
        setMessage("No email domains were returned for this website.");
      }
    } catch {
      setMessage("Could not connect to the supplier. Please try again.");
    } finally {
      setLoadingDomains(false);
    }
  }

  async function purchaseEmail() {
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

    const confirmed = window.confirm(
      `Confirm email verification purchase\n\nWebsite: ${site}\nDomain: ${domain.domain}\nPrice: ${money(price)}\n\nYour wallet will be charged if the purchase proceeds. Continue?`,
    );

    if (!confirmed) return;

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
          data.error ||
            "The purchase outcome is uncertain. Do not purchase again; contact support for reconciliation.",
        );
        if (data.activationId) setSelectedId(data.activationId);
        await loadHistory();
        return;
      }

      if (!response.ok || !data.success || !data.activation) {
        setMessage(data.error || "The email purchase could not be completed.");
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
        setWarning(data.error || "The purchase needs support reconciliation.");
        return;
      }

      if (!response.ok || !data.success || !data.activation) {
        setWarning(data.error || "Could not refresh this activation.");
        return;
      }

      const activation = data.activation;

      setActivations((current) =>
        current.map((item) => (item.id === activation.id ? activation : item)),
      );

      setWarning(data.refreshWarning || "");
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
            Enter the website or service identifier accepted by the supplier.
            Available domains depend on supplier support and stock.
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
                placeholder="Enter supported website"
                autoComplete="off"
                required
                maxLength={120}
                className="min-h-[54px] w-full rounded-2xl border border-white/[0.10] bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40"
              />
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
                    {item.stock != null ? ` · Stock: ${item.stock}` : ""}
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

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/80">
                Your activity
              </p>
              <h2 className="mt-2 text-xl font-black">Email inbox & history</h2>
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
                        {activation.site} · {activation.domain}
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
                {selectedActivation.emailAddress || "Waiting for supplier"}
              </p>

              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-white/40">
                Verification code
              </p>
              <p className="mt-1 break-all font-mono text-2xl font-black tracking-wider text-emerald-200">
                {selectedActivation.otp || "Waiting for code…"}
              </p>

              {selectedActivation.errorMessage && (
                <p className="mt-3 text-xs leading-5 text-amber-200">
                  {selectedActivation.errorMessage}
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
    </main>
  );
}
