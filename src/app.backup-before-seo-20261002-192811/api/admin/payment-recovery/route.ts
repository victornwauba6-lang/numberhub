import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { withTransaction } from "@/lib/db-transaction";
import { creditWallet } from "@/lib/wallet/wallet-credit";
import { getActiveDepositProvider } from "@/lib/payments/providers/provider-registry";

export const runtime = "nodejs";

type PaymentRow = {
  id: string;
  user_id: string;
  wallet_id: string;
  amount_minor: string;
  currency: string;
  status: string;
  provider_reference: string | null;
  created_at: string;
  email: string;
};

function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, item) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  ) as T;
}

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      ),
    };
  }

  return { user, response: null };
}

export async function GET() {
  const auth = await requireAdmin();

  if (auth.response) {
    return auth.response;
  }

  try {
    const paymentResult = await db.query<PaymentRow>(
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
        verification: verification ? jsonSafe(verification) : null,
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
        error:
          error instanceof Error
            ? error.message
            : "Payment recovery inspection failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();

  if (auth.response) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as {
      paymentId?: string;
    };

    const paymentId = body.paymentId?.trim();

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "Payment ID is required" },
        { status: 400 },
      );
    }

    const paymentResult = await db.query<PaymentRow>(
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
        WHERE p.id = $1
        LIMIT 1
      `,
      [paymentId],
    );

    if (paymentResult.rowCount !== 1) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 },
      );
    }

    const payment = paymentResult.rows[0];

    if (payment.amount_minor !== "10000") {
      return NextResponse.json(
        {
          success: false,
          error: "Recovery is restricted to the ₦100 payment amount",
        },
        { status: 400 },
      );
    }

    if (payment.status === "SUCCESS") {
      return NextResponse.json({
        success: true,
        alreadyRecovered: true,
        credited: false,
        message: "Payment is already marked as successful",
        paymentId: payment.id,
      });
    }

    if (!payment.provider_reference) {
      return NextResponse.json(
        { success: false, error: "Payment has no Korapay reference" },
        { status: 400 },
      );
    }

    const providerInfo = await getActiveDepositProvider();

    if (!providerInfo?.provider) {
      throw new Error("No active payment provider is configured");
    }

    const verification = await providerInfo.provider.verifyPayment(
      payment.provider_reference,
    );

    if (!verification.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Korapay has not confirmed this payment as successful: ${
            verification.rawStatus || "unknown status"
          }`,
          verification: jsonSafe(verification),
        },
        { status: 400 },
      );
    }

    if (
      verification.amountMinor === null ||
      verification.amountMinor === undefined ||
      verification.amountMinor !== BigInt(payment.amount_minor)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Korapay amount does not match the NumberHub payment amount",
          verification: jsonSafe(verification),
        },
        { status: 400 },
      );
    }

    if (
      !verification.currency ||
      verification.currency.toUpperCase() !== payment.currency.toUpperCase()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Korapay currency does not match the NumberHub payment currency",
          verification: jsonSafe(verification),
        },
        { status: 400 },
      );
    }

    const result = await withTransaction(async (client) => {
      const lockedResult = await client.query<PaymentRow>(
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
          WHERE p.id = $1
          FOR UPDATE
        `,
        [paymentId],
      );

      if (lockedResult.rowCount !== 1) {
        throw new Error("Payment disappeared during recovery");
      }

      const lockedPayment = lockedResult.rows[0];

      if (lockedPayment.status === "SUCCESS") {
        return {
          alreadyRecovered: true,
          credited: false,
          paymentId: lockedPayment.id,
          email: lockedPayment.email,
        };
      }

      const transactionReference = `PAYMENT-${lockedPayment.id}`;

      const existingTransaction = await client.query<{ id: string }>(
        `
          SELECT id
          FROM wallet_transactions
          WHERE reference = $1
          LIMIT 1
        `,
        [transactionReference],
      );

      if ((existingTransaction.rowCount ?? 0) > 0) {
        await client.query(
          `
            UPDATE payments
            SET
              status = 'SUCCESS',
              completed_at = COALESCE(completed_at, NOW()),
              updated_at = NOW()
            WHERE id = $1
          `,
          [lockedPayment.id],
        );

        return {
          alreadyRecovered: true,
          credited: false,
          paymentId: lockedPayment.id,
          email: lockedPayment.email,
          transactionId: existingTransaction.rows[0].id,
        };
      }

      const credit = await creditWallet({
        client,
        walletId: lockedPayment.wallet_id,
        amountMinor: BigInt(lockedPayment.amount_minor),
        reference: transactionReference,
        externalReference:
          verification.providerReference ||
          lockedPayment.provider_reference ||
          undefined,
        description: "Wallet funding via Korapay",
        metadata: {
          paymentId: lockedPayment.id,
          provider: "korapay",
          providerReference:
            verification.providerReference ||
            lockedPayment.provider_reference,
          recovery: true,
          recoveredBy: auth.user?.id,
        },
      });

      await client.query(
        `
          UPDATE payments
          SET
            status = 'SUCCESS',
            provider_reference = COALESCE(
              provider_reference,
              $2
            ),
            completed_at = NOW(),
            metadata = COALESCE(metadata, '{}'::jsonb)
              || jsonb_build_object(
                'recovered',
                true,
                'recoveryMethod',
                'admin_payment_recovery',
                'recoveredAt',
                NOW()
              ),
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          lockedPayment.id,
          verification.providerReference ||
            lockedPayment.provider_reference,
        ],
      );

      return {
        alreadyRecovered: false,
        credited: true,
        paymentId: lockedPayment.id,
        email: lockedPayment.email,
        transactionId: credit.transactionId,
        balanceAfterMinor: credit.balanceAfterMinor.toString(),
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Payment recovery error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Payment recovery failed",
      },
      { status: 500 },
    );
  }
}
