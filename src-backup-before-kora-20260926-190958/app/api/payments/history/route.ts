import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const result = await db.query<{
      id: string;
      amountMinor: string;
      currency: string;
      status: string;
      paymentMethod: string | null;
      providerReference: string | null;
      createdAt: string;
      completedAt: string | null;
    }>(
      `
        SELECT
          wt.id,
          wt.amount_minor::text AS "amountMinor",
          w.currency,
          CASE
            WHEN wt.direction = 'CREDIT' THEN 'SUCCESS'
            ELSE 'COMPLETED'
          END AS status,
          CASE
            WHEN wt.transaction_type = 'DEPOSIT'
              AND wt.reference LIKE 'MANUAL-%'
              THEN 'MANUAL_BANK_TRANSFER'
            WHEN wt.transaction_type = 'DEPOSIT'
              THEN 'WALLET_FUNDING'
            WHEN wt.transaction_type = 'PURCHASE'
              THEN 'PURCHASE'
            WHEN wt.transaction_type = 'REFUND'
              THEN 'REFUND'
            WHEN wt.transaction_type = 'REVERSAL'
              THEN 'REVERSAL'
            ELSE wt.transaction_type
          END AS "paymentMethod",
          wt.reference AS "providerReference",
          wt.created_at AS "createdAt",
          wt.created_at AS "completedAt"
        FROM wallet_transactions wt
        INNER JOIN wallets w ON w.id = wt.wallet_id
        WHERE w.user_id = $1
        ORDER BY wt.created_at DESC
        LIMIT 50
      `,
      [user.id],
    );

    return NextResponse.json({
      success: true,
      payments: result.rows,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Wallet transaction history could not be loaded",
      },
      { status: 500 },
    );
  }
}
