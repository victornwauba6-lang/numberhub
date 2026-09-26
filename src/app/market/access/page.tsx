import Link from "next/link";

export default function MarketplaceAccessPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
        <div className="mb-10">
          <div className="text-sm font-black tracking-tight">NumberHub</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
            Marketplace
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-[-0.04em]">
            Continue to the marketplace.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Sign in to your account or create a new account to continue.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/login?next=/market"
            className="flex w-full items-center justify-center rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-[#06100c] transition hover:bg-emerald-300"
          >
            Sign in →
          </Link>

          <Link
            href="/register?next=/market"
            className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.07]"
          >
            Create account →
          </Link>
        </div>

        <p className="mt-8 text-center text-[11px] leading-5 text-slate-400">
          Already have an account? Sign in. New to the marketplace? Create your
          account to get started.
        </p>
      </div>
    </main>
  );
}
