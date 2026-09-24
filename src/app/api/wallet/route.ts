import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const result = await db.query<{
      id: string;
      balanceMinor: string;
      currency: string;
    }>(
      `
        SELECT
          id,
          balance_minor AS "balanceMinor",
          currency
        FROM wallets
        WHERE user_id = $1
        LIMIT 1
      `,
      [user.id],
    );

    if (result.rowCount !== 1) {
      return NextResponse.json(
        { success: false, error: "Wallet not found" },
        { status: 404 },
      );
    }

    const wallet = result.rows[0];

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        balanceMinor: wallet.balanceMinor,
        currency: wallet.currency,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to load wallet" },
      { status: 500 },
    );
  }
}
