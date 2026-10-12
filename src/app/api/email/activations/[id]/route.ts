import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { creditWallet } from "@/lib/wallet/wallet-credit";
import { withTransaction } from "@/lib/db-transaction";
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

function findString(value: unknown, keys: string[]): string | null {
  const found = findValue(value, keys);

  if (typeof found === "string" && found.trim()) {
    return found.trim();
  }

  if (typeof found === "number" && Number.isFinite(found)) {
    return String(found);
  }

  return null;
}

function mapStatus(payload: unknown, existingStatus: string): string {
  const otp = findString(payload, ["otpValue", "otp", "code", "verification_code"]);

  if (otp) return "CODE_RECEIVED";

  const raw = findString(payload, ["status", "state"])?.toUpperCase();

  if (!raw) return existingStatus;

  if (raw === "RECEIVED") return "CODE_RECEIVED";

  if (["COMPLETED", "COMPLETE", "SUCCESS", "FINISHED"].includes(raw)) {
    return "COMPLETED";
  }

  if (["CANCELLED", "CANCELED"].includes(raw)) {
    return "CANCELLED";
  }

  if (["EXPIRED", "TIMEOUT", "TIMED_OUT"].includes(raw)) {
    return "EXPIRED";
  }

  if (["FAILED", "ERROR"].includes(raw)) {
    return "FAILED";
  }

  if (["PENDING", "WAITING", "ACTIVE", "PROCESSING"].includes(raw)) {
    return "PENDING";
  }

  return existingStatus;
}

export async function GET(
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

    const result = await withTransaction(async (client) => {
      return client.query(
        `
          SELECT
            id,
            provider_activation_id AS "providerActivationId",
            site,
            domain,
            email_address AS "emailAddress",
            status,
            price_minor::text AS "priceMinor",
            currency,
            otp,
            html,
            error_message AS "errorMessage",
            expires_at AS "expiresAt",
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            completed_at AS "completedAt",
            cancelled_at AS "cancelledAt"
          FROM email_activations
          WHERE id = $1 AND user_id = $2
          LIMIT 1
        `,
        [id, user.id],
      );
    });

    const current = result.rows[0];

    if (!current) {
      return NextResponse.json(
        { success: false, error: "Activation not found." },
        { status: 404 },
      );
    }

    if (!current.providerActivationId) {
      return NextResponse.json({
        success: true,
        activation: current,
        refreshWarning:
          "The provider activation ID is not available yet. This activation may require support reconciliation.",
      });
    }

    const terminalStatuses = [
      "COMPLETED",
      "CANCEL_PENDING",
      "CANCELLED",
      "EXPIRED",
      "FAILED",
      "REFUNDED",
    ];

    if (terminalStatuses.includes(current.status)) {
      const activation = { ...current };
      delete activation.providerActivationId;

      return NextResponse.json({ success: true, activation });
    }

    let providerPayload: unknown;

    try {
      providerPayload = await smsbulkEmailRequest<unknown>(
        `/email-activations/${encodeURIComponent(current.providerActivationId)}`,
      );
    } catch (error) {
      console.error("SMSBulk email activation refresh failed:", {
        activationId: id,
        status: error instanceof SmsbulkEmailError ? error.status : undefined,
      });

      const activation = { ...current };
      delete activation.providerActivationId;

      return NextResponse.json({
        success: true,
        activation,
        refreshWarning:
          "The latest verification status could not be confirmed. Showing the last saved status.",
      });
    }

    const otp = findString(providerPayload, [
      "otpValue",
      "otp",
      "code",
      "verification_code",
    ]);

    const emailAddress = findString(providerPayload, [
      "emailAddress",
      "email",
      "email_address",
      "address",
    ]);

    const html = findString(providerPayload, ["htmlMessage", "html", "content"]);

    const newStatus = mapStatus(providerPayload, current.status);

    const updated = await withTransaction(async (client) => {
      const lockedResult = await client.query<{
        wallet_id: string;
        priceMinor: string;
        status: string;
        otp: string | null;
      }>(
        `SELECT wallet_id, price_minor::text AS "priceMinor", status, otp
         FROM email_activations
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [id, user.id],
      );

      const locked = lockedResult.rows[0];
      if (!locked) {
        throw new Error("Email activation not found during status update.");
      }

      const hasOtp = Boolean(otp || locked.otp);
      const terminalFailure = ["CANCELLED", "EXPIRED", "FAILED"].includes(newStatus);

      // Never let a stale provider response overwrite a protected activation state.
      const protectedStatuses = [
        "COMPLETED",
        "REFUNDED",
        "CANCEL_PENDING",
        "CANCELLED",
        "EXPIRED",
        "FAILED",
      ];
      const preserveCurrentStatus =
        protectedStatuses.includes(locked.status) ||
        (locked.status === "CODE_RECEIVED" && newStatus !== "COMPLETED");
      let statusToSave = preserveCurrentStatus ? locked.status : newStatus;

      if (!preserveCurrentStatus && hasOtp && terminalFailure) {
        statusToSave = "CODE_RECEIVED";
      }

      if (!preserveCurrentStatus && terminalFailure && !hasOtp) {
        await creditWallet({
          client,
          walletId: locked.wallet_id,
          amountMinor: BigInt(locked.priceMinor),
          reference: `email-refund:${id}`,
          description: "Refund for failed email activation",
          transactionType: "REFUND",
          metadata: {
            activationId: id,
            reason: statusToSave,
          },
        });

        statusToSave = "REFUNDED";
      }

      const updateResult = await client.query(
        `
          UPDATE email_activations
          SET
            otp = COALESCE($3, otp),
            html = COALESCE($4, html),
            email_address = COALESCE($5, email_address),
            status = $6,
            error_message = CASE
              WHEN $6 = 'REFUNDED' THEN 'Wallet refunded after confirmed activation failure.'
              ELSE error_message
            END,
            completed_at = CASE
              WHEN $6 = 'COMPLETED' THEN COALESCE(completed_at, NOW())
              ELSE completed_at
            END,
            cancelled_at = CASE
              WHEN $6 IN ('CANCELLED', 'REFUNDED') AND $7 = 'CANCELLED'
                THEN COALESCE(cancelled_at, NOW())
              ELSE cancelled_at
            END,
            last_polled_at = NOW(),
            updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          RETURNING
            id,
            site,
            domain,
            email_address AS "emailAddress",
            status,
            price_minor::text AS "priceMinor",
            currency,
            otp,
            html,
            error_message AS "errorMessage",
            expires_at AS "expiresAt",
            created_at AS "createdAt",
            updated_at AS "updatedAt",
            completed_at AS "completedAt",
            cancelled_at AS "cancelledAt"
        `,
        [id, user.id, otp, html, emailAddress, statusToSave, newStatus],
      );

      if (updateResult.rowCount !== 1) {
        throw new Error("Email activation status update failed.");
      }

      return updateResult.rows[0];
    });

    return NextResponse.json({
      success: true,
      activation: updated,
    });
  } catch (error) {
    console.error("Email activation retrieval error:", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { success: false, error: "Unable to retrieve this email activation." },
      { status: 500 },
    );
  }
}
