import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import { hashSessionToken } from "./session-token";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
};

export async function getUserFromSessionToken(
  token: string,
): Promise<AuthenticatedUser | null> {
  const tokenHash = hashSessionToken(token);

  const result = await db.query<AuthenticatedUser>(
    `
      SELECT
        u.id,
        u.email,
        u.full_name AS "fullName",
        r.name AS role
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN roles r ON r.id = u.role_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1
    `,
    [tokenHash],
  );

  if (result.rowCount !== 1) {
    return null;
  }

  return result.rows[0];
}

export async function createSession(
  client: PoolClient,
  userId: string,
  tokenHash: string,
): Promise<Date> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await client.query(
    `
      INSERT INTO sessions (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt],
  );

  return expiresAt;
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);

  await db.query(
    `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE token_hash = $1
        AND revoked_at IS NULL
    `,
    [tokenHash],
  );
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.query(
    `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL
    `,
    [userId],
  );
}
