import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type TransactionRow = {
  id: string;
  transactionType: string;
  direction: string;
  amountMinor: string;
  balanceBeforeMinor: string;
  balanceAfterMinor: string;
  reference: string;
  externalReference: string | null;
  description: string | null;
  createdAt: string;
  legacyStatus?: string;
  isLegacy?: boolean;
};

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const currentResult = await db.query<TransactionRow>(
      `
        SELECT
          wt.id,
          wt.transaction_type AS "transactionType",
          wt.direction,
          wt.amount_minor::text AS "amountMinor",
          wt.balance_before_minor::text AS "balanceBeforeMinor",
          wt.balance_after_minor::text AS "balanceAfterMinor",
          wt.reference,
          wt.external_reference AS "externalReference",
          wt.description,
          wt.created_at AS "createdAt"
        FROM wallet_transactions wt
        INNER JOIN wallets w
          ON w.id = wt.wallet_id
        WHERE w.user_id = $1
        ORDER BY wt.created_at DESC
        LIMIT 100
      `,
      [user.id],
    );

    const legacyResult = await db.query<TransactionRow>(
      `
        SELECT
          lwt.id,
          UPPER(lwt.type) AS "transactionType",
          CASE
            WHEN LOWER(lwt.type) IN ('deposit', 'refund') THEN 'CREDIT'
            WHEN LOWER(lwt.type) = 'purchase' THEN 'DEBIT'
            ELSE 'CREDIT'
          END AS direction,
          lwt.amount_minor::text AS "amountMinor",
          '0' AS "balanceBeforeMinor",
          '0' AS "balanceAfterMinor",
          lwt.reference,
          NULL AS "externalReference",
          lwt.description,
          lwt.created_at AS "createdAt",
          lwt.status AS "legacyStatus",
          true AS "isLegacy"
        FROM legacy_wallet_transactions lwt
        WHERE lwt.new_user_id = $1
        ORDER BY lwt.created_at DESC
        LIMIT 100
      `,
      [user.id],
    );

    const transactions = [...currentResult.rows, ...legacyResult.rows]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )
      .slice(0, 150);

    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Transaction history could not be loaded",
      },
      { status: 500 },
    );
  }
}
