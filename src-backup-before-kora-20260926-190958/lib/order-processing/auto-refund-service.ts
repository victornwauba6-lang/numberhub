import type { PoolClient } from "pg";
import { createRefund } from "@/lib/refunds/refund-service";

const REFUNDABLE_FAILURE_STATUSES = [
  "FAILED",
  "CANCELLED",
  "EXPIRED",
];

export type AutoRefundResult = {
  orderId: string;
  status: string;
  refunded: boolean;
  refundId: string | null;
  amountMinor: string | null;
  message: string;
};

export async function automaticallyRefundFailedOrder(
  client: PoolClient,
  orderId: string,
): Promise<AutoRefundResult> {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    throw new Error("Order ID is required");
  }

  const orderResult = await client.query<{
    id: string;
    userId: string;
    status: string;
    refundEnabled: boolean;
  }>(
    `
      SELECT
        id,
        user_id AS "userId",
        status,
        refund_enabled_snapshot AS "refundEnabled"
      FROM orders
      WHERE id = $1
      FOR UPDATE
    `,
    [normalizedOrderId],
  );

  if (orderResult.rowCount !== 1) {
    throw new Error("Order not found");
  }

  const order = orderResult.rows[0];

  if (!REFUNDABLE_FAILURE_STATUSES.includes(order.status)) {
    return {
      orderId: order.id,
      status: order.status,
      refunded: false,
      refundId: null,
      amountMinor: null,
      message: `Order status ${order.status} does not qualify for an automatic refund.`,
    };
  }

  if (!order.refundEnabled) {
    return {
      orderId: order.id,
      status: order.status,
      refunded: false,
      refundId: null,
      amountMinor: null,
      message: "Refunds are disabled for this order.",
    };
  }

  const existingRefund = await client.query<{
    id: string;
    status: string;
    amountMinor: string;
  }>(
    `
      SELECT
        id,
        status,
        amount_minor::text AS "amountMinor"
      FROM refunds
      WHERE order_id = $1
        AND status = 'COMPLETED'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [order.id],
  );

  if (existingRefund.rowCount === 1) {
    return {
      orderId: order.id,
      status: "REFUNDED",
      refunded: true,
      refundId: existingRefund.rows[0].id,
      amountMinor: existingRefund.rows[0].amountMinor,
      message: "This order has already been refunded.",
    };
  }

  const refund = await createRefund(client, {
    userId: order.userId,
    orderId: order.id,
    idempotencyKey: `AUTO-REFUND-${order.id}`,
    reason: `Automatic refund for order ${order.status.toLowerCase()}`,
  });

  return {
    orderId: order.id,
    status: "REFUNDED",
    refunded: true,
    refundId: refund.refundId,
    amountMinor: refund.amountMinor,
    message: "Automatic refund completed and credited to the customer wallet.",
  };
}
