"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { useEffect } from "react";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!posthogKey || posthog.__loaded) return;

    posthog.init(posthogKey, {
      api_host: posthogHost,
      defaults: "2025-05-24",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      capture_performance: true,
    });
  }, []);

  if (!posthogKey) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
