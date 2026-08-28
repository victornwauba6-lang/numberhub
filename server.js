const http = require("http");
const crypto = require("crypto");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

/* =========================================================
   NUMBERHUB CONFIGURATION
========================================================= */

const PORT = process.env.PORT || 3001;

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:3000";

const SMSPOOL_API_KEY =
  process.env.SMSPOOL_API_KEY || "";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

if (SMSPOOL_API_KEY) {
  console.log("SMSPool API key detected");
} else {
  console.warn(
    "WARNING: SMSPOOL_API_KEY is not configured"
  );
}

/* =========================================================
   SMSPOOL API HELPER
========================================================= */

async function smsPoolRequest(
  endpoint,
  data = {}
) {
  if (!SMSPOOL_API_KEY) {
    throw new Error(
      "SMSPOOL_API_KEY is not configured"
    );
  }

  const form =
    new URLSearchParams();

  form.append(
    "key",
    SMSPOOL_API_KEY
  );

  for (
    const [key, value]
    of Object.entries(data)
  ) {
    if (
      value !== undefined &&
      value !== null
    ) {
      form.append(
        key,
        String(value)
      );
    }
  }

  const response =
    await fetch(
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

  const text =
    await response.text();

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
   BASIC HELPERS
========================================================= */

function sendJSON(
  res,
  status,
  data
) {
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

  res.end(
    JSON.stringify(data)
  );
}

function getBody(req) {
  return new Promise(
    (resolve, reject) => {
      let body = "";

      req.on(
        "data",
        chunk => {
          body += chunk;

          if (
            body.length >
            1024 * 1024
          ) {
            reject(
              new Error(
                "Request too large"
              )
            );

            req.destroy();
          }
        }
      );

      req.on(
        "end",
        () => {
          try {
            resolve(
              JSON.parse(
                body || "{}"
              )
            );
          } catch {
            reject(
              new Error(
                "Invalid JSON"
              )
            );
          }
        }
      );

      req.on(
        "error",
        reject
      );
    }
  );
}

function createReference(
  prefix
) {
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

function hashToken(
  token
) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function createSessionToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
     }/* =========================================================
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
     }/* =========================================================
   SESSION / AUTH HELPERS
========================================================= */

function getSessionToken(req) {
  const cookies =
    String(req.headers.cookie || "");

  const match = cookies.match(
    /(?:^|;\s*)session=([^;]+)/
  );

  return match ? match[1] : null;
}

function setSessionCookie(res, token) {
  const isProduction =
    process.env.NODE_ENV === "production";

  const cookieParts = [
    `session=${token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=604800"
  ];

  if (isProduction) {
    cookieParts.push("Secure");
  }

  res.setHeader(
    "Set-Cookie",
    cookieParts.join("; ")
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
  );
}

/* =========================================================
   AUTHENTICATED USER
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
   PASSWORD RESET CODE
========================================================= */

function createResetCode() {
  return String(
    crypto.randomInt(
      100000,
      1000000
    )
  );
   }/* =========================================================
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
   DATABASE INITIALIZATION
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

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      method TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reference TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS number_purchases (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      phone_number TEXT NOT NULL,
      country TEXT NOT NULL,
      service TEXT NOT NULL,
      provider TEXT,
      price NUMERIC(12,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      sms_code TEXT,
      reference TEXT UNIQUE NOT NULL,
      smspool_order_id TEXT,
      provider_cost NUMERIC(12,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

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
     }/* =========================================================
   CREATE TABLE INDEXES
========================================================= */

async function createDatabaseIndexes() {
  await pool.query(`
    CREATE INDEX IF NOT EXISTS
      sessions_expires_at_idx
    ON sessions(expires_at);

    CREATE INDEX IF NOT EXISTS
      password_reset_tokens_user_id_idx
    ON password_reset_tokens(user_id);

    CREATE INDEX IF NOT EXISTS
      password_reset_tokens_expires_at_idx
    ON password_reset_tokens(expires_at);

    CREATE INDEX IF NOT EXISTS
      wallet_transactions_user_id_idx
    ON wallet_transactions(user_id);

    CREATE INDEX IF NOT EXISTS
      wallet_transactions_created_at_idx
    ON wallet_transactions(created_at);

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

  console.log(
    "Database indexes ready"
  );
}

/* =========================================================
   NUMBER PURCHASE HELPERS
========================================================= */

function normalizeProviderResponse(result) {
  if (!result) {
    return {
      success: false,
      message:
        "Empty response from SMSPool"
    };
  }

  return result;
}

function getSMSPoolOrderId(result) {
  return (
    result.orderid ||
    result.order_id ||
    result.id ||
    null
  );
}

function getSMSPoolPhoneNumber(result) {
  return (
    result.phonenumber ||
    result.phone_number ||
    result.number ||
    null
  );
}

function getSMSPoolCost(result) {
  const value =
    result.cost ??
    result.price ??
    null;

  if (value === null) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

/* =========================================================
   DATABASE STARTUP
========================================================= */

async function startDatabase() {
  await initDatabase();
  await createDatabaseIndexes();
}/* =========================================================
   SERVER
========================================================= */

const server = http.createServer(
  async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/") {
        const fs = require("fs");
        const path = require("path");

        const filePath = path.join(__dirname, "index.html");

        if (fs.existsSync(filePath)) {
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8"
          });

          res.end(fs.readFileSync(filePath));
          return;
        }
      }
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
         HEALTH / STATUS
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

        if (
          !email ||
          !password
        ) {
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
   }/* ===================================================
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
      [hashToken(sessionToken)]
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
    await getAuthenticatedUser(req);

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
   WALLET DEPOSIT REQUEST
=================================================== */

if (
  req.method === "POST" &&
  req.url === "/api/wallet/deposit"
) {
  const user =
    await getAuthenticatedUser(req);

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
    !allowedMethods.includes(method)
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
        INSERT INTO wallet_transactions
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
    }/* ===================================================
   WALLET TRANSACTION HISTORY
=================================================== */

if (
  req.method === "GET" &&
  req.url === "/api/wallet/transactions"
) {
  const user =
    await getAuthenticatedUser(req);

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
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [user.id]
    );

  sendJSON(res, 200, {
    transactions:
      result.rows
  });

  return;
}

/* ===================================================
   NUMBER PURCHASE
=================================================== */

if (
  req.method === "POST" &&
  req.url === "/api/numbers/purchase"
) {
  const user =
    await getAuthenticatedUser(req);

  if (!user) {
    sendJSON(res, 401, {
      error:
        "Not authenticated"
    });

    return;
  }

  const data =
    await getBody(req);

  const country =
    String(
      data.country || ""
    ).trim();

  const service =
    String(
      data.service || ""
    ).trim();

  const provider =
    String(
      data.provider || ""
    ).trim();

  const price =
    Number(data.price);

  if (
    !country ||
    !service ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    sendJSON(res, 400, {
      error:
        "Invalid purchase details"
    });

    return;
  }

if (Number(user.wallet) < price) {
  sendJSON(res, 400, {
    error:
      "Insufficient wallet balance"
  });

  return;
}

if (!SMSPOOL_API_KEY) {
  sendJSON(res, 503, {
    error:
      "Number provider is not configured"
  });

  return;
}

  let smsPoolOrder;

  try {
    smsPoolOrder =
      await smsPoolRequest(
        "/purchase/sms",
        {
          country,
          service
        }
      );
  } catch (error) {
    console.error(
      "SMSPOOL PURCHASE ERROR:",
      error
    );

    sendJSON(res, 502, {
      error:
        "Unable to contact the number provider. Please try again."
    });

    return;
  }

  const providerResponse =
    normalizeProviderResponse(
      smsPoolOrder
    );

  const success =
    String(
      providerResponse.success
    ) === "1";

  if (!success) {
    sendJSON(res, 400, {
      error:
        providerResponse.message ||
        providerResponse.msg ||
        "SMSPool could not provide a number."
    });

    return;
  }

  const orderId =
    getSMSPoolOrderId(
      providerResponse
    );

  const phoneNumber =
    getSMSPoolPhoneNumber(
      providerResponse
    );

  const providerCost =
    getSMSPoolCost(
      providerResponse
    );

  if (!orderId || !phoneNumber) {
    sendJSON(res, 502, {
      error:
        "SMSPool returned an incomplete purchase response."
    });

    return;
  }

  if (Number(user.wallet) < price) {
    sendJSON(res, 400, {
      error:
        "Insufficient wallet balance"
    });

    return;
  }

  const reference =
    createReference("NP");

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const lockedUser =
      await client.query(
        `
          SELECT
            wallet,
            purchases
          FROM users
          WHERE id = $1
          FOR UPDATE
        `,
        [user.id]
      );

    if (
      lockedUser.rows.length === 0
    ) {
      await client.query(
        "ROLLBACK"
      );

      sendJSON(res, 404, {
        error:
          "User not found"
      });

      return;
    }

    const wallet =
      Number(
        lockedUser.rows[0].wallet || 0
      );

    if (wallet < price) {
      await client.query(
        "ROLLBACK"
      );

      sendJSON(res, 400, {
        error:
          "Insufficient wallet balance"
      });

      return;
    }

    const purchaseResult =
      await client.query(
        `
          INSERT INTO number_purchases
          (
            user_id,
            phone_number,
            country,
            service,
            provider,
            price,
            status,
            reference,
            smspool_order_id,
            provider_cost
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            'active',
            $7,
            $8,
            $9
          )
          RETURNING
            id,
            phone_number,
            country,
            service,
            provider,
            price,
            status,
            reference,
            smspool_order_id,
            created_at
        `,
        [
          user.id,
          phoneNumber,
          country,
          service,
          provider,
          price.toFixed(2),
          reference,
          String(orderId),
          providerCost
        ]
      );

    await client.query(
      `
        UPDATE users
        SET
          wallet = wallet - $1,
          purchases = purchases + 1
        WHERE id = $2
      `,
      [
        price.toFixed(2),
        user.id
      ]
    );

    await client.query(
      `
        INSERT INTO wallet_transactions
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
          'purchase',
          $2,
          'Wallet',
          'successful',
          $3,
          $4
        )
      `,
      [
        user.id,
        price.toFixed(2),
        reference,
        "Number purchase"
      ]
    );

    await client.query(
      "COMMIT"
    );

    sendJSON(res, 201, {
      message:
        "Number purchased successfully",
      purchase:
        purchaseResult.rows[0]
    });

    return;

  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    console.error(
      "PURCHASE DATABASE ERROR:",
      error
    );

    /*
      The provider order was already created.
      We deliberately do not pretend the customer
      was successfully charged if our database failed.
    */

    sendJSON(res, 500, {
      error:
        "Purchase could not be completed. Please contact support."
    });

    return;

  } finally {
    client.release();
  }
       }      if (
        req.method === "GET" &&
        req.url === "/api/wallet/transactions"
      ) {
        const user = await getAuthenticatedUser(req);

        if (!user) {
          sendJSON(res, 401, {
            error: "Not authenticated"
          });
          return;
        }

        const result = await pool.query(
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
            ORDER BY created_at DESC
            LIMIT 100
          `,
          [user.id]
        );

        sendJSON(res, 200, {
          transactions: result.rows
        });

        return;
      }

      /* ===================================================
         BUY NUMBER
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/numbers/purchase"
      ) {
        const user = await getAuthenticatedUser(req);

        if (!user) {
          sendJSON(res, 401, {
            error: "Not authenticated"
          });
          return;
        }

        const data = await getBody(req);

        const country = String(
          data.country || ""
        ).trim();

        const service = String(
          data.service || ""
        ).trim();

        const provider = String(
          data.provider || ""
        ).trim();

        const price = Number(data.price);

        if (
          !country ||
          !service ||
          !Number.isFinite(price) ||
          price <= 0
        ) {
          sendJSON(res, 400, {
            error: "Invalid purchase details"
          });
          return;
        }

        if (Number(user.wallet) < price) {
          sendJSON(res, 400, {
            error: "Insufficient wallet balance"
          });
          return;
        }

        let smsPoolOrder;

        try {
          smsPoolOrder = await smsPoolRequest(
            "/purchase/sms",
            {
              country,
              service
            }
          );
        } catch (error) {
          console.error(
            "SMSPOOL PURCHASE ERROR:",
            error
          );

          sendJSON(res, 502, {
            error:
              "Unable to contact the number provider. Please try again."
          });

          return;
        }

        if (
          !smsPoolOrder ||
          String(smsPoolOrder.success) !== "1"
        ) {
          sendJSON(res, 400, {
            error:
              smsPoolOrder?.message ||
              "SMSPool could not provide a number."
          });

          return;
        }

        const phoneNumber =
          smsPoolOrder.phonenumber ||
          smsPoolOrder.phone_number ||
          smsPoolOrder.number;

        const orderId =
          smsPoolOrder.orderid ||
          smsPoolOrder.order_id;

        const providerCost =
          Number(
            smsPoolOrder.cost ||
            smsPoolOrder.price ||
            0
          );

        if (!phoneNumber || !orderId) {
          console.error(
            "INVALID SMSPOOL RESPONSE:",
            smsPoolOrder
          );

          sendJSON(res, 502, {
            error:
              "Provider returned an incomplete order."
          });

          return;
        }

        const reference =
          createReference("NUM");

        const client = await pool.connect();

        try {
          await client.query("BEGIN");

          const walletResult =
            await client.query(
              `
                SELECT wallet
                FROM users
                WHERE id = $1
                FOR UPDATE
              `,
              [user.id]
            );

          if (
            walletResult.rows.length === 0
          ) {
            throw new Error(
              "User account not found"
            );
          }

          const wallet =
            Number(
              walletResult.rows[0].wallet
            );

          if (wallet < price) {
            await client.query("ROLLBACK");

            sendJSON(res, 400, {
              error:
                "Insufficient wallet balance"
            });

            return;
          }

          await client.query(
            `
              UPDATE users
              SET
                wallet = wallet - $1,
                purchases = purchases + 1
              WHERE id = $2
            `,
            [
              price,
              user.id
            ]
          );

          await client.query(
            `
              INSERT INTO number_purchases
              (
                user_id,
                phone_number,
                country,
                service,
                provider,
                price,
                status,
                reference,
                smspool_order_id,
                provider_cost
              )
              VALUES
              (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                'active',
                $7,
                $8,
                $9
              )
            `,
            [
              user.id,
              phoneNumber,
              country,
              service,
              provider || null,
              price,
              reference,
              String(orderId),
              Number.isFinite(providerCost)
                ? providerCost
                : null
            ]
          );

          await client.query(
            `
              INSERT INTO wallet_transactions
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
                'purchase',
                $2,
                'NumberHub',
                'successful',
                $3,
                $4
              )
            `,
            [
              user.id,
              price,
              reference,
              `Purchase of ${service} number`
            ]
          );

          await client.query("COMMIT");

          sendJSON(res, 201, {
            message:
              "Number purchased successfully",
            purchase: {
              phone_number: phoneNumber,
              country,
              service,
              provider,
              price,
              status: "active",
              reference,
              smspool_order_id:
                String(orderId)
            }
          });

          return;
        } catch (error) {
          await client.query("ROLLBACK");

          console.error(
            "PURCHASE DATABASE ERROR:",
            error
          );

          /*
            The SMSPool number has already been purchased.
            Try to cancel it if saving the purchase failed.
          */

          try {
            await smsPoolRequest(
              "/sms/cancel",
              {
                orderid: String(orderId)
              }
            );
          } catch (cancelError) {
            console.error(
              "SMSPOOL ROLLBACK CANCEL ERROR:",
              cancelError
            );
          }

          throw error;
        } finally {
          client.release();
        }
      }      /* ===================================================
         CHECK SMS CODE
      =================================================== */

      if (
        req.method === "GET" &&
        req.url.startsWith("/api/numbers/sms/")
      ) {
        const user =
          await getAuthenticatedUser(req);

        if (!user) {
          sendJSON(res, 401, {
            error: "Not authenticated"
          });
          return;
        }

        const purchaseId = Number(
          req.url.split("/").pop()
        );

        if (!Number.isInteger(purchaseId)) {
          sendJSON(res, 400, {
            error: "Invalid purchase ID"
          });
          return;
        }

        const purchaseResult =
          await pool.query(
            `
              SELECT
                id,
                user_id,
                phone_number,
                country,
                service,
                provider,
                price,
                status,
                sms_code,
                reference,
                smspool_order_id,
                created_at
              FROM number_purchases
              WHERE id = $1
                AND user_id = $2
            `,
            [
              purchaseId,
              user.id
            ]
          );

        if (
          purchaseResult.rows.length === 0
        ) {
          sendJSON(res, 404, {
            error: "Purchase not found"
          });
          return;
        }

        const purchase =
          purchaseResult.rows[0];

        const orderId =
          purchase.smspool_order_id;

        if (!orderId) {
          sendJSON(res, 400, {
            error:
              "Provider order ID is missing"
          });
          return;
        }

        /*
          If the SMS code has already been saved,
          return it immediately.
        */

        if (purchase.sms_code) {
          sendJSON(res, 200, {
            success: true,
            sms_code:
              purchase.sms_code,
            status:
              purchase.status
          });
          return;
        }

        let smsResult;

        try {
          smsResult =
            await smsPoolRequest(
              "/sms/check",
              {
                orderid:
                  String(orderId)
              }
            );
        } catch (error) {
          console.error(
            "SMSPOOL CHECK ERROR:",
            error
          );

          sendJSON(res, 502, {
            error:
              "Unable to check the SMS right now. Please try again."
          });
          return;
        }

        /*
          SMSPool may return the code using
          different field names.
        */

        const smsCode =
          smsResult?.sms ||
          smsResult?.code ||
          smsResult?.sms_code ||
          smsResult?.verification_code ||
          null;

        const providerStatus =
          smsResult?.status ||
          smsResult?.message ||
          null;

        /*
          If an SMS code was received,
          save it in our database.
        */

        if (smsCode) {
          await pool.query(
            `
              UPDATE number_purchases
              SET
                sms_code = $1,
                status = 'completed'
              WHERE id = $2
                AND user_id = $3
            `,
            [
              String(smsCode),
              purchaseId,
              user.id
            ]
          );

          sendJSON(res, 200, {
            success: true,
            sms_code:
              String(smsCode),
            status:
              "completed"
          });

          return;
        }

        /*
          No SMS yet.
        */

        sendJSON(res, 200, {
          success: true,
          sms_code: null,
          status:
            purchase.status,
          provider_status:
            providerStatus,
          message:
            "No SMS code received yet. Please try again."
        });

        return;
      }

      /* ===================================================
         MY NUMBER PURCHASES
      =================================================== */

      if (
        req.method === "GET" &&
        req.url === "/api/numbers/purchases"
      ) {
        const user =
          await getAuthenticatedUser(req);

        if (!user) {
          sendJSON(res, 401, {
            error: "Not authenticated"
          });
          return;
        }

        const result =
          await pool.query(
            `
              SELECT
                id,
                phone_number,
                country,
                service,
                provider,
                price,
                status,
                sms_code,
                reference,
                smspool_order_id,
                created_at
              FROM number_purchases
              WHERE user_id = $1
              ORDER BY created_at DESC
              LIMIT 100
            `,
            [user.id]
          );

        sendJSON(res, 200, {
          purchases:
            result.rows
        });

        return;
      }      /* ===================================================
         CANCEL NUMBER
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/numbers/cancel"
      ) {
        const user =
          await getAuthenticatedUser(req);

        if (!user) {
          sendJSON(res, 401, {
            error: "Not authenticated"
          });
          return;
        }

        const data =
          await getBody(req);

        const purchaseId =
          Number(data.purchase_id);

        if (!Number.isInteger(purchaseId)) {
          sendJSON(res, 400, {
            error: "Invalid purchase ID"
          });
          return;
        }

        const result =
          await pool.query(
            `
              SELECT
                id,
                user_id,
                price,
                status,
                smspool_order_id
              FROM number_purchases
              WHERE id = $1
                AND user_id = $2
            `,
            [purchaseId, user.id]
          );

        if (result.rows.length === 0) {
          sendJSON(res, 404, {
            error: "Purchase not found"
          });
          return;
        }

        const purchase =
          result.rows[0];

        if (purchase.status !== "active") {
          sendJSON(res, 400, {
            error:
              "This number is no longer active."
          });
          return;
        }

        if (!purchase.smspool_order_id) {
          sendJSON(res, 400, {
            error:
              "Provider order ID is missing."
          });
          return;
        }

        let cancelResult;

        try {
          cancelResult =
            await smsPoolRequest(
              "/sms/cancel",
              {
                orderid:
                  String(
                    purchase.smspool_order_id
                  )
              }
            );
        } catch (error) {
          console.error(
            "SMSPOOL CANCEL ERROR:",
            error
          );

          sendJSON(res, 502, {
            error:
              "Unable to cancel the number right now."
          });
          return;
        }

        if (
          !cancelResult ||
          String(cancelResult.success) !== "1"
        ) {
          sendJSON(res, 400, {
            error:
              cancelResult?.message ||
              "SMSPool could not cancel this number."
          });
          return;
        }        const client =
          await pool.connect();

        try {
          await client.query("BEGIN");

          const locked =
            await client.query(
              `
                SELECT
                  id,
                  price,
                  status
                FROM number_purchases
                WHERE id = $1
                  AND user_id = $2
                FOR UPDATE
              `,
              [purchaseId, user.id]
            );

          if (locked.rows.length === 0) {
            await client.query("ROLLBACK");

            sendJSON(res, 404, {
              error: "Purchase not found"
            });
            return;
          }

          if (
            locked.rows[0].status !== "active"
          ) {
            await client.query("ROLLBACK");

            sendJSON(res, 400, {
              error:
                "This purchase has already been cancelled."
            });
            return;
          }

          const refund =
            Number(
              locked.rows[0].price
            );

          await client.query(
            `
              UPDATE number_purchases
              SET status = 'cancelled'
              WHERE id = $1
            `,
            [purchaseId]
          );

          await client.query(
            `
              UPDATE users
              SET wallet = wallet + $1
              WHERE id = $2
            `,
            [refund, user.id]
          );

          const reference =
            createReference("REF");

          await client.query(
            `
              INSERT INTO wallet_transactions
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
                'refund',
                $2,
                'NumberHub',
                'successful',
                $3,
                'Refund for cancelled number'
              )
            `,
            [
              user.id,
              refund,
              reference
            ]
          );

          await client.query("COMMIT");

          sendJSON(res, 200, {
            success: true,
            message:
              "Number cancelled and wallet refunded.",
            refund
          });

          return;

        } catch (error) {
          await client.query("ROLLBACK");

          console.error(
            "CANCEL DATABASE ERROR:",
            error
          );

          throw error;

        } finally {
          client.release();
        }
      }      /* ===================================================
         FORGOT PASSWORD
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/forgot-password"
      ) {
        const data = await getBody(req);

        const email = String(
          data.email || ""
        ).trim().toLowerCase();

        if (!email) {
          sendJSON(res, 400, {
            error: "Email is required"
          });
          return;
        }

        const result =
          await pool.query(
            `
              SELECT id, email
              FROM users
              WHERE email = $1
            `,
            [email]
          );

        if (result.rows.length === 0) {
          sendJSON(res, 200, {
            message:
              "If an account exists, a reset code has been sent."
          });
          return;
        }

        const user = result.rows[0];

        const code = String(
          crypto.randomInt(
            100000,
            1000000
          )
        );

        const resetToken =
          crypto.randomBytes(32).toString("hex");

        const tokenHash =
          hashToken(resetToken);

        const codeHash =
          hashToken(code);

        const expiresAt =
          new Date(
            Date.now() +
            10 * 60 * 1000
          );

        await pool.query(
          `
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE user_id = $1
              AND used_at IS NULL
          `,
          [user.id]
        );

        await pool.query(
          `
            INSERT INTO password_reset_tokens
            (
              user_id,
              token_hash,
              code_hash,
              expires_at
            )
            VALUES
            ($1, $2, $3, $4)
          `,
          [
            user.id,
            tokenHash,
            codeHash,
            expiresAt
          ]
        );

        try {
          await sendPasswordResetEmail(
            email,
            code
          );
        } catch (error) {
          console.error(
            "PASSWORD RESET EMAIL ERROR:",
            error
          );

          sendJSON(res, 500, {
            error:
              "Unable to send password reset email."
          });

          return;
        }

        sendJSON(res, 200, {
          message:
            "If an account exists, a reset code has been sent."
        });

        return;
      }      /* ===================================================
         RESET PASSWORD
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/reset-password"
      ) {
        const data = await getBody(req);

        const email = String(
          data.email || ""
        ).trim().toLowerCase();

        const code = String(
          data.code || ""
        ).trim();

        const newPassword = String(
          data.password || ""
        );

        if (
          !email ||
          !code ||
          !newPassword
        ) {
          sendJSON(res, 400, {
            error:
              "Email, reset code and new password are required"
          });
          return;
        }

        if (newPassword.length < 8) {
          sendJSON(res, 400, {
            error:
              "Password must be at least 8 characters"
          });
          return;
        }

        const userResult =
          await pool.query(
            `
              SELECT id
              FROM users
              WHERE email = $1
            `,
            [email]
          );

        if (
          userResult.rows.length === 0
        ) {
          sendJSON(res, 400, {
            error:
              "Invalid reset code"
          });
          return;
        }

        const userId =
          userResult.rows[0].id;

        const tokenResult =
          await pool.query(
            `
              SELECT
                id,
                code_hash,
                expires_at
              FROM password_reset_tokens
              WHERE user_id = $1
                AND used_at IS NULL
                AND expires_at > NOW()
              ORDER BY id DESC
              LIMIT 1
            `,
            [userId]
          );

        if (
          tokenResult.rows.length === 0
        ) {
          sendJSON(res, 400, {
            error:
              "Reset code is invalid or expired"
          });
          return;
        }

        const reset =
          tokenResult.rows[0];

        if (
          hashToken(code) !==
          reset.code_hash
        ) {
          sendJSON(res, 400, {
            error:
              "Invalid reset code"
          });
          return;
        }

        const passwordHash =
          await bcrypt.hash(
            newPassword,
            12
          );

        await pool.query(
          `
            UPDATE users
            SET password_hash = $1
            WHERE id = $2
          `,
          [
            passwordHash,
            userId
          ]
        );

        await pool.query(
          `
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE id = $1
          `,
          [reset.id]
        );

        await pool.query(
          `
            DELETE FROM sessions
            WHERE user_id = $1
          `,
          [userId]
        );

        sendJSON(res, 200, {
          message:
            "Password reset successfully. Please log in with your new password."
        });

        return;
      }      /* ===================================================
         GET USER PURCHASES
      =================================================== */

      if (
        req.method === "GET" &&
        req.url === "/api/numbers/purchases"
      ) {
        const user =
          await getAuthenticatedUser(req);

        if (!user) {
          sendJSON(res, 401, {
            error: "Not authenticated"
          });
          return;
        }

        const result =
          await pool.query(
            `
              SELECT
                id,
                phone_number,
                country,
                service,
                provider,
                price,
                status,
                sms_code,
                reference,
                smspool_order_id,
                created_at
              FROM number_purchases
              WHERE user_id = $1
              ORDER BY created_at DESC
              LIMIT 100
            `,
            [user.id]
          );

        sendJSON(res, 200, {
          purchases: result.rows
        });

        return;
      }

      /* ===================================================
         GET SMS CODE
      =================================================== */

      if (
        req.method === "GET" &&
        req.url.startsWith(
          "/api/numbers/sms/"
        )
      ) {
        const user =
          await getAuthenticatedUser(req);

        if (!user) {
          sendJSON(res, 401, {
            error: "Not authenticated"
          });
          return;
        }

        const purchaseId =
          req.url
            .split("/api/numbers/sms/")[1]
            .split("?")[0];

        if (!purchaseId) {
          sendJSON(res, 400, {
            error: "Purchase ID is required"
          });
          return;
        }

        const result =
          await pool.query(
            `
              SELECT
                id,
                phone_number,
                service,
                status,
                sms_code,
                smspool_order_id
              FROM number_purchases
              WHERE id = $1
                AND user_id = $2
            `,
            [
              purchaseId,
              user.id
            ]
          );

        if (
          result.rows.length === 0
        ) {
          sendJSON(res, 404, {
            error:
              "Purchase not found"
          });
          return;
        }

        const purchase =
          result.rows[0];

        if (purchase.sms_code) {
          sendJSON(res, 200, {
            sms_code:
              purchase.sms_code,
            status:
              purchase.status
          });
          return;
        }

        const orderId =
          purchase.smspool_order_id;

        if (!orderId) {
          sendJSON(res, 400, {
            error:
              "Provider order ID is missing"
          });
          return;
        }

        let smsResult;

        try {
          smsResult =
            await smsPoolRequest(
              "/sms/check",
              {
                orderid:
                  String(orderId)
              }
            );
        } catch (error) {
          console.error(
            "SMSPOOL SMS CHECK ERROR:",
            error
          );

          sendJSON(res, 502, {
            error:
              "Unable to check SMS code right now."
          });
          return;
        }

        const smsCode =
          smsResult?.sms ||
          smsResult?.code ||
          smsResult?.sms_code ||
          null;

        if (smsCode) {
          await pool.query(
            `
              UPDATE number_purchases
              SET
                sms_code = $1,
                status = 'completed'
              WHERE id = $2
                AND user_id = $3
            `,
            [
              String(smsCode),
              purchase.id,
              user.id
            ]
          );

          sendJSON(res, 200, {
            sms_code:
              String(smsCode),
            status:
              "completed"
          });

          return;
        }

        sendJSON(res, 200, {
          sms_code: null,
          status:
            purchase.status,
          message:
            smsResult?.message ||
            "SMS code has not arrived yet."
        });

        return;
      }      /* ===================================================
         CANCEL NUMBER
      =================================================== */

      if (
        req.method === "POST" &&
        req.url.startsWith(
          "/api/numbers/cancel/"
        )
      ) {
        const user =
          await getAuthenticatedUser(req);

        if (!user) {
          sendJSON(res, 401, {
            error: "Not authenticated"
          });
          return;
        }

        const purchaseId =
          req.url
            .split("/api/numbers/cancel/")[1]
            .split("?")[0];

        if (!purchaseId) {
          sendJSON(res, 400, {
            error: "Purchase ID is required"
          });
          return;
        }

        const result =
          await pool.query(
            `
              SELECT
                id,
                user_id,
                price,
                status,
                smspool_order_id
              FROM number_purchases
              WHERE id = $1
                AND user_id = $2
            `,
            [
              purchaseId,
              user.id
            ]
          );

        if (result.rows.length === 0) {
          sendJSON(res, 404, {
            error: "Purchase not found"
          });
          return;
        }

        const purchase =
          result.rows[0];

        if (
          purchase.status !== "active"
        ) {
          sendJSON(res, 400, {
            error:
              "This number is no longer active."
          });
          return;
        }

        const orderId =
          purchase.smspool_order_id;

        if (!orderId) {
          sendJSON(res, 400, {
            error:
              "Provider order ID is missing."
          });
          return;
        }

        let cancelResult;

        try {
          cancelResult =
            await smsPoolRequest(
              "/sms/cancel",
              {
                orderid:
                  String(orderId)
              }
            );
        } catch (error) {
          console.error(
            "SMSPOOL CANCEL ERROR:",
            error
          );

          sendJSON(res, 502, {
            error:
              "Unable to cancel the provider order right now."
          });
          return;
        }

        if (
          String(
            cancelResult?.success
          ) !== "1"
        ) {
          sendJSON(res, 400, {
            error:
              cancelResult?.message ||
              "The provider could not cancel this order."
          });
          return;
        }

        const client =
          await pool.connect();

        try {
          await client.query(
            "BEGIN"
          );

          const locked =
            await client.query(
              `
                SELECT
                  price,
                  status
                FROM number_purchases
                WHERE id = $1
                  AND user_id = $2
                FOR UPDATE
              `,
              [
                purchaseId,
                user.id
              ]
            );

          if (
            locked.rows.length === 0 ||
            locked.rows[0].status !==
              "active"
          ) {
            await client.query(
              "ROLLBACK"
            );

            sendJSON(res, 400, {
              error:
                "This purchase is no longer active."
            });

            return;
          }

          const refundAmount =
            Number(
              locked.rows[0].price
            );

          await client.query(
            `
              UPDATE users
              SET wallet =
                wallet + $1
              WHERE id = $2
            `,
            [
              refundAmount,
              user.id
            ]
          );

          await client.query(
            `
              UPDATE number_purchases
              SET status = 'cancelled'
              WHERE id = $1
                AND user_id = $2
            `,
            [
              purchaseId,
              user.id
            ]
          );

          await client.query(
            `
              INSERT INTO wallet_transactions
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
                'refund',
                $2,
                'NumberHub',
                'successful',
                $3,
                $4
              )
            `,
            [
              user.id,
              refundAmount,
              createReference("REF"),
              "Refund for cancelled number purchase"
            ]
          );

          await client.query(
            "COMMIT"
          );

          sendJSON(res, 200, {
            message:
              "Number cancelled and wallet refunded successfully.",
            refund:
              refundAmount
          });

          return;

        } catch (error) {
          await client.query(
            "ROLLBACK"
          );

          console.error(
            "CANCEL DATABASE ERROR:",
            error
          );

          sendJSON(res, 500, {
            error:
              "Number was cancelled by the provider, but the refund could not be completed automatically. Please contact support."
          });

          return;

        } finally {
          client.release();
        }
      }

      /* ===================================================
         404
      =================================================== */

      sendJSON(res, 404, {
        error: "Endpoint not found"
      });

    } catch (error) {
      console.error(
        "SERVER ERROR:",
        error
      );

      sendJSON(res, 500, {
        error:
          "Internal server error"
      });
    }
  }
);

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {
  try {
    await initDatabase();

    server.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `NumberHub backend running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "FAILED TO START SERVER:",
      error
    );

    process.exit(1);
  }
}

startServer();
