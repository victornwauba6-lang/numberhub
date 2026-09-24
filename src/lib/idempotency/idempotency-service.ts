import type { PoolClient } from "pg";

export type IdempotencyRecord = {
  id: string;
  userId: string | null;
  key: string;
  operation: string;
  requestHash: string;
  responseStatus: number | null;
  responseBody: unknown;
  resourceType: string | null;
  resourceId: string | null;
  expiresAt: Date | null;
};

export async function getIdempotencyRecord(
  client: PoolClient,
  userId: string | null,
  key: string,
  operation: string,
): Promise<IdempotencyRecord | null> {
  const result = await client.query<IdempotencyRecord>(
    `
      SELECT
        id,
        user_id AS "userId",
        key,
        operation,
        request_hash AS "requestHash",
        response_status AS "responseStatus",
        response_body AS "responseBody",
        resource_type AS "resourceType",
        resource_id AS "resourceId",
        expires_at AS "expiresAt"
      FROM idempotency_keys
      WHERE user_id IS NOT DISTINCT FROM $1
        AND key = $2
        AND operation = $3
        AND (
          expires_at IS NULL
          OR expires_at > NOW()
        )
      LIMIT 1
    `,
    [userId, key, operation],
  );

  return result.rowCount === 1 ? result.rows[0] : null;
}

export async function createIdempotencyRecord(
  client: PoolClient,
  userId: string | null,
  key: string,
  operation: string,
  requestHash: string,
  expiresAt: Date | null = null,
): Promise<IdempotencyRecord> {
  const result = await client.query<IdempotencyRecord>(
    `
      INSERT INTO idempotency_keys (
        user_id,
        key,
        operation,
        request_hash,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        user_id AS "userId",
        key,
        operation,
        request_hash AS "requestHash",
        response_status AS "responseStatus",
        response_body AS "responseBody",
        resource_type AS "resourceType",
        resource_id AS "resourceId",
        expires_at AS "expiresAt"
    `,
    [userId, key, operation, requestHash, expiresAt],
  );

  return result.rows[0];
}

export async function completeIdempotencyRecord(
  client: PoolClient,
  id: string,
  responseStatus: number,
  responseBody: unknown,
  resourceType: string | null = null,
  resourceId: string | null = null,
): Promise<void> {
  await client.query(
    `
      UPDATE idempotency_keys
      SET
        response_status = $1,
        response_body = $2,
        resource_type = $3,
        resource_id = $4
      WHERE id = $5
    `,
    [
      responseStatus,
      JSON.stringify(responseBody),
      resourceType,
      resourceId,
      id,
    ],
  );
}
