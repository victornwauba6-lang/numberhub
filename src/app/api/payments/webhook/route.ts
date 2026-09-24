import { NextResponse } from "next/server";
import { withTransaction } from "@/lib/db-transaction";
import { storeWebhookEvent } from "@/lib/payments/webhook-service";

export const runtime = "nodejs";

type WebhookBody = {
  eventId?: unknown;
  eventType?: unknown;
  providerId?: unknown;
  data?: unknown;
};

export async function POST(request: Request) {
  let body: WebhookBody;

  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid webhook payload",
      },
      { status: 400 },
    );
  }

  if (
    typeof body.eventId !== "string" ||
    !body.eventId.trim()
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Webhook event ID is required",
      },
      { status: 400 },
    );
  }

  if (
    typeof body.providerId !== "string" ||
    !body.providerId.trim()
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Webhook provider ID is required",
      },
      { status: 400 },
    );
  }

  const providerId = body.providerId.trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      providerId,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid webhook provider ID",
      },
      { status: 400 },
    );
  }

  try {
    const providerCheck = await withTransaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `
          SELECT id
          FROM payment_providers
          WHERE id = $1
          LIMIT 1
        `,
        [providerId],
      );

      return result.rowCount === 1;
    });

    if (!providerCheck) {
      return NextResponse.json(
        {
          success: false,
          error: "Unknown payment provider",
        },
        { status: 400 },
      );
    }

    const result = await withTransaction(async (client) => {
      return storeWebhookEvent(client, {
        providerId,
        eventId: (body.eventId as string).trim(),
        eventType:
          typeof body.eventType === "string"
            ? body.eventType.trim()
            : null,
        payload: body.data ?? body,
      });
    });

    return NextResponse.json({
      success: true,
      received: true,
      duplicate: !result.isNew,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Webhook could not be stored",
      },
      { status: 500 },
    );
  }
}
