import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { getActiveDepositProvider } from "@/lib/payments/providers/provider-registry";

export const runtime = "nodejs";

export async function GET() {
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

  try {
    const paymentResult = await db.query<{
      id: string;
      user_id: string;
      wallet_id: string;
      amount_minor: string;
      currency: string;
      status: string;
      provider_reference: string | null;
      created_at: string;
      email: string;
    }>(
      `
        SELECT
          p.id,
          p.user_id,
          p.wallet_id,
          p.amount_minor,
          p.currency,
          p.status,
          p.provider_reference,
          p.created_at,
          u.email
        FROM payments p
        INNER JOIN users u ON u.id = p.user_id
        WHERE p.amount_minor = 10000
          AND p.provider_reference IS NOT NULL
        ORDER BY p.created_at DESC
        LIMIT 20
      `,
    );

    const providerInfo = await getActiveDepositProvider();

    if (!providerInfo?.provider) {
      throw new Error("No active payment provider is configured");
    }

    const results = [];

    for (const payment of paymentResult.rows) {
      let verification = null;

      try {
        verification = await providerInfo.provider.verifyPayment(
          payment.provider_reference!,
        );
      } catch (error) {
        verification = {
          success: false,
          error: error instanceof Error ? error.message : "Verification failed",
        };
      }

      results.push({
        paymentId: payment.id,
        userId: payment.user_id,
        walletId: payment.wallet_id,
        email: payment.email,
        amountNgn: Number(payment.amount_minor) / 100,
        currency: payment.currency,
        status: payment.status,
        providerReference: payment.provider_reference,
        createdAt: payment.created_at,
        verification: verification
          ? JSON.parse(
              JSON.stringify(verification, (_, value) =>
                typeof value === "bigint" ? value.toString() : value,
              ),
            )
          : null,
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      payments: results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : "Payment recovery inspection failed",
      },
      { status: 500 },
    );
  }
}
