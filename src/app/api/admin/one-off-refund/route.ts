import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { creditWallet } from "@/lib/wallet/wallet-credit";

export const runtime = "nodejs";

const CUSTOMER_EMAIL = "ikennajjjjjjjjjjj@gmail.com";
const REFUND_AMOUNT_MINOR = BigInt(170000);
const REFUND_REFERENCE = "REFUND-MARTIN-1700-20261007";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: "Admin access required" },
      { status: 403 },
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query<{
      id: string;
      email: string;
    }>(
      `
        SELECT id, email
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [CUSTOMER_EMAIL],
    );

    if (userResult.rowCount !== 1) {
      throw new Error("Customer not found");
    }

    const userId = userResult.rows[0].id;

    const walletResult = await client.query<{
      id: string;
      balance_minor: string;
      currency: string;
    }>(
      `
        SELECT id, balance_minor, currency
        FROM wallets
        WHERE user_id = $1
        FOR UPDATE
      `,
      [userId],
    );

    if (walletResult.rowCount !== 1) {
      throw new Error("Customer wallet not found");
    }

    const wallet = walletResult.rows[0];

    const existing = await client.query(
      `
        SELECT id
        FROM wallet_transactions
        WHERE reference = $1
        LIMIT 1
      `,
      [REFUND_REFERENCE],
    );

    if ((existing.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        message: "This refund has already been processed.",
        balanceMinor: wallet.balance_minor,
      });
    }

    const result = await creditWallet({
      client,
      walletId: wallet.id,
      amountMinor: REFUND_AMOUNT_MINOR,
      reference: REFUND_REFERENCE,
      description: "Customer refund",
      transactionType: "REFUND",
      metadata: {
        customerEmail: CUSTOMER_EMAIL,
        reason: "Customer refund",
      },
    });

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      alreadyProcessed: false,
      email: CUSTOMER_EMAIL,
      amountNgn: 1700,
      previousBalanceNgn: Number(result.balanceBeforeMinor) / 100,
      newBalanceNgn: Number(result.balanceAfterMinor) / 100,
      transactionId: result.transactionId,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Refund failed",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
