import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { withTransaction } from "@/lib/db-transaction";
import { automaticallyRefundFailedOrder } from "@/lib/order-processing/auto-refund-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AFFECTED_ORDERS: Record<string, string> = {
  "e23b54cc-4ffb-46ab-a5e3-4e502faf835f": "AT",
  "d0dbcba2-b917-46d8-9570-d294b5e2cf8f": "CA",
  "88c0043b-5795-467b-9ae8-4de67f28ef30": "PH",
};

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = (await request.json()) as { orderId?: unknown };
    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim() : "";

    const expectedCountry = AFFECTED_ORDERS[orderId];

    if (!expectedCountry) {
      return NextResponse.json(
        {
          success: false,
          error: "This order is not on the approved reconciliation list.",
        },
        { status: 400 },
      );
    }

    const result = await withTransaction(async (client) => {
      const orderResult = await client.query<{
        id: string;
        status: string;
        countryCode: string;
        serviceSlug: string;
        refundEnabled: boolean;
        supplierRequestId: string;
        supplierRequestStatus: string;
      }>(
        `
          SELECT
            o.id,
            o.status,
            c.code AS "countryCode",
            s.slug AS "serviceSlug",
            o.refund_enabled_snapshot AS "refundEnabled",
            sr.id AS "supplierRequestId",
            sr.status AS "supplierRequestStatus"
          FROM orders o
          JOIN countries c ON c.id = o.country_id
          JOIN services s ON s.id = o.service_id
          JOIN supplier_requests sr ON sr.order_id = o.id
          JOIN suppliers sup ON sup.id = sr.supplier_id
          WHERE o.id = $1
            AND LOWER(sup.slug) = 'smsbulk'
            AND sr.request_type = 'ACTIVATE_NUMBER'
          ORDER BY sr.created_at DESC
          LIMIT 1
          FOR UPDATE OF o, sr
        `,
        [orderId],
      );

      if (orderResult.rowCount !== 1) {
        throw new Error(
          "The order or its SMSBulk activation request could not be verified.",
        );
      }

      const order = orderResult.rows[0];

      if (
        order.countryCode !== expectedCountry ||
        order.serviceSlug.toLowerCase() !== "facebook"
      ) {
        throw new Error(
          "The order country or service does not match the approved order.",
        );
      }

      if (order.status !== "PROCESSING") {
        throw new Error(
          `Order status is ${order.status}; no changes were made.`,
        );
      }

      if (order.supplierRequestStatus !== "TIMEOUT") {
        throw new Error(
          `Supplier request status is ${order.supplierRequestStatus}; no changes were made.`,
        );
      }

      if (!order.refundEnabled) {
        throw new Error("Refunds are disabled for this order.");
      }

      const assignedNumber = await client.query(
        `SELECT 1 FROM verification_numbers WHERE order_id = $1 LIMIT 1`,
        [orderId],
      );

      if (assignedNumber.rowCount !== 0) {
        throw new Error(
          "A verification number exists for this order. Manual review is required.",
        );
      }

      const existingRefund = await client.query<{
        id: string;
        status: string;
      }>(
        `
          SELECT id, status
          FROM refunds
          WHERE order_id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [orderId],
      );

      if (existingRefund.rowCount !== 0) {
        throw new Error(
          `A refund record already exists with status ${existingRefund.rows[0].status}. No additional refund was issued.`,
        );
      }

      await client.query(
        `
          UPDATE orders
          SET status = 'FAILED', updated_at = NOW()
          WHERE id = $1 AND status = 'PROCESSING'
        `,
        [orderId],
      );

      await client.query(
        `
          INSERT INTO order_events (
            order_id,
            from_status,
            to_status,
            event_type,
            metadata
          )
          VALUES (
            $1,
            'PROCESSING',
            'FAILED',
            'SMSBULK_FAILURE_RECONCILED',
            $2::jsonb
          )
        `,
        [
          orderId,
          JSON.stringify({
            reason: "Confirmed SMSBulk supplier failure and supplier-side refund",
            supplierRequestId: order.supplierRequestId,
            supplierRequestStatus: order.supplierRequestStatus,
            reconciliation: "Admin-only, allowlisted recovery",
          }),
        ],
      );

      const refund = await automaticallyRefundFailedOrder(client, orderId);

      if (!refund.refunded) {
        throw new Error(
          `Customer refund was not completed: ${refund.message}`,
        );
      }

      return {
        orderId,
        countryCode: order.countryCode,
        status: refund.status,
        refunded: refund.refunded,
        refundId: refund.refundId,
        amountMinor: refund.amountMinor,
        message: refund.message,
      };
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "SMSBulk refund reconciliation failed.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
