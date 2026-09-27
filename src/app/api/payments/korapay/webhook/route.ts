import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { withTransaction } from "@/lib/db-transaction";
import { creditWallet } from "@/lib/wallet/wallet-credit";
import { getActiveDepositProvider } from "@/lib/payments/providers/provider-registry";
import { storeWebhookEvent } from "@/lib/payments/webhook-service";

export const runtime = "nodejs";

type KoraWebhook = {
  event?: string;
  data?: {
    reference?: string;
    payment_reference?: string;
    amount?: string | number;
    currency?: string;
    status?: string;
  };
};

function getSecretKey(): string {
  const key = process.env.KORAPAY_SECRET_KEY?.trim();

  if (!key) {
    throw new Error("KORAPAY_SECRET_KEY is not configured");
  }

  return key;
}

function verifySignature(
  data: unknown,
  signature: string | null,
): boolean {
  if (!signature || !data) {
    return false;
  }

  const payload = JSON.stringify(data);

  const expected = crypto
    .createHmac("sha256", getSecretKey())
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature.trim(), "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function amountToMinor(amount: string | number | undefined): bigint {
  if (amount === undefined || amount === null) {
    throw new Error("Kora webhook amount is missing");
  }

  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Kora webhook amount is invalid");
  }

  return BigInt(Math.round(value * 100));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as KoraWebhook;
    const signature = request.headers.get("x-korapay-signature");

    if (!verifySignature(body.data, signature)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook signature",
        },
        { status: 401 },
      );
    }

    const event = body.event || "unknown";
    const data = body.data;

    if (!data?.reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Webhook reference is missing",
        },
        { status: 400 },
      );
    }

    const providerInfo = await getActiveDepositProvider();

    if (!providerInfo || !providerInfo.provider) {
      throw new Error("No active payment provider is configured");
    }

    if (event === "charge.success") {
      const verification = await providerInfo.provider.verifyPayment(
        data.reference,
      );

      if (!verification.success) {
        throw new Error(
          `Korapay verification failed: ${verification.rawStatus || "payment not successful"}`,
        );
      }
    }

    const eventId =
      data.reference +
      ":" +
      event +
      ":" +
      (data.payment_reference || data.reference);

    const result = await withTransaction(async (client) => {
      const stored = await storeWebhookEvent(client, {
        providerId: providerInfo.id,
        eventId,
        eventType: event,
        payload: body,
      });

      if (!stored.isNew) {
        return {
          duplicate: true,
          credited: false,
        };
      }

      if (event !== "charge.success") {
        await client.query(
          `
            UPDATE payment_webhook_events
            SET
              processing_status = 'IGNORED',
              processed_at = NOW()
            WHERE id = $1
          `,
          [stored.id],
        );

        return {
          duplicate: false,
          credited: false,
        };
      }

      const paymentResult = await client.query<{
        id: string;
        user_id: string;
        wallet_id: string;
        amount_minor: string;
        currency: string;
        status: string;
        provider_reference: string | null;
      }>(
        `
          SELECT
            id,
            user_id,
            wallet_id,
            amount_minor,
            currency,
            status,
            provider_reference
          FROM payments
          WHERE provider_id = $1
            AND provider_reference = $2
          FOR UPDATE
        `,
        [providerInfo.id, data.payment_reference || data.reference],
      );

      if (paymentResult.rowCount !== 1) {
        await client.query(
          `
            UPDATE payment_webhook_events
            SET
              processing_status = 'FAILED',
              error_message = 'Payment not found for Kora reference',
              processed_at = NOW()
            WHERE id = $1
          `,
          [stored.id],
        );

        throw new Error("Payment not found for Kora reference");
      }

      const payment = paymentResult.rows[0];

      if (payment.status === "SUCCESS") {
        await client.query(
          `
            UPDATE payment_webhook_events
            SET
              processing_status = 'PROCESSED',
              processed_at = NOW()
            WHERE id = $1
          `,
          [stored.id],
        );

        return {
          duplicate: false,
          credited: false,
        };
      }

      const webhookAmountMinor = amountToMinor(data.amount);
      const expectedAmountMinor = BigInt(payment.amount_minor);

      if (webhookAmountMinor !== expectedAmountMinor) {
        await client.query(
          `
            UPDATE payments
            SET
              status = 'FAILED',
              metadata = COALESCE(metadata, '{}'::jsonb)
                || jsonb_build_object(
                  'webhookError',
                  'Amount mismatch',
                  'webhookAmountMinor',
                  $2,
                  'expectedAmountMinor',
                  $3
                ),
              updated_at = NOW()
            WHERE id = $1
          `,
          [
            payment.id,
            webhookAmountMinor.toString(),
            expectedAmountMinor.toString(),
          ],
        );

        await client.query(
          `
            UPDATE payment_webhook_events
            SET
              processing_status = 'FAILED',
              error_message = 'Payment amount mismatch',
              processed_at = NOW()
            WHERE id = $1
          `,
          [stored.id],
        );

        throw new Error("Payment amount mismatch");
      }

      if ((data.currency || "").toUpperCase() !== payment.currency) {
        throw new Error("Payment currency mismatch");
      }

      const providerReference =
        data.reference || data.payment_reference || payment.provider_reference;

      await creditWallet({
        client,
        walletId: payment.wallet_id,
        amountMinor: webhookAmountMinor,
        reference: `PAYMENT-${payment.id}`,
        externalReference: providerReference || undefined,
        description: "Wallet funding via Korapay",
        metadata: {
          paymentId: payment.id,
          provider: "korapay",
          providerReference,
        },
      });

      await client.query(
        `
          UPDATE payments
          SET
            status = 'SUCCESS',
            provider_reference = COALESCE(provider_reference, $2),
            completed_at = NOW(),
            metadata = COALESCE(metadata, '{}'::jsonb)
              || jsonb_build_object(
                'webhookEvent',
                $3
              ),
            updated_at = NOW()
          WHERE id = $1
        `,
        [payment.id, providerReference, event],
      );

      await client.query(
        `
          UPDATE payment_webhook_events
          SET
            payment_id = $2,
            processing_status = 'PROCESSED',
            processed_at = NOW()
          WHERE id = $1
        `,
        [stored.id, payment.id],
      );

      return {
        duplicate: false,
        credited: true,
      };
    });

    return NextResponse.json({
      success: true,
      received: true,
      duplicate: result.duplicate,
      credited: result.credited,
    });
  } catch (error) {
    console.error("Korapay webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed",
      },
      { status: 500 },
    );
  }
}
