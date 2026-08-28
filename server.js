const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

/* =========================================================
   CONFIGURATION
========================================================= */

const PORT = process.env.PORT || 3001;

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "http://localhost:3000";

const SMSPOOL_API_KEY = process.env.SMSPOOL_API_KEY;

if (!SMSPOOL_API_KEY) {
  console.warn("WARNING: SMSPOOL_API_KEY is not configured.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

/* =========================================================
   SMSPOOL API
========================================================= */

async function smsPoolRequest(endpoint, data = {}) {
  if (!SMSPOOL_API_KEY) {
    throw new Error("SMSPOOL_API_KEY is not configured");
  }

  const form = new URLSearchParams();

  form.append("key", SMSPOOL_API_KEY);

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  }

  const response = await fetch(
    `https://api.smspool.net${endpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: form.toString()
    }
  );

  const text = await response.text();

  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      `SMSPool returned invalid JSON: ${text}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `SMSPool HTTP ${response.status}: ${JSON.stringify(result)}`
    );
  }

  return result;
}

/* =========================================================
   PASSWORD RESET EMAIL
========================================================= */

async function sendPasswordResetEmail(to, code) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured"
    );
  }

  const from =
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER;

  if (!from) {
    throw new Error(
      "EMAIL_FROM is not configured"
    );
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject:
          "NumberHub Password Reset Code",
        text:
          `Your NumberHub password reset code is: ${code}\n\n` +
          `This code expires in 10 minutes.\n\n` +
          `If you did not request a password reset, you can ignore this email.`,
        html: `
          <p>Your NumberHub password reset code is:</p>
          <h2>${code}</h2>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not request a password reset, you can ignore this email.</p>
        `
      })
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Resend API error ${response.status}: ${errorText}`
    );
  }
}

/* =========================================================
   HTTP HELPERS
========================================================= */

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type":
      "application/json; charset=utf-8",
    "Access-Control-Allow-Origin":
      FRONTEND_ORIGIN,
    "Access-Control-Allow-Credentials":
      "true",
    "Cache-Control":
      "no-store"
  });

  res.end(JSON.stringify(data));
}

function getSessionToken(req) {
  const cookies =
    String(req.headers.cookie || "");

  const match = cookies.match(
    /(?:^|;\s*)session=([^;]+)/
  );

  return match ? match[1] : null;
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function createSessionToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

function createReference(prefix) {
  return (
    prefix +
    "-" +
    Date.now()
      .toString(36)
      .toUpperCase() +
    "-" +
    crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()
  );
}

function setSessionCookie(res, token) {
  const isProduction =
    process.env.NODE_ENV === "production";

  const parts = [
    `session=${token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=604800"
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  res.setHeader(
    "Set-Cookie",
    parts.join("; ")
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
  );
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(
          new Error("Request too large")
        );
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(
          JSON.parse(body || "{}")
        );
      } catch {
        reject(
          new Error("Invalid JSON")
        );
      }
    });

    req.on("error", reject);
  });
}

/* =========================================================
   AUTHENTICATION
========================================================= */

