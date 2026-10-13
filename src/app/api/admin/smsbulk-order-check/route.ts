import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { withTransaction } from "@/lib/db-transaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET_ORDER_ID = "84bd38ba-cfb0-4c22-8230-5fc75fc2a64c";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId")?.trim();

    if (orderId !== TARGET_ORDER_ID) {
      return NextResponse.json(
        { success: false, error: "Order is not approved for this diagnostic." },
        { status: 400 },
      );
    }

    const result = await withTransaction(async (client) => {
      const orderResult = await client.query(
        `
          SELECT
            o.id AS "orderId",
            o.status AS "orderStatus",
            o.refund_enabled_snapshot AS "refundEnabled",
            o.price_minor::text AS "priceMinor",
            o.currency,
            c.code AS "countryCode",
            s.slug AS "serviceSlug"
          FROM orders o
          LEFT JOIN countries c ON c.id = o.country_id
          LEFT JOIN services s ON s.id = o.service_id
          WHERE o.id = $1
          LIMIT 1
        `,
        [orderId],
      );

      if (orderResult.rowCount !== 1) return null;

      const requestResult = await client.query(
        `
          SELECT
            sr.id AS "supplierRequestId",
            sr.status AS "supplierRequestStatus",
            sr.request_type AS "requestType",
            sr.updated_at AS "updatedAt"
          FROM supplier_requests sr
          JOIN suppliers sup ON sup.id = sr.supplier_id
          WHERE sr.order_id = $1
            AND LOWER(sup.slug) = 'smsbulk'
          ORDER BY sr.created_at DESC
          LIMIT 1
        `,
        [orderId],
      );

      const numberResult = await client.query(
        `
          SELECT COUNT(*)::text AS "assignedNumberCount"
          FROM verification_numbers
          WHERE order_id = $1
        `,
        [orderId],
      );

      const refundResult = await client.query(
        `
          SELECT
            id AS "refundId",
            status,
            amount_minor::text AS "amountMinor",
            currency,
            wallet_transaction_id AS "walletTransactionId",
            reason,
            created_at AS "createdAt"
          FROM refunds
          WHERE order_id = $1
          ORDER BY created_at DESC
        `,
        [orderId],
      );

      return {
        order: orderResult.rows[0],
        supplierRequest: requestResult.rows[0] ?? null,
        assignedNumberCount: numberResult.rows[0].assignedNumberCount,
        refunds: refundResult.rows,
      };
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      readOnly: true,
      diagnostic: result,
      note: "No order, wallet, supplier, or refund data was modified.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Diagnostic failed. Check server logs." },
      { status: 500 },
    );
  }
}
