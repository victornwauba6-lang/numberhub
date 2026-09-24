import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { withTransaction } from "@/lib/db-transaction";
import { hashPassword } from "./password";

const CODE_EXPIRY_MS = 10 * 60 * 1000;

function hashResetCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateResetCode(): string {
  return randomInt(100000, 1000000).toString();
}

export async function createPasswordResetCode(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const userResult = await db.query<{
    id: string;
    email: string;
  }>(
    `
      SELECT id, email
      FROM users
      WHERE email = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [normalizedEmail],
  );

  if (userResult.rowCount !== 1) {
    return null;
  }

  const user = userResult.rows[0];
  const code = generateResetCode();
  const tokenHash = hashResetCode(code);
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  await db.query(
    `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE user_id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
    `,
    [user.id],
  );

  await db.query(
    `
      INSERT INTO password_reset_tokens (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
    `,
    [user.id, tokenHash, expiresAt],
  );

  return {
    userId: user.id,
    email: user.email,
    code,
    expiresAt,
  };
}

export async function verifyPasswordResetCode(
  email: string,
  code: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const tokenHash = hashResetCode(code.trim());

  const result = await db.query<{
    tokenId: string;
    userId: string;
    email: string;
  }>(
    `
      SELECT
        prt.id AS "tokenId",
        u.id AS "userId",
        u.email
      FROM password_reset_tokens prt
      INNER JOIN users u ON u.id = prt.user_id
      WHERE u.email = $1
        AND prt.token_hash = $2
        AND prt.used_at IS NULL
        AND prt.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1
    `,
    [normalizedEmail, tokenHash],
  );

  if (result.rowCount !== 1) {
    return null;
  }

  return result.rows[0];
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
) {
  const verified = await verifyPasswordResetCode(email, code);

  if (!verified) {
    throw new Error("Invalid or expired verification code");
  }

  const passwordHash = await hashPassword(newPassword);

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE users
        SET
          password_hash = $1,
          updated_at = NOW()
        WHERE id = $2
      `,
      [passwordHash, verified.userId],
    );

    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = $1
          AND used_at IS NULL
      `,
      [verified.tokenId],
    );

    await client.query(
      `
        UPDATE sessions
        SET revoked_at = NOW()
        WHERE user_id = $1
          AND revoked_at IS NULL
      `,
      [verified.userId],
    );
  });

  return verified;
}