async function getAuthenticatedUser(req) {
  const sessionToken =
    getSessionToken(req);

  if (!sessionToken) {
    return null;
  }

  const tokenHash =
    hashToken(sessionToken);

  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.wallet,
        u.purchases,
        u.created_at
      FROM sessions s
      JOIN users u
        ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
    `,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/* =========================================================
   DATABASE
========================================================= */

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      wallet NUMERIC(12,2) DEFAULT 0,
      purchases INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS
      password_reset_tokens_user_id_idx
      ON password_reset_tokens(user_id);

    CREATE INDEX IF NOT EXISTS
      password_reset_tokens_expires_at_idx
      ON password_reset_tokens(expires_at);

    CREATE INDEX IF NOT EXISTS
      sessions_expires_at_idx
      ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      type TEXT NOT NULL
        CHECK (
          type IN (
            'deposit',
            'purchase',
            'refund'
          )
        ),
      amount NUMERIC(12,2) NOT NULL
        CHECK (amount > 0),
      method TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
          status IN (
            'pending',
            'successful',
            'failed',
            'cancelled'
          )
        ),
      reference TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS
      wallet_transactions_user_id_idx
      ON wallet_transactions(user_id);

    CREATE INDEX IF NOT EXISTS
      wallet_transactions_created_at_idx
      ON wallet_transactions(created_at);

    CREATE TABLE IF NOT EXISTS number_purchases (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      phone_number TEXT NOT NULL,
      country TEXT NOT NULL,
      service TEXT NOT NULL,
      provider TEXT,
      price NUMERIC(12,2) NOT NULL
        CHECK (price > 0),
      status TEXT NOT NULL DEFAULT 'active',
      sms_code TEXT,
      reference TEXT UNIQUE NOT NULL,
      smspool_order_id TEXT,
      provider_cost NUMERIC(12,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS
      number_purchases_user_id_idx
      ON number_purchases(user_id);

    CREATE INDEX IF NOT EXISTS
      number_purchases_created_at_idx
      ON number_purchases(created_at);

    CREATE INDEX IF NOT EXISTS
      number_purchases_smspool_order_idx
      ON number_purchases(smspool_order_id);
  `);

  /*
    Upgrade existing databases safely.
  */

  await pool.query(`
    ALTER TABLE number_purchases
    ADD COLUMN IF NOT EXISTS
    smspool_order_id TEXT
  `);

  await pool.query(`
    ALTER TABLE number_purchases
    ADD COLUMN IF NOT EXISTS
    provider_cost NUMERIC(12,2)
  `);

  console.log(
    "PostgreSQL database ready"
  );
}

/* =========================================================
   SERVER
========================================================= */

