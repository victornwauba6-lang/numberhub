import type { PoolClient } from "pg";

export type StoreWebhookEventInput = {
  providerId: string;
  eventId: string;
  eventType?: string | null;
  payload: unknown;
};

export async function storeWebhookEvent(
  client: PoolClient,
  input: StoreWebhookEventInput,
): Promise<{ id: string; isNew: boolean }> {
  const existing = await client.query<{ id: string }>(
    `
      SELECT id
      FROM payment_webhook_events
      WHERE provider_id = $1
        AND event_id = $2
      LIMIT 1
    `,
    [input.providerId, input.eventId],
  );

  if (existing.rowCount === 1) {
    return {
      id: existing.rows[0].id,
      isNew: false,
    };
  }

  const result = await client.query<{ id: string }>(
    `
      INSERT INTO payment_webhook_events (
        provider_id,
        event_id,
        event_type,
        payload,
        processing_status
      )
      VALUES ($1, $2, $3, $4, 'RECEIVED')
      RETURNING id
    `,
    [
      input.providerId,
      input.eventId,
      input.eventType ?? null,
      JSON.stringify(input.payload),
    ],
  );

  return {
    id: result.rows[0].id,
    isNew: true,
  };
}
