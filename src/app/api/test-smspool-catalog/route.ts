import { NextResponse } from "next/server";

async function request(
  apiKey: string,
  endpoint: string,
  params: Record<string, string> = {},
) {
  const response = await fetch(`https://api.smspool.net${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      key: apiKey,
      ...params,
    }),
  });

  const text = await response.text();

  return {
    status: response.status,
    text,
  };
}

export async function GET() {
  const apiKey = process.env.SMSPOOL_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "SMSPOOL_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const [countries, services, pools, prices] = await Promise.all([
    request(apiKey, "/country/retrieve_all"),
    request(apiKey, "/service/retrieve_all"),
    request(apiKey, "/pool/retrieve_all"),
    request(apiKey, "/request/price", {
      country: "US",
      service: "329",
    }),
  ]);

  return NextResponse.json({
    ok: true,
    countries,
    services,
  });
}
