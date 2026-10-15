"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export default function StartupExperience({
  children,
}: {
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(5);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let finished = false;
    let progressInterval: ReturnType<typeof setInterval> | undefined;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;

    progressInterval = setInterval(() => {
      setProgress((current) => {
        if (current >= 90) return 90;

        const step = current < 35 ? 4 : current < 70 ? 2 : 1;
        return Math.min(90, current + step);
      });
    }, 90);

    const finishLoading = () => {
      if (finished) return;
      finished = true;

      if (progressInterval) clearInterval(progressInterval);

      const remaining = Math.max(0, 1000 - (Date.now() - startedAt));

      finishTimer = setTimeout(() => {
        setProgress(100);
        setFading(true);

        removeTimer = setTimeout(() => {
          setVisible(false);
        }, 550);
      }, remaining);
    };

    if (document.readyState === "complete") {
      finishLoading();
    } else {
      window.addEventListener("load", finishLoading, { once: true });
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (finishTimer) clearTimeout(finishTimer);
      if (removeTimer) clearTimeout(removeTimer);
      window.removeEventListener("load", finishLoading);
    };
  }, []);

  return (
    <>
      {children}

      {visible && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-[#06130E] px-6 text-white transition-opacity duration-500 ${
            fading ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-emerald-500/[0.10] blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-teal-400/[0.08] blur-[110px]" />

          <div className="relative w-full max-w-md">
            <div className="mb-16 flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-2xl shadow-lg shadow-emerald-500/20">
                <img
                  src="/brand/numberhub-symbol.svg"
                  alt="NumberHub"
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <div className="text-xl font-black tracking-tight">
                  NumberHub
                </div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-300/70">
                  Global connectivity
                </div>
              </div>
            </div>

            <div className="mb-9 flex justify-center">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-[30px] border border-emerald-300/15 bg-emerald-400/[0.06] shadow-[0_0_70px_rgba(16,185,129,0.08)]">
                <div className="absolute inset-2 rounded-[23px] border border-white/[0.05]" />
                <svg
                  viewBox="0 0 48 48"
                  className="h-12 w-12 text-emerald-300"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="12"
                    y="5"
                    width="24"
                    height="38"
                    rx="6"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 12h12M20 36h8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M19 23h10m-5-5 5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300/80">
                Your digital experience
              </p>

              <h1 className="text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                Your connections.
                <span className="mt-1 block text-emerald-300">
                  Simplified.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-white/55">
                We're preparing your NumberHub experience. Please keep this
                page open for a moment.
              </p>
            </div>

            <div className="mt-12">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-white/70">
                  Preparing NumberHub
                </span>
                <span className="flex items-center gap-2 text-xs text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                  Please wait
                </span>
              </div>

              <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.09]">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-200 shadow-[0_0_16px_rgba(52,211,153,0.45)] transition-[width] duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-y-0 right-0 w-12 bg-white/40 blur-sm" />
                </div>
              </div>

              <p className="mt-4 text-center text-[11px] leading-5 text-white/35">
                Virtual numbers · SMS verification · Digital connectivity
              </p>
            </div>

            <div className="mt-12 flex items-center justify-center gap-2 border-t border-white/[0.08] pt-5 text-[11px] text-white/40">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-emerald-300/70"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 3 19 6v5c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V6l7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Built for a smooth, simple experience
            </div>
          </div>
        </div>
      )}
    </>
  );
}
