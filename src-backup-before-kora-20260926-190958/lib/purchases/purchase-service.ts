import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db-transaction";
import { createOrder } from "@/lib/orders/order-service";
import {
  completeIdempotencyRecord,
  createIdempotencyRecord,
  getIdempotencyRecord,
} from "@/lib/idempotency/idempotency-service";
import { createRequestHash } from "@/lib/idempotency/request-hash";

const PURCHASE_OPERATION = "CREATE_VERIFICATION_ORDER";
const IDEMPOTENCY_EXPIRY_HOURS = 24;

export type PurchaseInput = {
  userId: string;
  productOptionId: string;
  idempotencyKey: string;
};

export type PurchaseResult = {
  orderId: string;
  status: string;
  currency: string;
  priceMinor: string;
  refundEnabled: boolean;
  replayed: boolean;
};

function validateIdempotencyKey(key: string): string {
  const normalized = key.trim();

  if (!normalized) {
    throw new Error("Idempotency key is required");
  }

  if (normalized.length > 255) {
    throw new Error("Idempotency key is too long");
  }

  return normalized;
}

export async function createPurchase(
  input: PurchaseInput,
): Promise<PurchaseResult> {
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);

  if (!input.userId || !input.productOptionId) {
    throw new Error("Purchase information is incomplete");
  }

  const requestHash = createRequestHash({
    userId: input.userId,
    productOptionId: input.productOptionId,
  });

  return withTransaction(async (client) => {
    const existing = await getIdempotencyRecord(
      client,
      input.userId,
      idempotencyKey,
      PURCHASE_OPERATION,
    );

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new Error(
          "Idempotency key was already used for a different purchase",
        );
      }

      if (
        existing.responseStatus === 200 &&
        existing.responseBody &&
        typeof existing.responseBody === "object"
      ) {
        const body = existing.responseBody as PurchaseResult;

        return {
          ...body,
          replayed: true,
        };
      }

      throw new Error("This purchase request is already being processed");
    }

    const expiresAt = new Date(
      Date.now() + IDEMPOTENCY_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    let idempotencyRecord;

    try {
      idempotencyRecord = await createIdempotencyRecord(
        client,
        input.userId,
        idempotencyKey,
        PURCHASE_OPERATION,
        requestHash,
        expiresAt,
      );
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new Error("This purchase request is already being processed");
      }

      throw error;
    }

    const walletResult = await client.query<{ id: string }>(
      `
        SELECT id
        FROM wallets
        WHERE user_id = $1
        FOR UPDATE
      `,
      [input.userId],
    );

    if (walletResult.rowCount !== 1) {
      throw new Error("Wallet not found");
    }

    const order = await createOrder(client, {
      userId: input.userId,
      walletId: walletResult.rows[0].id,
      productOptionId: input.productOptionId,
      idempotencyKey: `PURCHASE-${idempotencyKey}`,
    });

    const response: PurchaseResult = {
      orderId: order.orderId,
      status: order.status,
      currency: order.currency,
      priceMinor: order.priceMinor,
      refundEnabled: order.refundEnabled,
      replayed: false,
    };

    await completeIdempotencyRecord(
      client,
      idempotencyRecord.id,
      200,
      response,
      "ORDER",
      order.orderId,
    );

    return response;
  });
}
