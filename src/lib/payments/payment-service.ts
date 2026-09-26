import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db-transaction";
import {
  completeIdempotencyRecord,
  createIdempotencyRecord,
  getIdempotencyRecord,
} from "@/lib/idempotency/idempotency-service";
import { createRequestHash } from "@/lib/idempotency/request-hash";
import { getActiveDepositProvider } from "@/lib/payments/providers/provider-registry";

const PAYMENT_OPERATION = "CREATE_WALLET_PAYMENT";
const IDEMPOTENCY_EXPIRY_HOURS = 24;
const MINIMUM_AMOUNT_MINOR = BigInt(10000);

export type CreatePaymentInput = {
  userId: string;
  amountMinor: bigint;
  currency?: string;
  paymentMethod?: string;
  idempotencyKey: string;
};

export type CreatePaymentResult = {
  paymentId: string;
  walletId: string;
  amountMinor: string;
  currency: string;
  status: string;
  providerId: string | null;
  providerReference: string | null;
  checkoutUrl: string | null;
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

function validateAmount(amountMinor: bigint): void {
  if (amountMinor <= BigInt(0)) {
    throw new Error("Payment amount must be greater than zero");
  }

  if (amountMinor < MINIMUM_AMOUNT_MINOR) {
    throw new Error("Minimum wallet funding amount is ₦100");
  }
}

function normalizeCurrency(currency?: string): string {
  const normalized = (currency || "NGN").trim().toUpperCase();

  if (normalized !== "NGN") {
    throw new Error("Only NGN wallet funding is currently supported");
  }

  return normalized;
}

async function updatePaymentProviderDetails(
  paymentId: string,
  providerReference: string,
  checkoutUrl: string | null,
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE payments
        SET
          provider_reference = $2::text,
          metadata = COALESCE(metadata, '{}'::jsonb)
            || jsonb_build_object(
              'providerReference', $2::text,
              'checkoutUrl', $3::text
            ),
          updated_at = NOW()
        WHERE id = $1
      `,
      [paymentId, providerReference, checkoutUrl],
    );
  });
}

export async function createWalletPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);

  if (!input.userId) {
    throw new Error("User information is incomplete");
  }

  validateAmount(input.amountMinor);

  const currency = normalizeCurrency(input.currency);

  const paymentMethod = input.paymentMethod?.trim() || null;

  if (paymentMethod && paymentMethod.length > 50) {
    throw new Error("Payment method is too long");
  }

  const requestHash = createRequestHash({
    userId: input.userId,
    amountMinor: input.amountMinor.toString(),
    currency,
    paymentMethod,
  });

  const existing = await withTransaction(async (client) => {
    return getIdempotencyRecord(
      client,
      input.userId,
      idempotencyKey,
      PAYMENT_OPERATION,
    );
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new Error(
        "Idempotency key was already used for a different payment",
      );
    }

    if (
      existing.responseStatus === 200 &&
      existing.responseBody &&
      typeof existing.responseBody === "object"
    ) {
      const body = existing.responseBody as CreatePaymentResult;

      return {
        ...body,
        replayed: true,
      };
    }

    throw new Error("This payment request is already being processed");
  }

  const expiresAt = new Date(
    Date.now() + IDEMPOTENCY_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  const created = await withTransaction(async (client) => {
    let idempotencyRecord;

    try {
      idempotencyRecord = await createIdempotencyRecord(
        client,
        input.userId,
        idempotencyKey,
        PAYMENT_OPERATION,
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
        throw new Error("This payment request is already being processed");
      }

      throw error;
    }

    const walletResult = await client.query<{
      id: string;
    }>(
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

    const walletId = walletResult.rows[0].id;

    const providerResult = await client.query<{
      id: string;
      slug: string;
    }>(
      `
        SELECT id, slug
        FROM payment_providers
        WHERE is_active = TRUE
          AND supports_deposit = TRUE
        ORDER BY priority ASC, created_at ASC
        LIMIT 1
      `,
    );

    if (providerResult.rowCount !== 1) {
      throw new Error("No active payment provider is configured");
    }

    const providerId = providerResult.rows[0].id;

    const paymentResult = await client.query<{
      id: string;
      status: string;
    }>(
      `
        INSERT INTO payments (
          user_id,
          wallet_id,
          provider_id,
          amount_minor,
          currency,
          status,
          payment_method,
          idempotency_key,
          metadata
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'PENDING',
          $6,
          $7,
          $8
        )
        RETURNING
          id,
          status
      `,
      [
        input.userId,
        walletId,
        providerId,
        input.amountMinor.toString(),
        currency,
        paymentMethod,
        idempotencyKey,
        JSON.stringify({
          source: "NUMBERHUB_WALLET_FUNDING",
          providerConfigured: true,
        }),
      ],
    );

    return {
      idempotencyRecordId: idempotencyRecord.id,
      paymentId: paymentResult.rows[0].id,
      walletId,
      status: paymentResult.rows[0].status,
      providerId,
      providerSlug: providerResult.rows[0].slug,
    };
  });

  const providerInfo = await getActiveDepositProvider();

  if (!providerInfo || !providerInfo.provider) {
    throw new Error("Payment provider is not configured");
  }

  if (providerInfo.id !== created.providerId) {
    throw new Error("Payment provider configuration changed");
  }

  const customerResult = await withTransaction(async (client) => {
    const result = await client.query<{
      email: string;
      fullName: string | null;
    }>(
      `
        SELECT email, full_name AS "fullName"
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [input.userId],
    );

    if (result.rowCount !== 1) {
      throw new Error("User not found");
    }

    return result.rows[0];
  });

  let initialization;

  try {
    initialization = await providerInfo.provider.initializePayment({
      paymentId: created.paymentId,
      userId: input.userId,
      amountMinor: input.amountMinor,
      currency,
      customerEmail: customerResult.email,
      customerName: customerResult.fullName,
    });
  } catch (error) {
    await withTransaction(async (client) => {
      await client.query(
        `
          UPDATE payments
          SET status = 'FAILED',
              metadata = COALESCE(metadata, '{}'::jsonb)
                || jsonb_build_object(
                  'initializationError',
                  $2::text
                ),
              updated_at = NOW()
          WHERE id = $1
        `,
        [
          created.paymentId,
          error instanceof Error
            ? error.message
            : "Payment initialization failed",
        ],
      );
    });

    throw error;
  }

  const response: CreatePaymentResult = {
    paymentId: created.paymentId,
    walletId: created.walletId,
    amountMinor: input.amountMinor.toString(),
    currency,
    status: created.status,
    providerId: created.providerId,
    providerReference: initialization.providerPaymentId,
    checkoutUrl: initialization.checkoutUrl ?? null,
    replayed: false,
  };

  await updatePaymentProviderDetails(
    created.paymentId,
    initialization.providerPaymentId,
    initialization.checkoutUrl ?? null,
  );

  await withTransaction(async (client) => {
    await completeIdempotencyRecord(
      client,
      created.idempotencyRecordId,
      200,
      response,
      "PAYMENT",
      response.paymentId,
    );
  });

  return response;
}
