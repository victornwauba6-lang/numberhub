"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Login failed");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next || "/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-5 py-10 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center">
        <div className="mb-8">
          <div className="mb-4 text-2xl font-black tracking-tight">
            Number<span className="text-green-600">Hub</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to manage your wallet, orders, and numbers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-green-500 dark:border-zinc-800 dark:bg-zinc-900"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium">
                Password
              </label>

              <button
                type="button"
                className="text-xs font-medium text-green-600"
                onClick={() => router.push("/forgot-password")}
              >
                Forgot password?
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-green-500 dark:border-zinc-800 dark:bg-zinc-900"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2.5 text-base text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {showPassword ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 3.5l17 17M10.6 10.6a2 2 0 0 0 2.8 2.8M6.2 6.2C4.5 7.5 3.3 9.2 2.5 12c1.8 4.2 5.1 6.5 9.5 6.5 1.8 0 3.4-.4 4.8-1.1M9.9 5.7A10.4 10.4 0 0 1 12 5.5c4.4 0 7.7 2.3 9.5 6.5-.5 1.2-1.1 2.3-1.9 3.2" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.3-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.3 6.5-9.5 6.5S2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-green-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Don't have an account?{" "}
          <a
            href="/register"
            className="font-semibold text-green-600 hover:text-green-700"
          >
            Create account
          </a>
        </p>
      </div>
    </main>
  );
}
