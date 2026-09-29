"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  fullName: string | null;
  role?: string;
};

function getInitials(name: string | null, email: string) {
  const source = name?.trim() || email.split("@")[0] || "N";
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts.map((part) => part[0]).join("").toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          throw new Error("Unexpected server response");
        }

        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
          router.replace("/login?next=/profile");
          return;
        }

        if (!cancelled) {
          setUser(data.user);
        }
      } catch {
        if (!cancelled) {
          setError("We couldn't load your account details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    if (signingOut) return;

    try {
      setSigningOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.replace("/login");
        router.refresh();
        return;
      }

      setError("We couldn't sign you out. Please try again.");
    } catch {
      setError("We couldn't sign you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const displayName =
    user?.fullName?.trim() || "NumberHub customer";

  const initials = user
    ? getInitials(user.fullName, user.email)
    : "NH";

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <main className="min-h-screen bg-[#080b0a] text-white">
      <div className="mx-auto min-h-screen max-w-4xl px-4 pb-28 sm:px-6">

        <header className="sticky top-0 z-20 -mx-4 border-b border-white/[0.07] bg-[#080b0a]/90 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-base font-black text-emerald-400">
                N
              </div>

              <div>
                <p className="text-sm font-black tracking-tight">
                  NumberHub
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                  Digital connectivity
                </p>
              </div>
            </Link>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-emerald-400">
              {loading ? "…" : initials}
            </div>
          </div>
        </header>

        <section className="pt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
            Account
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            Your profile
          </h1>

          <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
            Manage your NumberHub account, wallet, orders and security.
          </p>
        </section>

        <section className="pt-6">
          <div className="nh-wallet relative overflow-hidden p-6">
            <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-40 w-40 rounded-full bg-emerald-400/[0.06] blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-emerald-300/20 bg-emerald-400/10 text-lg font-black text-emerald-400">
                  {loading ? "…" : initials}
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                    Welcome back
                  </p>

                  <h2 className="mt-1 truncate text-xl font-black tracking-tight">
                    {loading ? "Loading..." : displayName}
                  </h2>

                  <p className="mt-1 truncate text-xs font-medium text-white/35">
                    {loading ? "Loading account" : user?.email}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/25">
                    Account status
                  </p>

                  <p className="mt-1 text-sm font-black text-white/80">
                    Active customer
                  </p>
                </div>

                <span className="flex items-center gap-2 text-xs font-black text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(53,208,127,.7)]" />
                  Secure
                </span>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm font-medium text-red-300">
            {error}
          </div>
        )}

        {isAdmin && (
          <section className="pt-8">
            <Link
              href="/admin"
              className="group flex items-center gap-4 rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.06] px-5 py-4 shadow-[0_18px_50px_rgba(16,185,129,0.06)] transition hover:border-emerald-400/25 hover:bg-emerald-400/[0.09]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#062d1d] text-sm font-black text-emerald-300 shadow-[0_8px_20px_rgba(0,0,0,.18)]">
                A
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white">
                  Admin Console
                </p>
                <p className="mt-0.5 text-xs text-white/35">
                  Manage NumberHub operations
                </p>
              </div>

              <span className="text-lg text-white/20 transition group-hover:translate-x-1 group-hover:text-emerald-400">
                ›
              </span>
            </Link>
          </section>
        )}

        <section className="pt-8">
          <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
            Manage
          </p>

          <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] shadow-[0_18px_50px_rgba(0,0,0,.18)]">

            <Link
              href="/wallet"
              className="group flex items-center gap-4 border-b border-white/[0.06] px-4 py-4 transition hover:bg-white/[0.035]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10 text-lg font-black text-emerald-400">
                ₦
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Transaction</p>
                <p className="mt-0.5 text-xs text-white/35">
                  Fund and manage your wallet
                </p>
              </div>

              <span className="text-lg text-white/20 transition group-hover:translate-x-0.5 group-hover:text-emerald-400">
                ›
              </span>
            </Link>

            <Link
              href="/orders"
              className="group flex items-center gap-4 border-b border-white/[0.06] px-4 py-4 transition hover:bg-white/[0.035]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-lg font-black text-white/65">
                □
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Orders</p>
                <p className="mt-0.5 text-xs text-white/35">
                  Track your connectivity purchases
                </p>
              </div>

              <span className="text-lg text-white/20 transition group-hover:translate-x-0.5 group-hover:text-emerald-400">
                ›
              </span>
            </Link>

            <Link
              href="/transactions"
              className="group flex items-center gap-4 px-4 py-4 transition hover:bg-white/[0.035]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-lg font-black text-white/65">
                ↔
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Transactions</p>
                <p className="mt-0.5 text-xs text-white/35">
                  View your wallet activity
                </p>
              </div>

              <span className="text-lg text-white/20 transition group-hover:translate-x-0.5 group-hover:text-emerald-400">
                ›
              </span>
            </Link>

          </div>
        </section>

        <section className="pt-7">
          <p className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
            Support & legal
          </p>

          <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] shadow-[0_18px_50px_rgba(0,0,0,.18)]">

            <Link
              href="/support"
              className="group flex items-center gap-4 border-b border-white/[0.06] px-4 py-4 transition hover:bg-white/[0.035]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-lg font-black text-white/65">
                ?
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Help & support</p>
                <p className="mt-0.5 text-xs text-white/35">
                  Get help with NumberHub
                </p>
              </div>

              <span className="text-lg text-white/20 transition group-hover:text-emerald-400">
                ›
              </span>
            </Link>

            <a
              href="https://whatsapp.com/channel/0029VbDRxIfD38CSw1z02m3H"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 border-b border-white/[0.06] px-4 py-4 transition hover:bg-white/[0.035]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-400">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-current"
                  aria-hidden="true"
                >
                  <path d="M12 2a9.9 9.9 0 0 0-8.57 14.87L2 22l5.31-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.07-1.11l-.29-.17-3.15.83.84-3.06-.19-.3A8 8 0 1 1 12 20Zm4.38-5.99c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">
                  WhatsApp Channel
                </p>
                <p className="mt-0.5 text-xs text-white/35">
                  Follow NumberHub updates and announcements
                </p>
              </div>

              <span className="text-lg text-white/20 transition group-hover:translate-x-0.5 group-hover:text-emerald-400">
                ↗
              </span>
            </a>

            <Link
              href="/terms"
              className="group flex items-center gap-4 border-b border-white/[0.06] px-4 py-4 transition hover:bg-white/[0.035]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-lg font-black text-white/65">
                ✓
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Terms & conditions</p>
                <p className="mt-0.5 text-xs text-white/35">
                  Review NumberHub terms
                </p>
              </div>

              <span className="text-lg text-white/20 transition group-hover:text-emerald-400">
                ›
              </span>
            </Link>

            <Link
              href="/privacy"
              className="group flex items-center gap-4 px-4 py-4 transition hover:bg-white/[0.035]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035] text-lg font-black text-white/65">
                ◉
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Privacy</p>
                <p className="mt-0.5 text-xs text-white/35">
                  Learn how your data is handled
                </p>
              </div>

              <span className="text-lg text-white/20 transition group-hover:text-emerald-400">
                ›
              </span>
            </Link>

          </div>
        </section>

        <section className="pt-7">
          <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.06] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-400">
                ✓
              </div>

              <div>
                <p className="text-sm font-black text-emerald-300">
                  Your account is protected
                </p>

                <p className="mt-2 text-xs leading-5 text-white/35">
                  Your NumberHub account activity is connected to your secure
                  customer session.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-8 pt-7">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-4 py-4 text-sm font-black text-red-300 transition hover:border-red-400/25 hover:bg-red-400/[0.08] disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>

          <p className="mt-5 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">
            NumberHub · Digital connectivity marketplace
          </p>
        </section>
      </div>

      <nav className="nh-bottom-nav fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto grid max-w-4xl grid-cols-5 gap-1">
          {[
            ["⌂", "Home", "/dashboard"],
            ["◈", "Market", "/market"],
            ["▣", "Orders", "/orders"],
            ["⇄", "Transaction", "/transactions"],
            ["●", "Me", "/profile"],
          ].map(([icon, label, href]) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-black transition ${
                label === "Me"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "text-white/30 hover:text-white/70"
              }`}
            >
              <span className="text-base" aria-hidden="true">
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
