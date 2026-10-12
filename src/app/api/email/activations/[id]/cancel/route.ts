import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withTransaction } from "@/lib/db-transaction";
import { creditWallet } from "@/lib/wallet/wallet-credit";
import {
  smsbulkEmailRequest,
  SmsbulkEmailError,
} from "@/lib/suppliers/smsbulk-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function findValue(
  value: unknown,
  keys: string[],
  depth = 0,
): unknown {
  if (depth > 5) return undefined;

  const object = asObject(value);
  if (!object) return undefined;

  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(object, key) &&
      object[key] !== null &&
      object[key] !== undefined
    ) {
      return object[key];
    }
  }

  for (const key of ["data", "activation", "result"]) {
    if (key in object) {
      const found = findValue(object[key], keys, depth + 1);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

async function restorePending(id: string, userId: string, message: string) {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE email_activations
       SET status = 'PENDING',
           error_message = $3,
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $2
         AND status = 'CANCEL_PENDING'`,
      [id, userId, message],
    );
  });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid activation ID." },
        { status: 400 },
      );
    }

    const reservation = await withTransaction(async (client) => {
      const result = await client.query<{
        walletId: string;
        providerActivationId: string | null;
        status: string;
        otp: string | null;
      }>(
        `SELECT
           wallet_id AS "walletId",
           provider_activation_id AS "providerActivationId",
           status,
           otp
         FROM email_activations
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [id, user.id],
      );

      const activation = result.rows[0];

      if (!activation) return { kind: "not_found" as const };

      if (["REFUNDED", "CANCELLED"].includes(activation.status)) {
        return { kind: "already_final" as const, status: activation.status };
      }

      if (activation.status === "CANCEL_PENDING") {
        return { kind: "uncertain" as const };
      }

      if (activation.status !== "PENDING" || activation.otp) {
        return { kind: "not_cancellable" as const };
      }

      if (!activation.providerActivationId) {
        return { kind: "missing_provider_id" as const };
      }

      await client.query(
        `UPDATE email_activations
         SET status = 'CANCEL_PENDING',
             error_message = 'Cancellation requested; awaiting supplier confirmation.',
             updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, user.id],
      );

      return {
        kind: "reserved" as const,
        providerActivationId: activation.providerActivationId,
      };
    });

    if (reservation.kind === "not_found") {
      return NextResponse.json(
        { success: false, error: "Activation not found." },
        { status: 404 },
      );
    }

    if (reservation.kind === "already_final") {
      return NextResponse.json({
        success: true,
        message:
          reservation.status === "REFUNDED"
            ? "This activation has already been refunded."
            : "This activation has already been cancelled.",
      });
    }

    if (reservation.kind === "uncertain") {
      return NextResponse.json(
        {
          success: false,
          uncertain: true,
          error:
            "A cancellation is already awaiting confirmation. Do not retry yet; refresh your history or contact support.",
        },
        { status: 202 },
      );
    }

    if (reservation.kind === "not_cancellable") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only pending activations without a received verification code can be cancelled.",
        },
        { status: 409 },
      );
    }

    if (reservation.kind === "missing_provider_id") {
      return NextResponse.json(
        {
          success: false,
          error:
            "The supplier activation ID is unavailable. Contact support before attempting cancellation.",
        },
        { status: 409 },
      );
    }

    let providerResponse: unknown;

    try {
      providerResponse = await smsbulkEmailRequest<unknown>(
        `/email-activations/${encodeURIComponent(reservation.providerActivationId)}`,
        { method: "DELETE" },
      );
    } catch (error) {
      if (error instanceof SmsbulkEmailError) {
        const code = findValue(error.details, ["code"]);
        const retryAfterValue = findValue(error.details, ["retryAfterSec"]);
        const retryAfterSec =
          typeof retryAfterValue === "number" &&
          Number.isFinite(retryAfterValue)
            ? retryAfterValue
            : undefined;

        if (
          error.status === 409 &&
          code === "EMAIL_REORDER_IN_PROGRESS"
        ) {
          await restorePending(
            id,
            user.id,
            "The supplier is processing another request. Cancellation was not confirmed.",
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "The supplier is processing another request. Please try again later.",
              retryAfterSec,
            },
            { status: 409 },
          );
        }

        if (error.status >= 400 && error.status < 500) {
          console.warn("SMSBulk rejected email cancellation:", {
            activationId: id,
            providerStatus: error.status,
            providerMessage: error.message.slice(0, 300),
            providerCode: findValue(error.details, ["code"]),
          });

          await restorePending(
            id,
            user.id,
            "The supplier did not confirm cancellation. No refund was issued.",
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "The supplier did not confirm cancellation. No refund was issued. Refresh your activation before trying again.",
            },
            { status: 409 },
          );
        }
      }

      console.error("SMSBulk email cancellation result uncertain:", {
        activationId: id,
        providerStatus:
          error instanceof SmsbulkEmailError ? error.status : undefined,
      });

      return NextResponse.json(
        {
          success: false,
          uncertain: true,
          error:
            "The supplier's cancellation result could not be confirmed. No refund was issued. Contact support before retrying.",
        },
        { status: 202 },
      );
    }

    if (findValue(providerResponse, ["reorderRefunded"]) === true) {
      await restorePending(
        id,
        user.id,
        "The supplier refunded a reorder charge, but the original activation remains active.",
      );

      return NextResponse.json({
        success: false,
        error:
          "The supplier refunded a reorder charge, but the original activation remains active. Your original purchase was not refunded.",
      });
    }

    if (findValue(providerResponse, ["ok"]) !== true) {
      return NextResponse.json(
        {
          success: false,
          uncertain: true,
          error:
            "The supplier returned an unconfirmed cancellation result. No refund was issued. Contact support before retrying.",
        },
        { status: 202 },
      );
    }

    const outcome = await withTransaction(async (client) => {
      const result = await client.query<{
        walletId: string;
        priceMinor: string;
        status: string;
        otp: string | null;
      }>(
        `SELECT
           wallet_id AS "walletId",
           price_minor::text AS "priceMinor",
           status,
           otp
         FROM email_activations
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [id, user.id],
      );

      const activation = result.rows[0];

      if (!activation) {
        throw new Error("Activation disappeared during cancellation.");
      }

      if (activation.status === "REFUNDED") {
        return "refunded" as const;
      }

      if (activation.status !== "CANCEL_PENDING") {
        throw new Error(
          "Activation status changed before cancellation could be finalized.",
        );
      }

      if (activation.otp) {
        await client.query(
          `UPDATE email_activations
           SET status = 'CANCELLED',
               cancelled_at = COALESCE(cancelled_at, NOW()),
               error_message = 'Cancelled by supplier, but no refund was issued because a verification code had been received.',
               updated_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          [id, user.id],
        );

        return "cancelled_without_refund" as const;
      }

      const reference = `email-refund:${id}`;

      const existingRefund = await client.query(
        `SELECT id
         FROM wallet_transactions
         WHERE reference = $1
         LIMIT 1`,
        [reference],
      );

      if (existingRefund.rowCount === 0) {
        await creditWallet({
          client,
          walletId: activation.walletId,
          amountMinor: BigInt(activation.priceMinor),
          reference,
          description: "Refund for cancelled email activation",
          transactionType: "REFUND",
          metadata: {
            activationId: id,
            reason: "CANCELLED",
          },
        });
      }

      await client.query(
        `UPDATE email_activations
         SET status = 'REFUNDED',
             cancelled_at = COALESCE(cancelled_at, NOW()),
             error_message = 'Email activation cancelled and wallet refund recorded.',
             updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, user.id],
      );

      return "refunded" as const;
    });

    return NextResponse.json({
      success: true,
      message:
        outcome === "refunded"
          ? "Activation cancelled and wallet refund recorded."
          : "Activation cancelled. No refund was issued because a verification code had already been received.",
    });
  } catch (error) {
    console.error("Email activation cancellation failed:", error);

    return NextResponse.json(
      {
        success: false,
        uncertain: true,
        error:
          "Cancellation could not be finalized safely. Check your activation history or contact support before retrying.",
      },
      { status: 500 },
    );
  }
}