const server = http.createServer(
  async (req, res) => {
    try {

      /* ===================================================
         CORS
      =================================================== */

      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin":
            FRONTEND_ORIGIN,
          "Access-Control-Allow-Credentials":
            "true",
          "Access-Control-Allow-Methods":
            "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type"
        });

        res.end();
        return;
      }

      /* ===================================================
         STATUS
      =================================================== */

      if (
        req.method === "GET" &&
        req.url === "/api/status"
      ) {
        sendJSON(res, 200, {
          status: "online",
          service: "NumberHub",
          message:
            "Backend is working",
          smspool:
            Boolean(SMSPOOL_API_KEY)
        });

        return;
      }

      /* ===================================================
         REGISTER
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/register"
      ) {
        const data =
          await getBody(req);

        const name =
          String(
            data.name || ""
          ).trim();

        const email =
          String(
            data.email || ""
          )
            .trim()
            .toLowerCase();

        const password =
          String(
            data.password || ""
          );

        if (
          !name ||
          !email ||
          !password
        ) {
          sendJSON(res, 400, {
            error:
              "Name, email and password are required"
          });

          return;
        }

        if (password.length < 8) {
          sendJSON(res, 400, {
            error:
              "Password must be at least 8 characters"
          });

          return;
        }

        const passwordHash =
          await bcrypt.hash(
            password,
            12
          );

        const result =
          await pool.query(
            `
              INSERT INTO users
                (
                  name,
                  email,
                  password_hash
                )
              VALUES
                ($1, $2, $3)
              RETURNING
                id,
                name,
                email,
                wallet,
                purchases,
                created_at
            `,
            [
              name,
              email,
              passwordHash
            ]
          );

        sendJSON(res, 201, {
          message:
            "Account created successfully",
          user:
            result.rows[0]
        });

        return;
      }

      /* ===================================================
         LOGIN
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/login"
      ) {
        const data =
          await getBody(req);

        const email =
          String(
            data.email || ""
          )
            .trim()
            .toLowerCase();

        const password =
          String(
            data.password || ""
          );

        if (!email || !password) {
          sendJSON(res, 400, {
            error:
              "Email and password are required"
          });

          return;
        }

        const result =
          await pool.query(
            `
              SELECT
                id,
                name,
                email,
                password_hash,
                wallet,
                purchases,
                created_at
              FROM users
              WHERE email = $1
            `,
            [email]
          );

        if (
          result.rows.length === 0
        ) {
          sendJSON(res, 401, {
            error:
              "Invalid email or password"
          });

          return;
        }

        const user =
          result.rows[0];

        const passwordMatch =
          await bcrypt.compare(
            password,
            user.password_hash
          );

        if (!passwordMatch) {
          sendJSON(res, 401, {
            error:
              "Invalid email or password"
          });

          return;
        }

        const sessionToken =
          createSessionToken();

        const tokenHash =
          hashToken(
            sessionToken
          );

        const expiresAt =
          new Date(
            Date.now() +
            7 *
              24 *
              60 *
              60 *
              1000
          );

        await pool.query(
          `
            INSERT INTO sessions
              (
                token_hash,
                user_id,
                expires_at
              )
            VALUES
              ($1, $2, $3)
          `,
          [
            tokenHash,
            user.id,
            expiresAt
          ]
        );

        setSessionCookie(
          res,
          sessionToken
        );

        delete user.password_hash;

        sendJSON(res, 200, {
          message:
            "Login successful",
          user
        });

        return;
      }

      /* ===================================================
         LOGOUT
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/logout"
      ) {
        const sessionToken =
          getSessionToken(req);

        if (sessionToken) {
          await pool.query(
            `
              DELETE FROM sessions
              WHERE token_hash = $1
            `,
            [
              hashToken(
                sessionToken
              )
            ]
          );
        }

        clearSessionCookie(res);

        sendJSON(res, 200, {
          message:
            "Logged out successfully"
        });

        return;
      }

      /* ===================================================
         CURRENT USER
      =================================================== */

      if (
        req.method === "GET" &&
        req.url === "/api/me"
      ) {
        const user =
          await getAuthenticatedUser(
            req
          );

        if (!user) {
          sendJSON(res, 401, {
            error:
              "Not authenticated"
          });

          return;
        }

        sendJSON(res, 200, {
          authenticated: true,
          user
        });

        return;
      }

      /* ===================================================
         WALLET DEPOSIT
      =================================================== */

      if (
        req.method === "POST" &&
        req.url ===
          "/api/wallet/deposit"
      ) {
        const user =
          await getAuthenticatedUser(
            req
          );

        if (!user) {
          sendJSON(res, 401, {
            error:
              "Not authenticated"
          });

          return;
        }

        const data =
          await getBody(req);

        const amount =
          Number(data.amount);

        const method =
          String(
            data.method || ""
          ).trim();

        const allowedMethods = [
          "OPay",
          "Bank Transfer",
          "Kuda"
        ];

        if (
          !Number.isFinite(amount) ||
          amount < 100
        ) {
          sendJSON(res, 400, {
            error:
              "Minimum deposit amount is ₦100"
          });

          return;
        }

        if (
          !allowedMethods.includes(
            method
          )
        ) {
          sendJSON(res, 400, {
            error:
              "Invalid payment method"
          });

          return;
        }

        const reference =
          createReference("NH");

        const result =
          await pool.query(
            `
              INSERT INTO
                wallet_transactions
              (
                user_id,
                type,
                amount,
                method,
                status,
                reference,
                description
              )
              VALUES
              (
                $1,
                'deposit',
                $2,
                $3,
                'pending',
                $4,
                $5
              )
              RETURNING
                id,
                amount,
                method,
                status,
                reference,
                description,
                created_at
            `,
            [
              user.id,
              amount.toFixed(2),
              method,
              reference,
              "Wallet funding request awaiting payment confirmation"
            ]
          );

        sendJSON(res, 201, {
          message:
            "Deposit request created",
          transaction:
            result.rows[0]
        });

        return;
      }

      /* ===================================================
         WALLET TRANSACTIONS
      =================================================== */

      if (
        req.method === "GET" &&
        req.url ===
          "/api/wallet/transactions"
      ) {
        const user =
          await getAuthenticatedUser(
            req
          );

        if (!user) {
          sendJSON(res, 401, {
            error:
              "Not authenticated"
          });

          return;
        }

        const result =
          await pool.query(
            `
              SELECT
                id,
                type,
                amount,
                method,
                status,
                reference,
                description,
                created_at
              FROM wallet_transactions
              WHERE user_id = $1
              ORDER BY
                created_at DESC
              LIMIT 100
            `,
            [user.id]
          );

        sendJSON(res, 200, {
          transactions:
            result.rows
        });

        
