import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { withTransaction } from "@/lib/db-transaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SMSBULK_API_URL = "https://smsbulk.net/api/v1";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const apiKey = process.env.SMSBULK_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "SMSBulk API key is not configured." },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const rawLimit = Number(url.searchParams.get("limit") ?? "25");
    const limit = Number.isInteger(rawLimit)
      ? Math.min(100, Math.max(1, rawLimit))
      : 25;

    const params = new URLSearchParams({
      limit: String(limit),
      status: "PENDING,WAITING",
    });
    const cursor = url.searchParams.get("cursor");
    if (cursor) params.set("cursor", cursor);

    const [providerResponse, uncertainOrders] = await Promise.all([
      fetch(`${SMSBULK_API_URL}/activations?${params}`, {
        method: "GET",
        headers: { "x-api-key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      }),
      withTransaction(async (client) => {
        const result = await client.query(
          `
            SELECT
              o.id AS "orderId",
              o.status AS "orderStatus",
              c.code AS "countryCode",
              s.slug AS "serviceSlug",
              sr.id AS "supplierRequestId",
              sr.status AS "supplierRequestStatus",
              sr.request_payload AS "requestPayload",
              sr.updated_at AS "requestUpdatedAt"
            FROM supplier_requests sr
            JOIN orders o ON o.id = sr.order_id
            JOIN suppliers sup ON sup.id = sr.supplier_id
            JOIN countries c ON c.id = o.country_id
            JOIN services s ON s.id = o.service_id
            WHERE LOWER(sup.slug) = 'smsbulk'
              AND sr.request_type = 'ACTIVATE_NUMBER'
              AND sr.status = 'TIMEOUT'
              AND o.status = 'PROCESSING'
            ORDER BY sr.updated_at DESC
            LIMIT 100
          `,
        );
        return result.rows;
      }),
    ]);

    const responseText = await providerResponse.text();
    let activations: unknown;
    try {
      activations = responseText ? JSON.parse(responseText) : null;
    } catch {
      return NextResponse.json(
        { success: false, error: "SMSBulk returned an invalid response." },
        { status: 502 },
      );
    }

    if (!providerResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "SMSBulk activation lookup failed.",
          providerStatus: providerResponse.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      uncertainOrders,
      activations,
      note: "Review matches manually. This endpoint does not assign numbers, refund orders, or make purchases.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Activation lookup failed.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
