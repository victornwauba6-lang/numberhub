import type { PoolClient } from "pg";
import { creditWallet } from "@/lib/wallet/wallet-credit";

export type CreateRefundInput = {
  userId: string;
  orderId: string;
  idempotencyKey: string;
  reason: string;
};

export type CreatedRefund = {
  refundId: string;
  orderId: string;
  walletId: string;
  amountMinor: string;
  currency: string;
  status: string;
  walletTransactionId: string;
};

const REFUNDABLE_STATUSES = ["FAILED", "CANCELLED", "EXPIRED"];

export async function createRefund(
  client: PoolClient,
  input: CreateRefundInput,
): Promise<CreatedRefund> {
  if (!input.userId.trim()) {
    throw new Error("User ID is required");
  }

  if (!input.orderId.trim()) {
    throw new Error("Order ID is required");
  }

  if (!input.idempotencyKey.trim()) {
    throw new Error("Idempotency key is required");
  }

  const reason = input.reason.trim();

  if (!reason) {
    throw new Error("Refund reason is required");
  }

  if (reason.length > 100) {
    throw new Error("Refund reason is too long");
  }

  const existingRefund = await client.query<{
    id: string;
    orderId: string;
    walletId: string;
    amountMinor: string;
    currency: string;
    status: string;
    walletTransactionId: string | null;
  }>(
    `
      SELECT
        r.id,
        r.order_id AS "orderId",
        r.wallet_id AS "walletId",
        r.amount_minor::text AS "amountMinor",
        r.currency,
        r.status,
        r.wallet_transaction_id AS "walletTransactionId"
      FROM refunds r
      WHERE r.idempotency_key = $1
      LIMIT 1
    `,
    [input.idempotencyKey],
  );

  if (existingRefund.rowCount === 1) {
    const refund = existingRefund.rows[0];

    if (
      refund.orderId !== input.orderId ||
      refund.walletId === ""
    ) {
      throw new Error("Refund idempotency key belongs to another refund");
    }

    if (!refund.walletTransactionId) {
      throw new Error("Existing refund is not completed");
    }

    return {
      refundId: refund.id,
      orderId: refund.orderId,
      walletId: refund.walletId,
      amountMinor: refund.amountMinor,
      currency: refund.currency,
      status: refund.status,
      walletTransactionId: refund.walletTransactionId,
    };
  }

  const orderResult = await client.query<{
    id: string;
    userId: string;
    walletId: string;
    status: string;
    currency: string;
    priceMinor: string;
    refundEnabled: boolean;
  }>(
    `
      SELECT
        o.id,
        o.user_id AS "userId",
        o.wallet_id AS "walletId",
        o.status,
        o.currency,
        o.price_minor::text AS "priceMinor",
        o.refund_enabled_snapshot AS "refundEnabled"
      FROM orders o
      WHERE o.id = $1
        AND o.user_id = $2
      FOR UPDATE
    `,
    [input.orderId, input.userId],
  );

  if (orderResult.rowCount !== 1) {
    throw new Error("Order not found");
  }

  const order = orderResult.rows[0];

  if (!order.refundEnabled) {
    throw new Error("Refund is not available for this order");
  }

  if (!REFUNDABLE_STATUSES.includes(order.status)) {
    throw new Error("Order is not eligible for a refund");
  }

  const amountMinor = BigInt(order.priceMinor);

  if (amountMinor <= BigInt(0)) {
    throw new Error("Refund amount must be greater than zero");
  }

  const duplicateRefund = await client.query<{ id: string }>(
    `
      SELECT id
      FROM refunds
      WHERE order_id = $1
        AND status IN ('PENDING', 'PROCESSING', 'COMPLETED')
      LIMIT 1
    `,
    [order.id],
  );

  if (duplicateRefund.rowCount === 1) {
    throw new Error("A refund already exists for this order");
  }

  const refundResult = await client.query<{ id: string }>(
    `
      INSERT INTO refunds (
        order_id,
        wallet_id,
        amount_minor,
        currency,
        status,
        reason,
        idempotency_key,
        metadata
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'PROCESSING',
        $5,
        $6,
        $7
      )
      RETURNING id
    `,
    [
      order.id,
      order.walletId,
      amountMinor.toString(),
      order.currency,
      reason,
      input.idempotencyKey,
      JSON.stringify({
        source: "refund-service",
        orderStatusBeforeRefund: order.status,
      }),
    ],
  );

  const refundId = refundResult.rows[0].id;

  const walletCredit = await creditWallet({
    client,
    walletId: order.walletId,
    amountMinor,
    reference: `REFUND-${refundId}`,
    description: "Order refund",
    transactionType: "REFUND",
    metadata: {
      refundId,
      orderId: order.id,
      reason,
    },
  });

  await client.query(
    `
      UPDATE refunds
      SET
        status = 'COMPLETED',
        wallet_transaction_id = $1,
        updated_at = NOW(),
        completed_at = NOW()
      WHERE id = $2
    `,
    [walletCredit.transactionId, refundId],
  );

  await client.query(
    `
      UPDATE orders
      SET
        status = 'REFUNDED',
        updated_at = NOW()
      WHERE id = $1
    `,
    [order.id],
  );

  await client.query(
    `
      INSERT INTO order_events (
        order_id,
        from_status,
        to_status,
        event_type,
        actor_user_id,
        metadata
      )
      VALUES ($1, $2, 'REFUNDED', 'ORDER_REFUNDED', $3, $4)
    `,
    [
      order.id,
      order.status,
      input.userId,
      JSON.stringify({
        refundId,
        amountMinor: amountMinor.toString(),
        currency: order.currency,
        reason,
        walletTransactionId: walletCredit.transactionId,
      }),
    ],
  );

  return {
    refundId,
    orderId: order.id,
    walletId: order.walletId,
    amountMinor: amountMinor.toString(),
    currency: order.currency,
    status: "COMPLETED",
    walletTransactionId: walletCredit.transactionId,
  };
}
