const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  if (!posthogKey || !distinctId || !event) {
    return;
  }

  try {
    const response = await fetch(`${posthogHost}/i/v0/e/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: posthogKey,
        event,
        distinct_id: distinctId,
        properties,
      }),
    });

    if (!response.ok) {
      console.error(
        `[PostHog] Event failed: ${event} (${response.status})`,
      );
    }
  } catch (error) {
    console.error("[PostHog] Failed to send event:", error);
  }
}
