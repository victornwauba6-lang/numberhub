"use client";

import { useState } from "react";
import Link from "next/link";

type Message = {
  role: "user" | "assistant";
  text: string;
};



function getAnswer(question: string) {
  const q = question.toLowerCase();

  if (
    q.includes("buy") ||
    q.includes("purchase") ||
    q.includes("number")
  ) {
    return "To buy a number, open the Marketplace, choose a country and service, select an available product, then continue through the purchase flow. Your wallet is used for eligible purchases.";
  }

  if (
    q.includes("fund") ||
    q.includes("wallet") ||
    q.includes("deposit")
  ) {
    return "You can fund your NumberHub wallet from the Wallet section. Once a supported payment method is connected, your wallet can be used for eligible purchases.";
  }

  if (
    q.includes("country") ||
    q.includes("countries") ||
    q.includes("available")
  ) {
    return "NumberHub currently has marketplace pages for the United States, United Kingdom, Canada and Germany. Actual product availability depends on connected suppliers and live inventory.";
  }

  if (
    q.includes("order") ||
    q.includes("track") ||
    q.includes("purchase")
  ) {
    return "After a purchase, you can track your order from the Orders section of your NumberHub account. Order information comes from the NumberHub system.";
  }

  if (q.includes("refund")) {
    return "Refund eligibility depends on the product and its refund rules. Check the product details before purchasing, or contact NumberHub Support if you need help.";
  }

  if (
    q.includes("support") ||
    q.includes("help") ||
    q.includes("contact")
  ) {
    return "I'm happy to help with general NumberHub questions. For account-specific assistance, contact NumberHub Support at numberhubsupport@gmail.com.";
  }

  return "I can help with buying numbers, wallet funding, countries, orders and refunds. Choose one of the quick actions below or ask me another NumberHub question.";
}

export default function NumberHubAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Welcome to NumberHub 👋\nI'm your AI support assistant. What can I help you with today?",
    },
  ]);

  function sendMessage(text = input) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "assistant", text: getAnswer(trimmed) },
    ]);
    setInput("");
  }

  return (
    <>
      {open && (
        <div className="fixed inset-x-3 bottom-20 z-[90] mx-auto flex h-[min(650px,calc(100vh-100px))] max-w-[410px] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[#09130f] sm:right-6 sm:left-auto sm:bottom-24 sm:h-[650px]">
          {/* Header */}
          <div className="relative overflow-hidden bg-slate-950 px-5 pb-5 pt-5 text-white dark:bg-[#0b2419]">
            <div className="absolute -right-10 -top-16 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl" />
            <div className="absolute -bottom-20 -left-10 h-36 w-36 rounded-full bg-teal-400/10 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-lg shadow-lg shadow-emerald-900/30">
                  ✨
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-black tracking-tight">
                      NumberHub AI
                    </span>
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-300">
                      Support
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Ready to help
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close NumberHub AI"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-xl text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="relative mt-5">
              <p className="text-[11px] leading-5 text-slate-400">
                Ask about products, wallet funding, orders and getting started.
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 dark:bg-[#07100c]">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs dark:bg-emerald-950/60">
                    ✨
                  </div>
                )}

                <div
                  className={`max-w-[82%] whitespace-pre-line rounded-[18px] px-4 py-3 text-[13px] leading-5 ${
                    message.role === "user"
                      ? "rounded-br-md bg-emerald-600 text-white shadow-sm"
                      : "rounded-bl-md border border-slate-200/80 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="pt-1">
                

                
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#09130f]">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/10 dark:border-white/10 dark:bg-white/[0.04]">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
                placeholder="Ask anything about NumberHub..."
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[12px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-white"
              />

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ↑
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-[9px] text-slate-400">
                NumberHub customer assistance
              </span>
              <a
                href="mailto:numberhubsupport@gmail.com"
                className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open NumberHub AI"
        className={`fixed bottom-5 right-5 z-[90] flex items-center gap-2.5 rounded-full px-4 py-3.5 text-[12px] font-black text-white shadow-[0_12px_35px_rgba(5,150,105,0.3)] transition-all duration-300 hover:-translate-y-1 ${
          open
            ? "bg-slate-900 dark:bg-white dark:text-slate-900"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            open
              ? "bg-white/10 dark:bg-slate-900/10"
              : "bg-white/15"
          }`}
        >
          {open ? "×" : "✨"}
        </span>
        <span className="hidden sm:inline">
          {open ? "Close assistant" : "Ask NumberHub AI"}
        </span>
        <span className="sm:hidden">{open ? "Close" : "AI Help"}</span>
      </button>
    </>
  );
}
