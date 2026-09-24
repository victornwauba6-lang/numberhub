import { db } from "@/lib/db";

export type Wallet = {
  id: string;
  userId: string;
  balanceMinor: string;
  currency: string;
};

export async function getWalletByUserId(
  userId: string,
): Promise<Wallet | null> {
  const result = await db.query<Wallet>(
    `
      SELECT
        id,
        user_id AS "userId",
        balance_minor::text AS "balanceMinor",
        currency
      FROM wallets
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rowCount === 1 ? result.rows[0] : null;
}
