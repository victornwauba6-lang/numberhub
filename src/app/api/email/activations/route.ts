import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { withTransaction } from "@/lib/db-transaction";
import { debitWallet } from "@/lib/wallet/wallet-debit";
import { creditWallet } from "@/lib/wallet/wallet-credit";
import {
  smsbulkEmailRequest,
  SmsbulkEmailError,
} from "@/lib/suppliers/smsbulk-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

type DomainRecord = {
  name?: unknown;
  domain?: unknown;
  price?: unknown;
  count?: unknown;
  stock?: unknown;
  currency?: unknown;
  disabled?: unknown;
};

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function findDomains(value: unknown): DomainRecord[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is DomainRecord => asObject(item) !== null,
    );
  }

  const object = asObject(value);
  if (!object) return [];

  for (const key of ["domains", "data", "results"]) {
    if (key in object) {
      const result = findDomains(object[key]);
      if (result.length) return result;
    }
  }

  return [];
}

function numberValue(value: unknown): number | null {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function findString(
  value: unknown,
  keys: string[],
  depth = 0,
): string | null {
  if (depth > 5) return null;

  const object = asObject(value);
  if (!object) return null;

  for (const key of keys) {
    const candidate = object[key];
    if (
      typeof candidate === "string" &&
      candidate.trim() !== ""
    ) {
      return candidate.trim();
    }

    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate)
    ) {
      return String(candidate);
    }
  }

  for (const key of ["data", "activation", "result"]) {
    if (key in object) {
      const found = findString(object[key], keys, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

export async function POST(request: Request) {
  let activationId: string | null = null;
  let providerWasContacted = false;
  let providerPayload: unknown;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const rawKey = request.headers.get("idempotency-key")?.trim();

    if (
      !rawKey ||
      rawKey.length > 120 ||
      !/^[A-Za-z0-9._:-]+$/.test(rawKey)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid Idempotency-Key header is required.",
        },
        { status: 400 },
      );
    }

    const idempotencyKey = `${user.id}:${rawKey}`;

    const body = asObject(await request.json().catch(() => null));

    const site =
      typeof body?.site === "string"
        ? body.site.trim().toLowerCase()
        : "";

    const domain =
      typeof body?.domain === "string"
        ? body.domain.trim().toLowerCase()
        : "";

    const validWebsite = (value: string) =>
      value.length <= 253 &&
      /^[a-z0-9.-]+$/.test(value) &&
      !value.startsWith(".") &&
      !value.endsWith(".") &&
      !value.includes("..");

    if (!validWebsite(site) || !validWebsite(domain)) {
      return NextResponse.json(
        { success: false, error: "A valid website and email domain are required." },
        { status: 400 },
      );
    }

    const existing = await withTransaction(async (client) => {
      const result = await client.query(
        `
          SELECT
            id,
            site,
            domain,
            email_address AS "emailAddress",
            status,
            price_minor::text AS "priceMinor",
            provider_activation_id AS "providerActivationId",
            created_at AS "createdAt"
          FROM email_activations
          WHERE user_id = $1 AND idempotency_key = $2
          LIMIT 1
        `,
        [user.id, idempotencyKey],
      );

      return result.rows[0] ?? null;
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        activation: existing,
        idempotentReplay: true,
      });
    }

    const domainPayload = await smsbulkEmailRequest<unknown>(
      `/email-activations/domains?site=${encodeURIComponent(site)}`,
    );

    const offeredDomain = findDomains(domainPayload).find((item) => {
      const name =
        typeof item.name === "string"
          ? item.name
          : typeof item.domain === "string"
            ? item.domain
            : "";

      return name.trim().toLowerCase() === domain;
    });

    if (!offeredDomain) {
      return NextResponse.json(
        {
          success: false,
          error: "That email domain is not available for this website.",
        },
        { status: 400 },
      );
    }

    const stock = numberValue(offeredDomain.count ?? offeredDomain.stock);

    if (offeredDomain.disabled === true || stock === 0) {
      return NextResponse.json(
        { success: false, error: "That email domain is currently unavailable." },
        { status: 409 },
      );
    }

    const supplierPrice = numberValue(offeredDomain.price);
    const supplierCurrency =
      typeof offeredDomain.currency === "string"
        ? offeredDomain.currency.toUpperCase()
        : "USD";

    if (
      supplierPrice === null ||
      !/^[A-Z]{3}$/.test(supplierCurrency)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "The supplier returned invalid domain pricing.",
        },
        { status: 502 },
      );
    }

    const priceMinor = BigInt(45000);

    const reservation = await withTransaction(async (client) => {
      const walletResult = await client.query<{ id: string }>(
        `
          SELECT id
          FROM wallets
          WHERE user_id = $1 AND currency = 'NGN'
          FOR UPDATE
        `,
        [user.id],
      );

      if (walletResult.rowCount !== 1) {
        throw new Error("NGN wallet not found.");
      }

      const walletId = walletResult.rows[0].id;

    // Block new purchases while an earlier email activation is unresolved.
    // The wallet row lock serializes purchase reservations for this user.
    const unresolvedResult = await client.query<{ id: string; status: string }>(
      `
        SELECT id, status
        FROM email_activations
        WHERE user_id = $1
          AND status IN ('UNKNOWN', 'PROCESSING')
          AND idempotency_key <> $2
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [user.id, idempotencyKey],
    );

    if (unresolvedResult.rowCount === 1) {
      return {
        blocked: {
          id: unresolvedResult.rows[0].id,
          status: unresolvedResult.rows[0].status,
        },
        duplicate: null,
        id: null,
      };
    }


      const inserted = await client.query<{ id: string }>(
        `
          INSERT INTO email_activations (
            user_id,
            wallet_id,
            site,
            domain,
            status,
            price_minor,
            supplier_price,
            supplier_currency,
            idempotency_key,
            metadata
          )
          VALUES (
            $1, $2, $3, $4, 'PROCESSING', $5, $6, $7, $8,
            '{"purchaseStage":"reserved"}'::jsonb
          )
          ON CONFLICT (idempotency_key) DO NOTHING
          RETURNING id
        `,
        [
          user.id,
          walletId,
          site,
          domain,
          priceMinor.toString(),
          supplierPrice,
          supplierCurrency,
          idempotencyKey,
        ],
      );

      if (inserted.rowCount !== 1) {
        const duplicate = await client.query(
          `
            SELECT
              id,
              site,
              domain,
              email_address AS "emailAddress",
              status,
              price_minor::text AS "priceMinor",
              provider_activation_id AS "providerActivationId",
              created_at AS "createdAt"
            FROM email_activations
            WHERE user_id = $1 AND idempotency_key = $2
            LIMIT 1
          `,
          [user.id, idempotencyKey],
        );

        return {
          blocked: null,
          duplicate: duplicate.rows[0] ?? null,
          id: null,
        };
      }

      const id = inserted.rows[0].id;

      await debitWallet(
        client,
        walletId,
        priceMinor,
        `email-purchase:${id}`,
        `Email verification purchase: ${site} (${domain})`,
        {
          activationId: id,
          site,
          domain,
          supplier: "smsbulk",
        },
      );

      return { blocked: null, duplicate: null, id };
    });

    if (reservation.blocked) {
      return NextResponse.json(
        {
          success: false,
          error: "An email activation is still processing or needs reconciliation. Refresh your activation history or contact support before making another purchase.",
          activationId: reservation.blocked.id,
          unresolvedStatus: reservation.blocked.status,
        },
        { status: 409 },
      );
    }

    if (!reservation.id) {
      if (reservation.duplicate) {
        return NextResponse.json({
          success: true,
          activation: reservation.duplicate,
          idempotentReplay: true,
        });
      }

      return NextResponse.json(
        { success: false, error: "Unable to reserve this purchase." },
        { status: 409 },
      );
    }

    activationId = reservation.id;
    try {
      providerWasContacted = true;

      providerPayload = await smsbulkEmailRequest<unknown>(
        "/email-activations",
        {
          method: "POST",
          body: { site, domain },
        },
      );
    } catch (error) {
      const providerError =
        error instanceof SmsbulkEmailError ? error : null;

      const responseWasReceived =
        providerError !== null && providerError.details !== undefined;

      const providerErrorBody =
        providerError?.details &&
        typeof providerError.details === "object"
          ? providerError.details as Record<string, unknown>
          : null;

      const providerErrorCode =
        typeof providerErrorBody?.code === "string"
          ? providerErrorBody.code
          : "";

      const definitelyRejected =
        responseWasReceived &&
        (
          [400, 401, 402, 429].includes(providerError.status) ||
          (
            providerError.status === 503 &&
            [
              "EMAIL_PURCHASE_DISABLED",
              "EMAIL_DOMAIN_DISABLED",
            ].includes(providerErrorCode)
          )
        );

      if (definitelyRejected) {
        const refundOutcome = await withTransaction(async (client) => {
          const activationResult = await client.query<{
            wallet_id: string;
            status: string;
          }>(
            `SELECT wallet_id, status
             FROM email_activations
             WHERE id = $1
             FOR UPDATE`,
            [activationId],
          );

          const currentActivation = activationResult.rows[0];

          if (!currentActivation) {
            throw new Error("Email activation was not found during refund.");
          }

          if (currentActivation.status === "REFUNDED") {
            return "already_refunded";
          }

          if (currentActivation.status !== "PROCESSING") {
            return "not_eligible";
          }

          await creditWallet({
            client,
            walletId: currentActivation.wallet_id,
            amountMinor: priceMinor,
            reference: `email-refund:${activationId}`,
            description: "Refund for rejected email activation",
            transactionType: "REFUND",
            metadata: {
              activationId,
              reason: "Provider rejected activation request",
            },
          });

          const updateResult = await client.query(
            `
              UPDATE email_activations
              SET status = 'REFUNDED',
                  error_message = $2,
                  metadata = metadata || '{"purchaseStage":"provider_rejected"}'::jsonb,
                  updated_at = NOW()
              WHERE id = $1 AND status = 'PROCESSING'
              RETURNING id
            `,
            [
              activationId,
              providerError?.message?.slice(0, 500) ??
                "Provider rejected activation request",
            ],
          );

          if (updateResult.rowCount !== 1) {
            throw new Error("Email activation status changed during refund.");
          }

          return "refunded";
        });

        if (refundOutcome === "not_eligible") {
          return NextResponse.json(
            {
              success: false,
              uncertain: true,
              error: "The activation status changed. Check its current status before retrying.",
            },
            { status: 202 },
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: "The email provider rejected the request. Your wallet has been refunded.",
          },
          { status: 502 },
        );
      }

      await withTransaction(async (client) => {
        await client.query(
          `
            UPDATE email_activations
            SET status = 'UNKNOWN',
                error_message = $2,
                metadata = metadata || '{"purchaseStage":"provider_response_uncertain"}'::jsonb,
                updated_at = NOW()
            WHERE id = $1
          `,
          [
            activationId,
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Uncertain provider response",
          ],
        );
      });

      return NextResponse.json(
        {
          success: false,
          uncertain: true,
          activationId,
          error: "The provider response could not be confirmed. Do not retry this purchase with a new key; contact support for reconciliation.",
        },
        { status: 202 },
      );
    }

    const providerId = findString(
      providerPayload,
      ["id", "activation_id", "activationId"],
    );

    const emailAddress = findString(
      providerPayload,
      ["emailAddress", "email", "email_address", "address"],
    );

    if (!providerId) {
      await withTransaction(async (client) => {
        await client.query(
          `
            UPDATE email_activations
            SET status = 'UNKNOWN',
                provider_payload = $2::jsonb,
                email_address = $3,
                metadata = metadata || '{"purchaseStage":"missing_provider_id"}'::jsonb,
                updated_at = NOW()
            WHERE id = $1
          `,
          [activationId, safeJson(providerPayload), emailAddress],
        );
      });

      return NextResponse.json(
        {
          success: false,
          uncertain: true,
          activationId,
          error: "SMSBulk responded but did not provide an activation ID. Support reconciliation is required.",
        },
        { status: 202 },
      );
    }

    const activation = await withTransaction(async (client) => {
      const result = await client.query(
        `
          UPDATE email_activations
          SET provider_activation_id = $2,
              email_address = $3,
              status = 'PENDING',
              provider_payload = $4::jsonb,
              error_message = NULL,
              updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            site,
            domain,
            email_address AS "emailAddress",
            status,
            price_minor::text AS "priceMinor",
            provider_activation_id AS "providerActivationId",
            created_at AS "createdAt"
        `,
        [
          activationId,
          providerId,
          emailAddress,
          safeJson(providerPayload),
        ],
      );

      return result.rows[0];
    });

    return NextResponse.json({
      success: true,
      activation,
    });
  } catch (error) {
    console.error("Email activation purchase error:", {
      activationId,
      providerWasContacted,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    if (providerWasContacted && providerPayload !== undefined && activationId) {
      const recoveredProviderId = findString(
        providerPayload,
        ["id", "activation_id", "activationId"],
      );
      const recoveredEmail = findString(
        providerPayload,
        ["emailAddress", "email", "email_address", "address"],
      );

      try {
        await withTransaction(async (client) => {
          await client.query(
            `
              UPDATE email_activations
              SET status = 'UNKNOWN',
                  provider_activation_id = COALESCE(provider_activation_id, $2),
                  email_address = COALESCE(email_address, $3),
                  provider_payload = $4::jsonb,
                  error_message = $5,
                  metadata = metadata || '{"purchaseStage":"provider_succeeded_database_save_uncertain"}'::jsonb,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [
              activationId,
              recoveredProviderId,
              recoveredEmail,
              safeJson(providerPayload),
              "SMSBulk responded, but saving the activation could not be confirmed.",
            ],
          );
        });
      } catch (recoveryError) {
        console.error("Email activation recovery save failed:", {
          activationId,
          message: recoveryError instanceof Error
            ? recoveryError.message
            : "Unknown recovery error",
        });
      }

      return NextResponse.json(
        {
          success: false,
          uncertain: true,
          activationId,
          error: "The purchase outcome is uncertain. Do not purchase again; contact support for reconciliation.",
        },
        { status: 202 },
      );
    }



    if (error instanceof SmsbulkEmailError) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.status === 503
              ? "Email verification is temporarily unavailable."
              : "Unable to complete the email purchase.",
        },
        { status: error.status >= 500 ? error.status : 502 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Email purchase failed.";

    const status =
      message.includes("Insufficient wallet balance")
        ? 402
        : message.includes("wallet")
          ? 409
          : 500;

    return NextResponse.json(
      {
        success: false,
        error:
          status === 402
            ? "Your wallet balance is insufficient."
            : "Unable to complete the email purchase.",
      },
      { status },
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const result = await withTransaction(async (client) => {
      return client.query(
        `
          SELECT
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
          FROM email_activations
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 50
        `,
        [user.id],
      );
    });

    return NextResponse.json({
      success: true,
      activations: result.rows,
    });
  } catch (error) {
    console.error("Email activation history error:", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { success: false, error: "Unable to load email activation history." },
      { status: 500 },
    );
  }
}
