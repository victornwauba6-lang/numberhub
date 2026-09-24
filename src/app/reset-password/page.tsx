"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";
  const code = searchParams.get("code") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to reset password");
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!email || !code) {
    return (
      <main className="min-h-screen bg-[#080b0a] px-5 py-10 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
          <section className="w-full text-center">
            <h1 className="text-2xl font-semibold">Reset link is incomplete</h1>
            <p className="mt-3 text-sm text-white/50">
              Please start the password reset process again.
            </p>

            <button
              type="button"
              onClick={() => router.replace("/forgot-password")}
              className="mt-6 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black"
            >
              Start again
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080b0a] px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <section className="w-full">
          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold tracking-wide text-emerald-400">
              NUMBERHUB
            </p>

            <h1 className="text-3xl font-semibold tracking-tight">
              Create a new password
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/55">
              Choose a new password for your account. You&apos;ll be signed in
              automatically after it is changed.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                New password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-400/50 focus:bg-white/[0.06]"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Confirm new password
              </label>

              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your password again"
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
              disabled={loading || !password || !confirmPassword}
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Updating password..." : "Reset password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}
