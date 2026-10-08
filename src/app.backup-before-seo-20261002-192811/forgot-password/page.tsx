"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email address");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to send verification code");
        return;
      }

      router.push(
        `/forgot-password/verify?email=${encodeURIComponent(
          email.trim().toLowerCase(),
        )}`,
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
            onClick={() => router.push("/login")}
            className="mb-8 text-sm text-white/60 transition hover:text-white"
          >
            ← Back to login
          </button>

          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold tracking-wide text-emerald-400">
              NUMBERHUB
            </p>

            <h1 className="text-3xl font-semibold tracking-tight">
              Forgot your password?
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/55">
              Enter the email address connected to your account and we&apos;ll
              send you a 6-digit verification code.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-400/50 focus:bg-white/[0.06]"
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
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending code..." : "Send verification code"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
