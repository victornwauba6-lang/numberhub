import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SMSBULK_API_URL = "https://smsbulk.net/api/v1";

type DomainRecord = {
  name?: unknown;
  domain?: unknown;
  price?: unknown;
  count?: unknown;
  stock?: unknown;
  currency?: unknown;
  disabled?: unknown;
};

function extractDomains(value: unknown): DomainRecord[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is DomainRecord =>
        typeof item === "object" &&
        item !== null &&
        !Array.isArray(item),
    );
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  const object = value as Record<string, unknown>;

  for (const key of ["domains", "data", "results"]) {
    if (key in object) {
      const result = extractDomains(object[key]);
      if (result.length > 0) return result;
    }
  }

  return [];
}

function numericValue(value: unknown): number | null {
  if (
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    return null;
  }

  if (String(value).trim() === "") return null;

  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : null;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const apiKey = process.env.SMSBULK_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Email verification is temporarily unavailable.",
        },
        { status: 503 },
      );
    }

    const requestUrl = new URL(request.url);
    const site = (
      requestUrl.searchParams.get("site") ?? ""
    ).trim().toLowerCase();

    if (
      !site ||
      site.length > 253 ||
      !/^[a-z0-9.-]+$/.test(site) ||
      site.startsWith(".") ||
      site.endsWith(".") ||
      site.includes("..")
    ) {
      return NextResponse.json(
        { success: false, error: "Enter a valid website." },
        { status: 400 },
      );
    }

    const providerResponse = await fetch(
      `${SMSBULK_API_URL}/email-activations/domains?site=${encodeURIComponent(site)}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );

    const responseText = await providerResponse.text();

    let payload: unknown;

    try {
      payload = responseText ? JSON.parse(responseText) : null;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "The email provider returned an invalid response.",
        },
        { status: 502 },
      );
    }

    if (!providerResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            providerResponse.status === 404
              ? "No email domains were found for this website."
              : "Unable to retrieve email domains right now.",
        },
        {
          status:
            providerResponse.status === 404 ? 404 : 502,
        },
      );
    }

    const domains = extractDomains(payload);
    const results = [];

    for (const domain of domains) {
      const name =
        typeof domain.name === "string"
          ? domain.name
          : typeof domain.domain === "string"
            ? domain.domain
            : "";

      const cost = numericValue(domain.price);
      const currency =
        typeof domain.currency === "string"
          ? domain.currency.toUpperCase()
          : "USD";

      if (!name || cost === null) continue;

      results.push({
        domain: name,
        supplierPrice: cost,
        supplierCurrency: currency,
        customerPriceMinor: 45000,
        customerPriceNgn: 450,
        pricingSource: "fixed_email_price",
        available:
          domain.disabled !== true &&
          numericValue(domain.count ?? domain.stock) !== 0,
        stock: numericValue(domain.count ?? domain.stock),
      });
    }

    return NextResponse.json({
      success: true,
      site,
      domains: results,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "TimeoutError"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "The email provider took too long to respond.",
        },
        { status: 504 },
      );
    }

    console.error("Email domain catalog error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load email domains.",
      },
      { status: 500 },
    );
  }
}
