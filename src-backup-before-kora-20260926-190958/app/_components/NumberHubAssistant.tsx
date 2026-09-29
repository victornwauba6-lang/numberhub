"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ProductOption = {
  optionNumber: number;
  optionId: string;
  productOptionId: string | null;
  supplier: string;
  supplierOption: string;
  customerPriceNgn: number;
  available: boolean;
  materializedAvailable: boolean;
  purchasable: boolean;
  stock?: number | null;
};

type Order = {
  id: string;
  status: string;
  currency: string;
  priceMinor: string;
  refundEnabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  serviceSlug: string;
  serviceName: string;
  serviceIcon: string;
  optionName: string;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  content?: string;
  options?: ProductOption[];
  wallet?: {
    balanceMinor: string;
    currency: string;
  };
  orders?: Order[];
  catalogContext?: {
    country: string;
    service: string;
  };
  verification?: {
    orderId: string;
    status: string;
    phoneNumber: string | null;
    verificationCode: string | null;
    message: string | null;
    synced: boolean;
  };
};

type PendingPurchase = {
  option: ProductOption;
  country: string;
  service: string;
};

const countryAliases: Record<string, string> = {
  us: "usa",
  usa: "usa",
  america: "usa",
  "united states": "usa",
  uk: "uk",
  britain: "uk",
  england: "uk",
  canada: "canada",
  canadian: "canada",
  nigeria: "nigeria",
  nigerian: "nigeria",
  ghana: "ghana",
  india: "india",
  australia: "australia",
  germany: "germany",
  france: "france",
};

const serviceAliases: Record<string, string> = {
  whatsapp: "whatsapp",
  "whats app": "whatsapp",
  facebook: "facebook",
  fb: "facebook",
  telegram: "telegram",
  tiktok: "tiktok",
  instagram: "instagram",
  google: "google",
  gmail: "google",
};

const quickActions = [
  { label: "Find a number", icon: "⌕", message: "I need a number" },
  { label: "My wallet", icon: "₦", message: "How much is in my wallet?" },
  { label: "My orders", icon: "◷", message: "Show my orders" },
  { label: "Get help", icon: "?", message: "I need help" },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function money(minor: string | number, currency = "NGN") {
  const value = typeof minor === "number" ? minor : Number(minor);

  if (!Number.isFinite(value)) return "₦0";

  if (currency.toUpperCase() === "NGN") {
    return `₦${(value / 100).toLocaleString("en-NG", {
      maximumFractionDigits: 2,
    })}`;
  }

  return `${currency} ${(value / 100).toLocaleString()}`;
}

function detectCountry(text: string) {
  const normalized = text.toLowerCase();

  for (const [alias, value] of Object.entries(countryAliases)) {
    if (normalized.includes(alias)) return value;
  }

  return "";
}

function detectService(text: string) {
  const normalized = text.toLowerCase();

  for (const [alias, value] of Object.entries(serviceAliases)) {
    if (normalized.includes(alias)) return value;
  }

  return "";
}

function extractMaxPrice(text: string) {
  const match = text.match(
    /(?:under|below|less than|maximum|max)\s*₦?\s*([0-9][0-9,]*)/i,
  );

  if (!match?.[1]) return null;

  const value = Number(match[1].replace(/,/g, ""));

  return Number.isFinite(value) ? value : null;
}

function statusLabel(status: string) {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "Completed";
    case "PROCESSING":
      return "Processing";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    case "REFUNDED":
      return "Refunded";
    default:
      return "Pending";
  }
}

