"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyResetCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) {
      router.replace("/forgot-password");
    }
  }, [email, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Invalid verification code");
        return;
      }

      router.push(
        `/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`,
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080b0a] px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <section className="w-full">
          <button
            type="button"
            onClick={() => router.push("/forgot-password")}
            className="mb-8 text-sm text-white/60 transition hover:text-white"
          >
            ← Change email
          </button>

          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold tracking-wide text-emerald-400">
              NUMBERHUB
            </p>

            <h1 className="text-3xl font-semibold tracking-tight">
              Check your email
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/55">
              We sent a 6-digit verification code to{" "}
              <span className="text-white/80">{email}</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Verification code
              </label>

              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center text-2xl tracking-[0.5em] text-white outline-none transition placeholder:text-white/20 focus:border-emerald-400/50 focus:bg-white/[0.06]"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-white/35">
            The code expires after 10 minutes.
          </p>
        </section>
      </div>
    </main>
  );
}

export default function VerifyResetCodePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#080b0a] px-5 py-10 text-white">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
            <p className="text-sm text-white/50">Loading...</p>
          </div>
        </main>
      }
    >
      <VerifyResetCodeForm />
    </Suspense>
  );
}
