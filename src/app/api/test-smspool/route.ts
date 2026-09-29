import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.SMSPOOL_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "SMSPOOL_API_KEY is not configured" },
      { status: 500 },
    );
  }

  try {
    const body = new URLSearchParams({
      api_key: apiKey,
      action: "getPrices",
      country: "1",
      service: "wa",
      setting: "smspool",
    });

    const response = await fetch(
      "https://api.smspool.net/stubs/handler_api",
      {
        method: "POST",
        headers: {
          Accept: "text/plain, application/json",
          "Content-Type": "application/x-www-form-urlencoded",
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
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "SMSPool request failed",
      },
      { status: 500 },
    );
  }
}
