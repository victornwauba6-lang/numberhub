import type { PoolClient } from "pg";

type CreditTransactionType = "DEPOSIT" | "REFUND" | "ADJUSTMENT" | "REVERSAL";

type WalletCreditInput = {
  client: PoolClient;
  walletId: string;
  amountMinor: bigint;
  reference: string;
  description: string;
  metadata?: Record<string, unknown>;
  transactionType?: CreditTransactionType;
  externalReference?: string;
};

export async function creditWallet({
  client,
  walletId,
  amountMinor,
  reference,
  description,
  metadata = {},
  transactionType = "DEPOSIT",
  externalReference,
}: WalletCreditInput) {
  if (amountMinor <= BigInt(0)) {
    throw new Error("Credit amount must be greater than zero");
  }

  const walletResult = await client.query<{
    id: string;
    balance_minor: string;
    currency: string;
  }>(
    `
      SELECT id, balance_minor, currency
      FROM wallets
      WHERE id = $1
      FOR UPDATE
    `,
    [walletId],
  );

  if (walletResult.rowCount !== 1) {
    throw new Error("Wallet not found");
  }

  const wallet = walletResult.rows[0];
  const balanceBefore = BigInt(wallet.balance_minor);
  const balanceAfter = balanceBefore + amountMinor;

  await client.query(
    `
      UPDATE wallets
      SET
        balance_minor = $1,
        updated_at = NOW()
      WHERE id = $2
    `,
    [balanceAfter.toString(), walletId],
  );

  const transactionResult = await client.query<{
    id: string;
    balance_after_minor: string;
  }>(
    `
      INSERT INTO wallet_transactions (
        wallet_id,
        transaction_type,
        direction,
        amount_minor,
        balance_before_minor,
        balance_after_minor,
        reference,
        external_reference,
        description,
        metadata
      )
      VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, balance_after_minor
    `,
    [
      walletId,
      transactionType,
      amountMinor.toString(),
      balanceBefore.toString(),
      balanceAfter.toString(),
      reference,
      externalReference ?? null,
      description,
      JSON.stringify(metadata),
    ],
  );

  return {
    transactionId: transactionResult.rows[0].id,
    walletId,
    currency: wallet.currency,
    amountMinor,
    balanceBeforeMinor: balanceBefore,
    balanceAfterMinor: BigInt(
      transactionResult.rows[0].balance_after_minor,
    ),
    transactionType,
  };
}
