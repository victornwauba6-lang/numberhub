const SMSBULK_EMAIL_API_URL = "https://smsbulk.net/api/v1";

export class SmsbulkEmailError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "SmsbulkEmailError";
    this.status = status;
    this.details = details;
  }
}

export async function smsbulkEmailRequest<T = unknown>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    body?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const apiKey = process.env.SMSBULK_API_KEY?.trim();

  if (!apiKey) {
    throw new SmsbulkEmailError(
      "SMSBulk is not configured.",
      503,
    );
  }

  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("..")
  ) {
    throw new SmsbulkEmailError(
      "Invalid SMSBulk request path.",
      400,
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${SMSBULK_EMAIL_API_URL}${path}`,
      {
        method: options.method ?? "GET",
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(options.body
          ? { body: JSON.stringify(options.body) }
          : {}),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
  } catch {
    throw new SmsbulkEmailError(
      "Unable to confirm the response from SMSBulk.",
      504,
    );
  }

  const responseText = await response.text();

  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new SmsbulkEmailError(
        "SMSBulk returned an invalid response.",
        502,
      );
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
          ? payload.error
          : "SMSBulk request failed.";

    throw new SmsbulkEmailError(
      message,
      response.status,
      payload,
    );
  }

  return payload as T;
}
