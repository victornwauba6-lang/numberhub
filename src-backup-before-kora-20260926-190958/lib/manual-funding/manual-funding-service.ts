import type { PoolClient } from "pg";
import { creditWallet } from "@/lib/wallet/wallet-credit";

const MINIMUM_AMOUNT_MINOR = BigInt(10000);

export type CreateManualFundingInput = {
  userId: string;
  amountMinor: bigint;
};

export type ManualFundingRequest = {
  id: string;
  fundingId: string;
  userId: string;
  walletId: string;
  amountMinor: string;
  currency: string;
  status: string;
  createdAt: string;
};

function generateFundingId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";

  for (let index = 0; index < 6; index += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }

  return `NH-${value}`;
}

async function ensureManualFundingSchema(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS manual_funding_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

      wallet_id UUID NOT NULL
        REFERENCES wallets(id)
        ON DELETE CASCADE,

      funding_id VARCHAR(30) NOT NULL UNIQUE,

      amount_minor BIGINT NOT NULL
        CHECK (amount_minor > 0),

      currency VARCHAR(3) NOT NULL DEFAULT 'NGN',

      status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),

      admin_user_id UUID
        REFERENCES users(id),

      admin_note TEXT,

      wallet_transaction_id UUID
        REFERENCES wallet_transactions(id),

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      reviewed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_manual_funding_user
      ON manual_funding_requests(user_id);

    CREATE INDEX IF NOT EXISTS idx_manual_funding_status
      ON manual_funding_requests(status);

    CREATE INDEX IF NOT EXISTS idx_manual_funding_created
      ON manual_funding_requests(created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_funding_wallet_transaction
      ON manual_funding_requests(wallet_transaction_id)
      WHERE wallet_transaction_id IS NOT NULL;
  `);
}

export async function createManualFundingRequest(
  client: PoolClient,
  input: CreateManualFundingInput,
): Promise<ManualFundingRequest> {
  if (!input.userId.trim()) {
    throw new Error("User ID is required");
  }

  await ensureManualFundingSchema(client);

  if (input.amountMinor < MINIMUM_AMOUNT_MINOR) {
    throw new Error("Minimum funding amount is ₦100");
  }

  if (input.amountMinor <= BigInt(0)) {
    throw new Error("Funding amount must be greater than zero");
  }

  const walletResult = await client.query<{
    id: string;
    currency: string;
  }>(
    `
      SELECT id, currency
      FROM wallets
      WHERE user_id = $1
      LIMIT 1
    `,
    [input.userId],
  );

  if (walletResult.rowCount !== 1) {
    throw new Error("Wallet not found");
  }

  const wallet = walletResult.rows[0];

  let fundingId = generateFundingId();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await client.query<{
        id: string;
        fundingId: string;
        userId: string;
        walletId: string;
        amountMinor: string;
        currency: string;
        status: string;
        createdAt: string;
      }>(
        `
          INSERT INTO manual_funding_requests (
            user_id,
            wallet_id,
            funding_id,
            amount_minor,
            currency
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            id,
            funding_id AS "fundingId",
            user_id AS "userId",
            wallet_id AS "walletId",
            amount_minor::text AS "amountMinor",
            currency,
            status,
            created_at AS "createdAt"
        `,
        [
          input.userId,
          wallet.id,
          fundingId,
          input.amountMinor.toString(),
          wallet.currency,
        ],
      );

      return result.rows[0];
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        fundingId = generateFundingId();
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not create funding request");
}

export async function approveManualFundingRequest(
  client: PoolClient,
  input: {
    fundingRequestId: string;
    adminUserId: string;
  },
) {
  const requestResult = await client.query<{
    id: string;
    userId: string;
    walletId: string;
    fundingId: string;
    amountMinor: string;
    currency: string;
    status: string;
  }>(
    `
      SELECT
        id,
        user_id AS "userId",
        wallet_id AS "walletId",
        funding_id AS "fundingId",
        amount_minor::text AS "amountMinor",
        currency,
        status
      FROM manual_funding_requests
      WHERE id = $1
      FOR UPDATE
    `,
    [input.fundingRequestId],
  );

  if (requestResult.rowCount !== 1) {
    throw new Error("Funding request not found");
  }

  const request = requestResult.rows[0];

  if (request.status !== "PENDING") {
    throw new Error("Funding request has already been reviewed");
  }

  const walletCredit = await creditWallet({
    client,
    walletId: request.walletId,
    amountMinor: BigInt(request.amountMinor),
    reference: `MANUAL-${request.fundingId}`,
    description: "Manual bank transfer funding",
    transactionType: "DEPOSIT",
    externalReference: request.fundingId,
    metadata: {
      source: "MANUAL_BANK_TRANSFER",
      fundingId: request.fundingId,
      fundingRequestId: request.id,
      approvedBy: input.adminUserId,
    },
  });

  const updateResult = await client.query(
    `
      UPDATE manual_funding_requests
      SET
        status = 'APPROVED',
        admin_user_id = $1,
        wallet_transaction_id = $2,
        reviewed_at = NOW()
      WHERE id = $3
        AND status = 'PENDING'
    `,
    [input.adminUserId, walletCredit.transactionId, request.id],
  );

  if (updateResult.rowCount !== 1) {
    throw new Error("Funding request could not be approved");
  }

  return {
    fundingRequestId: request.id,
    fundingId: request.fundingId,
    amountMinor: request.amountMinor,
    currency: request.currency,
    status: "APPROVED",
    walletTransactionId: walletCredit.transactionId,
  };
}

export async function rejectManualFundingRequest(
  client: PoolClient,
  input: {
    fundingRequestId: string;
    adminUserId: string;
    adminNote?: string;
  },
) {
  const adminNote = input.adminNote?.trim() || null;

  if (adminNote && adminNote.length > 500) {
    throw new Error("Admin note is too long");
  }

  const result = await client.query<{
    id: string;
    fundingId: string;
    amountMinor: string;
    currency: string;
    status: string;
  }>(
    `
      UPDATE manual_funding_requests
      SET
        status = 'REJECTED',
        admin_user_id = $1,
        admin_note = $2,
        reviewed_at = NOW()
      WHERE id = $3
        AND status = 'PENDING'
      RETURNING
        id,
        funding_id AS "fundingId",
        amount_minor::text AS "amountMinor",
        currency,
        status
    `,
    [input.adminUserId, adminNote, input.fundingRequestId],
  );

  if (result.rowCount !== 1) {
    throw new Error("Funding request not found or already reviewed");
  }

  return result.rows[0];
}
