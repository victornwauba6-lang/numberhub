import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.SMSPOOL_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "SMSPOOL_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const body = new URLSearchParams({
    key: apiKey,
    country: "INVALID",
    service: "INVALID",
  });

  const response = await fetch(
    "https://api.smspool.net/purchase/sms",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    },
  );

  const text = await response.text();

  return NextResponse.json({
    ok: response.ok,
    httpStatus: response.status,
    response: text,
  });
}
