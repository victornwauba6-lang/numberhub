import { db } from "@/lib/db";
import { withTransaction } from "@/lib/db-transaction";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "./password";
import { createSession } from "./session-service";
import { createSessionToken, hashSessionToken } from "./session-token";

export type RegisterInput = {
  email: string;
  password: string;
  fullName?: string;
  termsVersion: string;
  privacyVersion: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthResult = {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  sessionToken: string;
  expiresAt: Date;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUser(
  input: RegisterInput,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);

  if (!email || !email.includes("@")) {
    throw new Error("Invalid email address");
  }

  const passwordHash = await hashPassword(input.password);

  return withTransaction(async (client) => {
    const roleResult = await client.query<{ id: string; name: string }>(
      `
        SELECT id, name
        FROM roles
        WHERE name = 'CUSTOMER'
        LIMIT 1
      `,
    );

    if (roleResult.rowCount !== 1) {
      throw new Error("Customer role is not configured");
    }

    const role = roleResult.rows[0];

    let userResult;

    try {
      userResult = await client.query<{
        id: string;
        email: string;
        fullName: string | null;
        role: string;
      }>(
        `
          INSERT INTO users (
            email,
            password_hash,
            full_name,
            role_id
          )
          VALUES ($1, $2, $3, $4)
          RETURNING
            id,
            email,
            full_name AS "fullName"
        `,
        [email, passwordHash, input.fullName?.trim() || null, role.id],
      );
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new Error("An account with this email already exists");
      }

      throw error;
    }

    const user = userResult.rows[0];

    await client.query(
      `
        INSERT INTO legal_acceptances (
          user_id,
          terms_version,
          privacy_version
        )
        VALUES ($1, $2, $3)
      `,
      [user.id, input.termsVersion, input.privacyVersion],
    );

    await client.query(
      `
        INSERT INTO wallets (
          user_id,
          balance_minor,
          currency
        )
        VALUES ($1, 0, 'NGN')
      `,
      [user.id],
    );

    const sessionToken = createSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = await createSession(client, user.id, tokenHash);

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: role.name,
      sessionToken,
      expiresAt,
    };
  });
}

export async function loginUser(
  input: LoginInput,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);

  const result = await db.query<{
    id: string;
    email: string;
    passwordHash: string;
    legacyBcryptHash: string | null;
    fullName: string | null;
    role: string;
    isActive: boolean;
  }>(
    `
      SELECT
        u.id,
        u.email,
        u.password_hash AS "passwordHash",
        u.legacy_bcrypt_hash AS "legacyBcryptHash",
        u.full_name AS "fullName",
        r.name AS role,
        u.is_active AS "isActive"
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1
      LIMIT 1
    `,
    [email],
  );

  if (result.rowCount !== 1) {
    throw new Error("Invalid email or password");
  }

  const user = result.rows[0];

  if (!user.isActive) {
    throw new Error("This account is inactive");
  }

  let validPassword = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  let shouldMigrateLegacyPassword = false;

  if (!validPassword && user.legacyBcryptHash) {
    validPassword = await bcrypt.compare(
      input.password,
      user.legacyBcryptHash,
    );
    shouldMigrateLegacyPassword = validPassword;
  }

  if (!validPassword) {
    throw new Error("Invalid email or password");
  }

  const sessionToken = createSessionToken();
  const tokenHash = hashSessionToken(sessionToken);

  const expiresAt = await withTransaction(async (client) => {
    if (shouldMigrateLegacyPassword) {
      const newPasswordHash = await hashPassword(input.password);

      await client.query(
        `
          UPDATE users
          SET
            password_hash = $1,
            legacy_bcrypt_hash = NULL,
            last_login_at = NOW(),
            updated_at = NOW()
          WHERE id = $2
        `,
        [newPasswordHash, user.id],
      );
    } else {
      await client.query(
        `
          UPDATE users
          SET last_login_at = NOW()
          WHERE id = $1
        `,
        [user.id],
      );
    }

    return createSession(client, user.id, tokenHash);
  });

  return {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    sessionToken,
    expiresAt,
  };
}