export default function NumberHubAssistant() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi, I’m your NumberHub assistant. I can help you find numbers, check your wallet, track orders, or guide you around NumberHub.",
    },
  ]);

  const [pendingPurchase, setPendingPurchase] =
    useState<PendingPurchase | null>(null);

  const lastSearchRef = useRef<{
    options: ProductOption[];
    country: string;
    service: string;
  } | null>(null);

  const pendingCatalogRef = useRef<{
    country: string;
    service: string;
    maxPriceNgn: number | null;
  }>({
    country: "",
    service: "",
    maxPriceNgn: null,
  });

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [open]);

  function addAssistant(
    text: string,
    extra?: {
      options?: ProductOption[];
      wallet?: {
        balanceMinor: string;
        currency: string;
      };
      orders?: Order[];
      catalogContext?: {
        country: string;
        service: string;
      };
      verification?: {
        orderId: string;
        status: string;
        phoneNumber: string | null;
        verificationCode: string | null;
        message: string | null;
        synced: boolean;
      };
    },
  ) {
    setMessages((current) => [
      ...current,
      {
        id: makeId(),
        role: "assistant",
        text,
        ...extra,
      },
    ]);
  }

  function addUser(text: string) {
    setMessages((current) => [
      ...current,
      {
        id: makeId(),
        role: "user",
        text,
      },
    ]);
  }

  async function action(body: Record<string, unknown>) {
    const response = await fetch("/api/assistant/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await response.text();

    let data: Record<string, any> = {};

    if (raw.trim()) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          response.ok
            ? "The assistant returned an invalid response. Please try again."
            : `Assistant request failed (${response.status}).`,
        );
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || `Assistant request failed (${response.status}).`);
    }

    return data;
  }

  async function loadWallet() {
    setBusy(true);

    try {
      const data = await action({ action: "wallet" });

      addAssistant("Here’s your current NumberHub wallet balance.", {
        wallet: data.wallet,
      });
    } catch (error) {
      addAssistant(
        error instanceof Error
          ? error.message
          : "I couldn't load your wallet right now.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadVerification() {
    setBusy(true);

    try {
      const data = await action({ action: "verification" });
      const verification = data?.verification;

      if (!verification) {
        addAssistant(
          data?.message ||
            "You do not have an active verification number right now.",
        );
        return;
      }

      addAssistant(
        verification.verificationCode
          ? "I found your active verification. Your number is below, and the verification code has been received."
          : "I found your active verification. Your number is ready and I’m still waiting for the SMS code.",
        { verification },
      );
    } catch (error) {
      addAssistant(
        error instanceof Error
          ? error.message
          : "I couldn't check your verification right now. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadOrders() {
    setBusy(true);

    try {
      const data = await action({ action: "orders" });

      addAssistant(
        data.orders?.length
          ? "Here are your latest NumberHub orders."
          : "You don't have any orders yet.",
        {
          orders: data.orders ?? [],
        },
      );
    } catch (error) {
      addAssistant(
        error instanceof Error
          ? error.message
          : "I couldn't load your orders right now.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function navigate(destination: string) {
    try {
      const data = await action({
        action: "navigate",
        destination,
      });

      setOpen(false);
      router.push(data.route);
    } catch {
      addAssistant("I couldn't open that section right now.");
    }
  }

  async function searchCatalog(text: string) {
    const country = detectCountry(text);
    const service = detectService(text);
    const maxPriceNgn = extractMaxPrice(text);

    if (!country || !service) {
      addAssistant(
        "Tell me the country and service you need, for example “US WhatsApp” or “Canada Telegram”.",
      );
      return;
    }

    setBusy(true);

    try {
      const data = await action({
        action: "catalog",
        country,
        service,
        maxPriceNgn,
        limit: 8,
      });

      const options = (data.options ?? []) as ProductOption[];

      if (!options.length) {
        addAssistant(
          maxPriceNgn
            ? `I couldn't find available ${service} options in ${country} under ₦${maxPriceNgn.toLocaleString()}.`
            : `I couldn't find available ${service} options for ${country} right now.`,
        );
        return;
      }

      const resolvedCountry = data.country || country;
      const resolvedService = data.service || service;

      lastSearchRef.current = {
        options,
        country: resolvedCountry,
        service: resolvedService,
      };

      addAssistant(
        `${resolvedCountry} · ${resolvedService}\n\nI found ${options.length} live marketplace option${options.length === 1 ? "" : "s"}.`,
        {
          options,
          catalogContext: {
            country: resolvedCountry,
            service: resolvedService,
          },
        },
      );
    } catch (error) {
      addAssistant(
        error instanceof Error
          ? error.message
          : "I couldn't load the live marketplace right now.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function purchase(
    option: ProductOption,
    country: string,
    service: string,
  ) {
    if (!option.productOptionId || !option.purchasable) {
      addAssistant(
        "That option isn't currently purchasable. Please choose another available option.",
      );
      return;
    }

    setPendingPurchase({
      option,
      country,
      service,
    });
  }

  async function confirmPurchase() {
    if (!pendingPurchase?.option.productOptionId) return;

    setBusy(true);

    try {
      const walletData = await action({ action: "wallet" });
      const balanceMinor = Number(walletData.wallet?.balanceMinor || 0);
      const priceMinor = Math.round(
        Number(pendingPurchase.option.customerPriceNgn || 0) * 100,
      );

      if (balanceMinor < priceMinor) {
        const neededMinor = priceMinor - balanceMinor;

        setPendingPurchase(null);

        addAssistant(
          `Insufficient wallet balance\n\nThis number costs ₦${Number(
            pendingPurchase.option.customerPriceNgn || 0,
          ).toLocaleString("en-NG")}, but your wallet balance is ${money(
            String(balanceMinor),
          )}.\n\nYou need ${money(
            String(neededMinor),
          )} more to complete this purchase.`,
        );

        return;
      }

      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productOptionId: pendingPurchase.option.productOptionId,
          idempotencyKey: `assistant-${crypto.randomUUID()}`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const serverError = String(
          data?.error || "The purchase could not be completed.",
        );

        if (/insufficient|balance|fund/i.test(serverError)) {
          setPendingPurchase(null);

          const latestWallet = await action({ action: "wallet" });
          const latestBalanceMinor = Number(
            latestWallet.wallet?.balanceMinor || 0,
          );
          const latestNeededMinor = Math.max(
            priceMinor - latestBalanceMinor,
            0,
          );

          addAssistant(
            `Insufficient wallet balance\n\nThis number costs ₦${Number(
              pendingPurchase.option.customerPriceNgn || 0,
            ).toLocaleString("en-NG")}, but your wallet balance is ${money(
              String(latestBalanceMinor),
            )}.\n\nYou need ${money(
              String(latestNeededMinor),
            )} more to complete this purchase.`,
          );

          return;
        }

        throw new Error(serverError);
      }

      setPendingPurchase(null);

      addAssistant(
        "Purchase confirmed successfully. Your order has been created and is now being processed.",
      );

      if (data.purchase?.orderId) {
        setTimeout(() => {
          setOpen(false);
          router.push(`/orders/${data.purchase.orderId}`);
        }, 700);
      }
    } catch (error) {
      addAssistant(
        error instanceof Error
          ? error.message
          : "The purchase could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runAiPlan(message: string) {
    const response = await fetch("/api/assistant/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "I couldn't understand that right now. Please try again.",
      );
    }

    return data?.plan;
  }

  async function handleMessage(rawText: string) {
    const text = rawText.trim();

    if (!text || busy) return;

    setInput("");
    addUser(text);

    const normalized = text.toLowerCase();

    /*
     * The AI planner is now the main interpreter.
     *
     * The only local interpretation kept here is selecting an option
     * from the customer's latest catalog search. Everything else goes
     * through the AI planner so natural English, Nigerian English,
     * Pidgin, slang, typos and new wording are understood.
     */

    const optionMatch = normalized.match(
      /(?:option|number)\s*#?\s*(\d+)\b/i,
    );

    if (optionMatch?.[1] && lastSearchRef.current) {
      const optionNumber = Number(optionMatch[1]);
      const search = lastSearchRef.current;

      const selected = search.options.find(
        (option) => Number(option.optionNumber) === optionNumber,
      );

      if (!selected) {
        addAssistant(
          `I couldn't find option ${optionNumber} in your latest search. Please choose one of the options I displayed.`,
        );
        return;
      }

      if (!selected.productOptionId || !selected.purchasable) {
        addAssistant(
          `Number ${optionNumber} is no longer purchasable. Please choose another available option.`,
        );
        return;
      }

      setPendingPurchase({
        option: selected,
        country: search.country,
        service: search.service,
      });

      return;
    }

    try {
      setBusy(true);

      const plan = await runAiPlan(text);

      if (!plan || typeof plan !== "object") {
        throw new Error(
          "I couldn't understand that request. Please try again.",
        );
      }

      const actionName = String(plan.action || "general");

      if (actionName === "catalog") {
        const detectedCountry = detectCountry(text);
        const detectedService = detectService(text);
        const detectedMaxPrice = extractMaxPrice(text);

        const country =
          detectedCountry ||
          String(plan.country || "").trim() ||
          pendingCatalogRef.current.country;

        const service =
          detectedService ||
          String(plan.service || "").trim() ||
          pendingCatalogRef.current.service;

        const maxPriceNgn =
          detectedMaxPrice ??
          (typeof plan.maxPriceNgn === "number" &&
          Number.isFinite(plan.maxPriceNgn)
            ? plan.maxPriceNgn
            : pendingCatalogRef.current.maxPriceNgn);

        pendingCatalogRef.current = {
          country,
          service,
          maxPriceNgn,
        };

        if (!country || !service) {
          if (plan.reply) {
            addAssistant(String(plan.reply));
          } else {
            const missing = [
              !country ? "country" : "",
              !service ? "service" : "",
            ].filter(Boolean);

            addAssistant(
              `Please tell me the ${missing.join(" and ")} you need.`,
            );
          }
          return;
        }

        await searchCatalog(
          `${country} ${service}${
            maxPriceNgn !== null ? ` under ₦${maxPriceNgn}` : ""
          }`,
        );
        return;
      }

      if (plan.reply) {
        addAssistant(String(plan.reply));
        return;
      }

      if (actionName === "wallet") {
        await loadWallet();
        return;
      }

      if (actionName === "orders") {
        await loadOrders();
        return;
      }

      if (actionName === "verification") {
        await loadVerification();
        return;
      }

      if (actionName === "navigate") {
        const destination = String(plan.destination || "").toLowerCase();

        const allowedDestinations: Record<string, string> = {
          wallet: "wallet",
          orders: "orders",
          market: "marketplace",
          marketplace: "marketplace",
          support: "support",
          profile: "profile",
          home: "home",
          transactions: "transactions",
        };

        const route = allowedDestinations[destination];

        if (!route) {
          addAssistant(
            "Which section would you like to open: Wallet, Orders, Marketplace, Transactions, Profile, or Support?",
          );
          return;
        }

        await navigate(route);
        return;
      }

      if (actionName === "customer_help") {
        const allowedTopics = new Set([
          "whatsapp",
          "verification",
          "numbers",
          "wallet",
          "orders",
          "general",
        ]);

        const topic = allowedTopics.has(String(plan.topic))
          ? String(plan.topic)
          : "general";

        const data = await action({
          action: "customer_help",
          topic,
        });

        addAssistant(
          data?.message ||
            "I can help with that. Tell me what you're trying to do and I'll guide you.",
        );

        return;
      }

      if (actionName === "catalog") {
        const country = String(plan.country || "").trim();
        const service = String(plan.service || "").trim();

        if (!country || !service) {
          const missing: string[] = [];

          if (!country) missing.push("country");
          if (!service) missing.push("service");

          addAssistant(
            `Sure. I can help you find a number. I just need your ${missing.join(
              " and ",
            )}. For example, you can say "US WhatsApp".`,
          );

          return;
        }

        const maxPrice =
          typeof plan.maxPriceNgn === "number" &&
          Number.isFinite(plan.maxPriceNgn)
            ? plan.maxPriceNgn
            : null;

        await searchCatalog(
          `${country} ${service}${maxPrice !== null ? ` under ₦${maxPrice}` : ""}`,
        );

        return;
      }

      if (actionName === "general") {
        try {
          const response = await fetch("/api/assistant", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ message: text }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
                "I couldn't answer that right now. Please try again.",
            );
          }

          addAssistant(
            data?.reply ||
              "I'm here to help. Could you tell me a little more about what you need?",
          );
        } catch (error) {
          addAssistant(
            error instanceof Error
              ? error.message
              : "I couldn't answer that right now. Please try again.",
          );
        }

        return;
      }

      addAssistant(
        "I'm here to help. Tell me what you need and I'll guide you.",
      );
    } catch (error) {
      addAssistant(
        error instanceof Error
          ? error.message
          : "I couldn't process that request right now. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void handleMessage(input);
  }

  return (
    <>
      {/* Floating assistant launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[88px] right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-[#0b1712] text-white shadow-[0_12px_40px_rgba(16,185,129,0.28)] transition-transform active:scale-95"
        aria-label="Open NumberHub Assistant"
      >
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-lg font-black text-[#06100b]">
          N
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#0b1712] bg-emerald-400" />
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close assistant"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <section className="relative flex h-[min(760px,92vh)] w-full max-w-lg flex-col overflow-hidden rounded-t-[30px] border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#08100c] sm:rounded-[30px]">
            {/* Header */}
            <div className="relative border-b border-black/5 bg-white/95 px-5 pb-4 pt-5 dark:border-white/5 dark:bg-[#0a1510]/95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-base font-black text-[#06100b] shadow-lg shadow-emerald-500/15">
                    N
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[15px] font-bold tracking-tight text-zinc-950 dark:text-white">
                        NumberHub Assistant
                      </h2>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Live
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Your personal connectivity guide
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.06] px-3 py-2.5">
                <span className="text-sm">✦</span>
                <p className="text-[11px] leading-4 text-zinc-600 dark:text-zinc-300">
                  I can search real NumberHub options, check your wallet and orders, and guide you through purchases.
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-zinc-50/80 px-4 py-5 dark:bg-[#07100c]">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    {message.role === "assistant" && (
                      <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                        N
                      </div>
                    )}

                    <div className="max-w-[88%] space-y-2">
                      <div
                        className={
                          message.role === "user"
                            ? "rounded-[20px] rounded-br-md bg-[#10241a] px-4 py-3 text-[13px] leading-5 text-white shadow-sm"
                            : "rounded-[20px] rounded-bl-md border border-black/5 bg-white px-4 py-3 text-[13px] leading-5 text-zinc-700 shadow-sm dark:border-white/5 dark:bg-[#101b16] dark:text-zinc-200"
                        }
                      >
                        {message.content ?? message.text}
                      </div>

                      {message.wallet && (
                        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#101b16]">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            Wallet balance
                          </p>
                          <p className="mt-1 text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
                            {money(message.wallet.balanceMinor)}
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate("/wallet")}
                            className="mt-3 w-full rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-bold text-[#06100b] transition-transform active:scale-[0.98]"
                          >
                            Fund wallet
                          </button>
                        </div>
                      )}

                      {message.verification && (
                        <div className="overflow-hidden rounded-2xl border border-emerald-500/15 bg-white shadow-sm dark:border-emerald-500/10 dark:bg-[#101b16]">
                          <div className="border-b border-black/5 bg-emerald-500/[0.06] px-4 py-3 dark:border-white/5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                  Active verification
                                </p>
                                <p className="mt-0.5 text-[13px] font-bold text-zinc-950 dark:text-white">
                                  Your NumberHub number
                                </p>
                              </div>
                              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {message.verification.status === "CODE_RECEIVED"
                                  ? "Code received"
                                  : message.verification.status === "COMPLETED"
                                    ? "Completed"
                                    : "Waiting for OTP"}
                              </span>
                            </div>
                          </div>

                          <div className="p-4">
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              Your verification number
                            </p>

                            <p className="mt-1 break-all text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
                              {message.verification.phoneNumber || "Number unavailable"}
                            </p>

                            {message.verification.verificationCode && (
                              <div className="mt-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                      Verification code
                                    </p>
                                    <p className="mt-1 text-2xl font-black tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                                      {message.verification.verificationCode}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (message.verification?.verificationCode) {
                                        void navigator.clipboard?.writeText(
                                          message.verification.verificationCode,
                                        );
                                      }
                                    }}
                                    className="rounded-xl border border-emerald-500/15 bg-white px-3 py-2 text-[10px] font-bold text-emerald-700 dark:bg-[#101b16] dark:text-emerald-400"
                                  >
                                    Copy code
                                  </button>
                                </div>
                              </div>
                            )}

                            {!message.verification.verificationCode && (
                              <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-white/[0.03]">
                                <p className="text-[10px] leading-4 text-zinc-500 dark:text-zinc-400">
                                  No verification code has arrived yet. I’ll only show it when the connected supplier actually receives one.
                                </p>
                              </div>
                            )}

                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (message.verification?.phoneNumber) {
                                    void navigator.clipboard?.writeText(
                                      message.verification.phoneNumber,
                                    );
                                  }
                                }}
                                className="flex-1 rounded-xl border border-black/5 bg-zinc-50 px-3 py-2.5 text-[10px] font-bold text-zinc-700 dark:border-white/5 dark:bg-white/[0.03] dark:text-zinc-200"
                              >
                                Copy number
                              </button>

                              <button
                                type="button"
                                onClick={() => navigate(`/orders/${message.verification?.orderId}`)}
                                className="flex-1 rounded-xl bg-[#10241a] px-3 py-2.5 text-[10px] font-bold text-white dark:bg-emerald-500 dark:text-[#06100b]"
                              >
                                View order
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => navigate("/dashboard")}
                              className="mt-2 w-full rounded-xl border border-emerald-500/15 px-3 py-2.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400"
                            >
                              View on dashboard →
                            </button>
                          </div>
                        </div>
                      )}

                      {message.options && message.options.length > 0 && (
                        <div className="space-y-1.5">
                          {message.options.map((option, index) => {
                            const serviceLabel =
                              message.catalogContext?.service
                                ? message.catalogContext.service
                                    .replace(/[-_]/g, " ")
                                    .replace(/\b\w/g, (char: string) =>
                                      char.toUpperCase(),
                                    )
                                : "Verification";

                            const countryLabel =
                              message.catalogContext?.country || "Selected country";

                            return (
                              <div
                                key={`${option.productOptionId}-${index}`}
                                className="rounded-xl border border-black/[0.06] bg-white px-3.5 py-3 dark:border-white/[0.06] dark:bg-[#101b16]"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                        {String(option.optionNumber).padStart(2, "0")}
                                      </span>

                                      <div className="min-w-0">
                                        <p className="truncate text-[12px] font-bold text-zinc-950 dark:text-white">
                                          {serviceLabel}
                                        </p>
                                        <p className="truncate text-[9px] text-zinc-500 dark:text-zinc-400">
                                          {countryLabel} · One-time SMS
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <p className="text-[13px] font-extrabold text-zinc-950 dark:text-white">
                                      ₦{Number(
                                        option.customerPriceNgn || 0,
                                      ).toLocaleString("en-NG")}
                                    </p>

                                    <p className="mt-0.5 flex items-center justify-end gap-1 text-[8px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                      Ready
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          <p className="px-1 pt-1 text-[9px] text-zinc-400 dark:text-zinc-500">
                            Tell me which option you want to buy.
                          </p>
                        </div>
                      )}

                      {message.orders && message.orders.length > 0 && (
                        <div className="space-y-2.5">
                          {message.orders.map((order) => (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="w-full rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99] dark:border-white/5 dark:bg-[#101b16]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[12px] font-bold text-zinc-950 dark:text-white">
                                    {order.optionName || `${order.serviceName} number`}
                                  </p>
                                  <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                                    {order.countryName} · {order.serviceName}
                                  </p>
                                </div>
                                <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-bold text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                                  {statusLabel(order.status)}
                                </span>
                              </div>

                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                                  {money(order.priceMinor)}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  View order →
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {busy && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                      N
                    </div>
                    <div className="rounded-[18px] rounded-bl-md border border-black/5 bg-white px-4 py-3 dark:border-white/5 dark:bg-[#101b16]">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions + composer */}
            <div className="border-t border-black/5 bg-white px-4 pb-4 pt-3 dark:border-white/5 dark:bg-[#0a1510]">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {quickActions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleMessage(item.message)}
                    className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-semibold text-zinc-600 transition-colors hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5 focus-within:border-emerald-400 dark:border-white/10 dark:bg-white/[0.04]">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={busy}
                  placeholder="Ask NumberHub anything…"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
                />

                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10241a] text-white transition-transform active:scale-95 disabled:opacity-40 dark:bg-emerald-500 dark:text-[#06100b]"
                  aria-label="Send message"
                >
                  ↑
                </button>
              </form>

              <p className="mt-2 text-center text-[9px] text-zinc-400">
                Real account data · Secure NumberHub actions
              </p>
            </div>
          </section>
        </div>
      )}

      {/* Purchase confirmation */}
      {pendingPurchase && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-5">
          <button
            type="button"
            aria-label="Close purchase confirmation"
            onClick={() => setPendingPurchase(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-sm rounded-[28px] border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#0d1712]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-xl text-emerald-500">
              ✓
            </div>

            <h3 className="mt-4 text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
              Confirm purchase
            </h3>

            <p className="mt-2 text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">
              {pendingPurchase.country} · One-time SMS
            </p>
            <p className="mt-1 text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">
              You’ll be charged from your NumberHub wallet only after you confirm.
            </p>

            <div className="mt-4 rounded-2xl bg-zinc-50 p-4 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Product
                </span>
                <span className="max-w-[60%] text-right text-[11px] font-semibold text-zinc-900 dark:text-white">
                  {`${pendingPurchase.service
                    .replace(/[-_]/g, " ")
                    .replace(/\b\w/g, (char) => char.toUpperCase())} Number #${pendingPurchase.option.optionNumber}`}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Price
                </span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {`₦${Number(
                    pendingPurchase.option.customerPriceNgn || 0
                  ).toLocaleString("en-NG")}`}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPendingPurchase(null)}
                className="rounded-2xl border border-zinc-200 px-4 py-3 text-xs font-bold text-zinc-600 dark:border-white/10 dark:text-zinc-300"
              >
                Not now
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmPurchase()}
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-[#06100b] shadow-lg shadow-emerald-500/10 disabled:opacity-50"
              >
                {busy ? "Processing…" : "Confirm & buy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
