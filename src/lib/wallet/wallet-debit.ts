import type { PoolClient } from "pg";

export type WalletDebitResult = {
  walletId: string;
  transactionId: string;
  amountMinor: string;
  balanceBeforeMinor: string;
  balanceAfterMinor: string;
};

export async function debitWallet(
  client: PoolClient,
  walletId: string,
  amountMinor: bigint,
  reference: string,
  description: string,
  metadata: Record<string, unknown> = {},
): Promise<WalletDebitResult> {
  if (amountMinor <= BigInt(0)) {
    throw new Error("Debit amount must be greater than zero");
  }

  const walletResult = await client.query<{
    id: string;
    balanceMinor: string;
    currency: string;
  }>(
    `
      SELECT
        id,
        balance_minor::text AS "balanceMinor",
        currency
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
  const balanceBefore = BigInt(wallet.balanceMinor);

  if (balanceBefore < amountMinor) {
    throw new Error("Insufficient wallet balance");
  }

  const balanceAfter = balanceBefore - amountMinor;

  const updateResult = await client.query<{
    balanceMinor: string;
  }>(
    `
      UPDATE wallets
      SET
        balance_minor = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING balance_minor::text AS "balanceMinor"
    `,
    [balanceAfter.toString(), walletId],
  );

  const transactionResult = await client.query<{
    id: string;
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
        description,
        metadata
      )
      VALUES (
        $1,
        'PURCHASE',
        'DEBIT',
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING id
    `,
    [
      walletId,
      amountMinor.toString(),
      balanceBefore.toString(),
      balanceAfter.toString(),
      reference,
      description,
      JSON.stringify(metadata),
    ],
  );

  return {
    walletId,
    transactionId: walletTransactionId(transactionResult.rows[0].id),
    amountMinor: amountMinor.toString(),
    balanceBeforeMinor: balanceBefore.toString(),
    balanceAfterMinor: updateResult.rows[0].balanceMinor,
  };
}

function walletTransactionId(id: string): string {
  return id;
}
