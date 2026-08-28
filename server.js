const http = require("http");
const crypto = require("crypto");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

/* =========================================================
   CONFIGURATION
========================================================= */

const PORT = process.env.PORT || 3001;

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:3000";

const SMSPOOL_API_KEY =
  process.env.SMSPOOL_API_KEY;

if (!SMSPOOL_API_KEY) {
  console.warn(
    "WARNING: SMSPOOL_API_KEY is not configured."
  );
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL,

  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

/* =========================================================
   SMSPOOL API
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
    result =
      JSON.parse(text);
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

async function sendPasswordResetEmail(
  to,
  code
) {
  const apiKey =
    process.env.RESEND_API_KEY;

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

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json"
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
            <p>
              Your NumberHub password reset code is:
            </p>

            <h2>${code}</h2>

            <p>
              This code expires in 10 minutes.
            </p>

            <p>
              If you did not request a password reset,
              you can ignore this email.
            </p>
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

  res.end(
    JSON.stringify(data)
  );
}

function getSessionToken(req) {
  const cookies =
    String(
      req.headers.cookie || ""
    );

  const match =
    cookies.match(
      /(?:^|;\s*)session=([^;]+)/
    );

  return match
    ? match[1]
    : null;
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
    process.env.NODE_ENV ===
    "production";

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
  return new Promise(
    (resolve, reject) => {
      let body = "";

      req.on("data", chunk => {
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
      });

      req.on("end", () => {
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
      });

      req.on("error", reject);
    }
  );
}        });

        return;
      }

      /* ===================================================
         FORGOT PASSWORD
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/forgot-password"
      ) {
        const data = await getBody(req);

        const email = String(
          data.email || ""
        )
          .trim()
          .toLowerCase();

        if (!email) {
          sendJSON(res, 400, {
            error: "Email is required"
          });

          return;
        }

        const userResult = await pool.query(
          `
            SELECT id, email
            FROM users
            WHERE email = $1
          `,
          [email]
        );

        if (userResult.rows.length === 0) {
          sendJSON(res, 200, {
            message:
              "If an account exists for that email, a verification code has been sent."
          });

          return;
        }

        const user = userResult.rows[0];

        await pool.query(
          `
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE user_id = $1
              AND used_at IS NULL
          `,
          [user.id]
        );

        const code = String(
          crypto.randomInt(100000, 1000000)
        );

        const codeHash =
          await bcrypt.hash(code, 12);

        const resetToken =
          crypto.randomBytes(32).toString("hex");

        const tokenHash =
          hashToken(resetToken);

        const expiresAt =
          new Date(
            Date.now() +
            10 * 60 * 1000
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
            user.email,
            code
          );
        } catch (emailError) {
          console.error(
            "PASSWORD RESET EMAIL ERROR:",
            emailError
          );

          await pool.query(
            `
              UPDATE password_reset_tokens
              SET used_at = NOW()
              WHERE token_hash = $1
            `,
            [tokenHash]
          );

          sendJSON(res, 500, {
            error:
              "Unable to send the verification code. Please try again later."
          });

          return;
        }

        sendJSON(res, 200, {
          message:
            "If an account exists for that email, a verification code has been sent.",
          resetToken
        });

        return;
      }

      /* ===================================================
         VERIFY RESET CODE
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/verify-reset-code"
      ) {
        const data = await getBody(req);

        const resetToken = String(
          data.resetToken || ""
        );

        const code = String(
          data.code || ""
        ).trim();

        if (!resetToken || !code) {
          sendJSON(res, 400, {
            error:
              "Reset token and verification code are required"
          });

          return;
        }

        const tokenHash =
          hashToken(resetToken);

        const result = await pool.query(
          `
            SELECT
              code_hash,
              expires_at,
              used_at
            FROM password_reset_tokens
            WHERE token_hash = $1
          `,
          [tokenHash]
        );

        if (
          result.rows.length === 0 ||
          result.rows[0].used_at ||
          new Date(
            result.rows[0].expires_at
          ).getTime() <= Date.now()
        ) {
          sendJSON(res, 400, {
            error:
              "Invalid or expired verification code"
          });

          return;
        }

        const codeMatch =
          await bcrypt.compare(
            code,
            result.rows[0].code_hash
          );

        if (!codeMatch) {
          sendJSON(res, 400, {
            error:
              "Invalid or expired verification code"
          });

          return;
        }

        sendJSON(res, 200, {
          message:
            "Code verified successfully",
          resetToken
        });

        return;
      }

      /* ===================================================
         RESET PASSWORD
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/reset-password"
      ) {
        const data = await getBody(req);

        const resetToken = String(
          data.resetToken || ""
        );

        const newPassword = String(
          data.newPassword || ""
        );

        if (
          !resetToken ||
          !newPassword
        ) {
          sendJSON(res, 400, {
            error:
              "Reset token and new password are required"
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

        const tokenHash =
          hashToken(resetToken);

        const result = await pool.query(
          `
            SELECT
              user_id,
              code_hash,
              expires_at,
              used_at
            FROM password_reset_tokens
            WHERE token_hash = $1
          `,
          [tokenHash]
        );

        if (
          result.rows.length === 0 ||
          result.rows[0].used_at ||
          new Date(
            result.rows[0].expires_at
          ).getTime() <= Date.now()
        ) {
          sendJSON(res, 400, {
            error:
              "Invalid or expired reset token"
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
            result.rows[0].user_id
          ]
        );

        await pool.query(
          `
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE token_hash = $1
          `,
          [tokenHash]
        );

        await pool.query(
          `
            DELETE FROM sessions
            WHERE user_id = $1
          `,
          [result.rows[0].user_id]
        );

        sendJSON(res, 200, {
          message:
            "Password reset successfully"
        });

        return;
      }

      /* ===================================================
         SMSPOOL NUMBER PURCHASE
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/numbers/purchase"
      ) {
        const user =
          await getAuthenticatedUser(req);

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

        const price = Number(
          data.price
        );

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

        if (!SMSPOOL_API_KEY) {
          sendJSON(res, 503, {
            error:
              "SMSPool provider is not configured"
          });

          return;
        }

        /* -------------------------------------------------
           CHECK CUSTOMER WALLET
        ------------------------------------------------- */

        if (
          Number(user.wallet || 0) < price
        ) {
          sendJSON(res, 400, {
            error:
              "Insufficient wallet balance"
          });

          return;
        }

        /* -------------------------------------------------
           REQUEST NUMBER FROM SMSPOOL
        ------------------------------------------------- */

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

        const success =
          String(
            smsPoolOrder?.success
          ) === "1";

        if (!success) {
          sendJSON(res, 400, {
            error:
              smsPoolOrder?.message ||
              smsPoolOrder?.error ||
              "SMSPool could not provide a number."
          });

          return;
        }

        const phoneNumber =
          String(
            smsPoolOrder?.phonenumber ||
            smsPoolOrder?.phone_number ||
            smsPoolOrder?.number ||
            ""
          ).trim();

        const orderId =
          String(
            smsPoolOrder?.orderid ||
            smsPoolOrder?.order_id ||
            smsPoolOrder?.id ||
            ""
          ).trim();

        const providerCost =
          Number(
            smsPoolOrder?.cost ||
            smsPoolOrder?.price ||
            0
          );

        if (!phoneNumber || !orderId) {
          console.error(
            "SMSPOOL INVALID PURCHASE RESPONSE:",
            smsPoolOrder
          );

          sendJSON(res, 502, {
            error:
              "The provider returned an incomplete number order."
          });

          return;
        }

        /* -------------------------------------------------
           SAVE PURCHASE + DEDUCT WALLET
        ------------------------------------------------- */

        const reference =
          createReference("NP");

        const client =
          await pool.connect();

        try {
          await client.query("BEGIN");

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
              lockedUser.rows[0].wallet ||
              0
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
                  provider_cost,
                  created_at
              `,
              [
                user.id,
                phoneNumber,
                country,
                service,
                provider || "SMSPool",
                price.toFixed(2),
                reference,
                orderId,
                Number.isFinite(
                  providerCost
                )
                  ? providerCost.toFixed(2)
                  : null
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
            IMPORTANT:
            If the database fails after SMSPool
            already supplied the number, the provider
            order may remain active. The next section
            of the server handles cancellation.
          */

          try {
            await smsPoolRequest(
              "/sms/cancel",
              {
                orderid: orderId
              }
            );
          } catch (
            cancelError
          ) {
            console.error(
              "SMSPOOL ROLLBACK CANCEL ERROR:",
              cancelError
            );
          }

          throw error;

        } finally {
          client.release();
        }
}/* ===================================================
         LOGIN
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/login"
      ) {
        const data = await getBody(req);

        const email = String(
          data.email || ""
        )
          .trim()
          .toLowerCase();

        const password = String(
          data.password || ""
        );

        if (!email || !password) {
          sendJSON(res, 400, {
            error:
              "Email and password are required"
          });
          return;
        }

        const result = await pool.query(
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

        if (result.rows.length === 0) {
          sendJSON(res, 401, {
            error:
              "Invalid email or password"
          });
          return;
        }

        const user = result.rows[0];

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
          hashToken(sessionToken);

        const expiresAt = new Date(
          Date.now() +
            7 * 24 * 60 * 60 * 1000
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
      }/* ===================================================
         WALLET DEPOSIT
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/wallet/deposit"
      ) {
        const user =
          await getAuthenticatedUser(req);

        if (!user) {
          sendJSON(res, 401, {
            error: "Not authenticated"
          });
          return;
        }

        const data = await getBody(req);

        const amount =
          Number(data.amount);

        const method =
          String(data.method || "").trim();

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
      }

      /* ===================================================
         WALLET TRANSACTIONS
      =================================================== */

      if (
        req.method === "GET" &&
        req.url === "/api/wallet/transactions"
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
}/* ===================================================
         SMSPOOL PURCHASE
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/numbers/purchase"
      ) {
        const user =
          await getAuthenticatedUser(req);

        if (!user) {
          sendJSON(res, 401, {
            error: "Not authenticated"
          });
          return;
        }

        const data = await getBody(req);

        const country =
          String(data.country || "").trim();

        const service =
          String(data.service || "").trim();

        const provider =
          String(data.provider || "").trim();

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

        if (!SMSPOOL_API_KEY) {
          sendJSON(res, 503, {
            error:
              "Number provider is not configured yet."
          });
          return;
        }

        /*
          Request a real number from SMSPool.
        */

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

        /*
          SMSPool must return a successful
          order before we charge the customer.
        */

        if (
          !smsPoolOrder ||
          String(
            smsPoolOrder.success
          ) !== "1"
        ) {
          sendJSON(res, 400, {
            error:
              smsPoolOrder?.message ||
              "SMSPool could not provide a number."
          });

          return;
        }

        const phoneNumber =
          String(
            smsPoolOrder.phonenumber ||
            smsPoolOrder.phone_number ||
            ""
          ).trim();

        const orderId =
          String(
            smsPoolOrder.order_id ||
            smsPoolOrder.orderid ||
            smsPoolOrder.id ||
            ""
          ).trim();

        const providerCost =
          Number(
            smsPoolOrder.cost ||
            smsPoolOrder.price ||
            0
          );

        if (
          !phoneNumber ||
          !orderId
        ) {
          console.error(
            "INVALID SMSPOOL RESPONSE:",
            smsPoolOrder
          );

          sendJSON(res, 502, {
            error:
              "The provider returned an incomplete order."
          });

          return;
        }

        /*
          Lock the user's wallet before
          completing the NumberHub purchase.
        */

        const client =
          await pool.connect();

        try {
          await client.query("BEGIN");

          const userResult =
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
            userResult.rows.length === 0
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
              userResult.rows[0].wallet || 0
            );

          if (wallet < price) {
            await client.query(
              "ROLLBACK"
            );

            /*
              Customer cannot afford the number.
              Try to cancel the provider order
              so the provider number is not wasted.
            */

            try {
              await smsPoolRequest(
                "/sms/cancel",
                {
                  orderid: orderId
                }
              );
            } catch (cancelError) {
              console.error(
                "SMSPOOL AUTO-CANCEL ERROR:",
                cancelError
              );
            }

            sendJSON(res, 400, {
              error:
                "Insufficient wallet balance"
            });

            return;
          }

          const reference =
            createReference("NP");

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
                  sms_code,
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
                  NULL,
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
                  sms_code,
                  reference,
                  smspool_order_id,
                  provider_cost,
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
                orderId,
                Number.isFinite(
                  providerCost
                )
                  ? providerCost.toFixed(2)
                  : null
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
              "Number purchase through SMSPool"
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

          /*
            If our database transaction fails
            after SMSPool supplied a number,
            attempt to cancel the provider order.
          */

          try {
            await smsPoolRequest(
              "/sms/cancel",
              {
                orderid: orderId
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
          }/* ===================================================
         NUMBER PURCHASE HISTORY
      =================================================== */

      if (
        req.method === "GET" &&
        req.url === "/api/numbers/history"
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
                provider_cost,
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
         GET SMSPOOL ORDER STATUS
      =================================================== */

      if (
        req.method === "GET" &&
        req.url.startsWith(
          "/api/numbers/status/"
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
            .split("/")
            .pop();

        if (!/^\d+$/.test(purchaseId)) {
          sendJSON(res, 400, {
            error:
              "Invalid purchase ID"
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
            error:
              "Purchase not found"
          });
          return;
        }

        const purchase =
          purchaseResult.rows[0];

        if (
          !purchase.smspool_order_id
        ) {
          sendJSON(res, 400, {
            error:
              "This purchase has no provider order ID."
          });
          return;
        }

        let statusResult;

        try {
          statusResult =
            await smsPoolRequest(
              "/sms/check",
              {
                orderid:
                  purchase.smspool_order_id
              }
            );
        } catch (error) {
          console.error(
            "SMSPOOL STATUS ERROR:",
            error
          );

          sendJSON(res, 502, {
            error:
              "Unable to check SMS status right now."
          });

          return;
        }

        /*
          Save the SMS code if SMSPool
          has received one.
        */

        const smsCode =
          String(
            statusResult?.sms_code ||
            statusResult?.code ||
            statusResult?.sms ||
            ""
          ).trim();

        const providerStatus =
          String(
            statusResult?.status ||
            ""
          ).toLowerCase();

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
              smsCode,
              purchase.id,
              user.id
            ]
          );
        } else if (
          providerStatus === "cancelled" ||
          providerStatus === "canceled"
        ) {
          await pool.query(
            `
              UPDATE number_purchases
              SET status = 'cancelled'
              WHERE id = $1
                AND user_id = $2
            `,
            [
              purchase.id,
              user.id
            ]
          );
        }

        sendJSON(res, 200, {
          purchase: {
            ...purchase,
            sms_code:
              smsCode ||
              purchase.sms_code,
            provider_status:
              statusResult
          }
        });

        return;
      }

      /* ===================================================
         CANCEL NUMBER PURCHASE
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/numbers/cancel"
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

        const purchaseId =
          Number(data.purchaseId);

        if (
          !Number.isInteger(
            purchaseId
          ) ||
          purchaseId <= 0
        ) {
          sendJSON(res, 400, {
            error:
              "Invalid purchase ID"
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

        if (
          purchase.status !== "active"
        ) {
          sendJSON(res, 400, {
            error:
              "This number is no longer active."
          });
          return;
        }

        if (
          !purchase.smspool_order_id
        ) {
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
                  purchase.smspool_order_id
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
           }/* =================================================
           REFUND CUSTOMER AFTER SUCCESSFUL CANCELLATION
        ================================================= */

        const client =
          await pool.connect();

        try {
          await client.query("BEGIN");

          const lockedPurchase =
            await client.query(
              `
                SELECT
                  id,
                  user_id,
                  price,
                  status,
                  reference
                FROM number_purchases
                WHERE id = $1
                FOR UPDATE
              `,
              [purchase.id]
            );

          if (
            lockedPurchase.rows.length === 0
          ) {
            await client.query(
              "ROLLBACK"
            );

            sendJSON(res, 404, {
              error:
                "Purchase no longer exists"
            });

            return;
          }

          const locked =
            lockedPurchase.rows[0];

          if (
            locked.status !== "active"
          ) {
            await client.query(
              "ROLLBACK"
            );

            sendJSON(res, 400, {
              error:
                "This number has already been processed."
            });

            return;
          }

          await client.query(
            `
              UPDATE users
              SET wallet =
                wallet + $1
              WHERE id = $2
            `,
            [
              locked.price,
              user.id
            ]
          );

          await client.query(
            `
              UPDATE number_purchases
              SET status = 'cancelled'
              WHERE id = $1
            `,
            [locked.id]
          );

          const refundReference =
            createReference("RF");

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
                'Wallet',
                'successful',
                $3,
                $4
              )
            `,
            [
              user.id,
              locked.price,
              refundReference,
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
              Number(locked.price)
          });

          return;

        } catch (error) {
          await client.query(
            "ROLLBACK"
          );

          throw error;

        } finally {
          client.release();
        }
      }

      /* =================================================
         FORGOT PASSWORD
      ================================================= */

      if (
        req.method === "POST" &&
        req.url ===
          "/api/forgot-password"
      ) {
        const data =
          await getBody(req);

        const email =
          String(
            data.email || ""
          )
            .trim()
            .toLowerCase();

        if (!email) {
          sendJSON(res, 400, {
            error:
              "Email is required"
          });

          return;
        }

        const userResult =
          await pool.query(
            `
              SELECT
                id,
                email
              FROM users
              WHERE email = $1
            `,
            [email]
          );

        /*
          Do not reveal whether an email
          exists in the database.
        */

        if (
          userResult.rows.length === 0
        ) {
          sendJSON(res, 200, {
            message:
              "If an account exists for that email, a verification code has been sent."
          });

          return;
        }

        const resetUser =
          userResult.rows[0];

        await pool.query(
          `
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE user_id = $1
              AND used_at IS NULL
          `,
          [resetUser.id]
        );

        const code =
          String(
            crypto.randomInt(
              100000,
              1000000
            )
          );

        const codeHash =
          await bcrypt.hash(
            code,
            12
          );

        const resetToken =
          crypto
            .randomBytes(32)
            .toString("hex");

        const tokenHash =
          hashToken(resetToken);

        const expiresAt =
          new Date(
            Date.now() +
              10 * 60 * 1000
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
            resetUser.id,
            tokenHash,
            codeHash,
            expiresAt
          ]
        );

        try {
          await sendPasswordResetEmail(
            resetUser.email,
            code
          );
        } catch (emailError) {
          console.error(
            "PASSWORD RESET EMAIL ERROR:",
            emailError
          );

          await pool.query(
            `
              UPDATE password_reset_tokens
              SET used_at = NOW()
              WHERE token_hash = $1
            `,
            [tokenHash]
          );

          sendJSON(res, 500, {
            error:
              "Unable to send the verification code. Please try again later."
          });

          return;
        }

        sendJSON(res, 200, {
          message:
            "If an account exists for that email, a verification code has been sent.",
          resetToken
        });

        return;
      }/* ===================================================
         VERIFY PASSWORD RESET CODE
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/verify-reset-code"
      ) {
        const data =
          await getBody(req);

        const resetToken =
          String(
            data.resetToken || ""
          ).trim();

        const code =
          String(
            data.code || ""
          ).trim();

        if (
          !resetToken ||
          !code
        ) {
          sendJSON(res, 400, {
            error:
              "Reset token and verification code are required"
          });

          return;
        }

        const tokenHash =
          hashToken(resetToken);

        const result =
          await pool.query(
            `
              SELECT
                code_hash,
                expires_at,
                used_at
              FROM password_reset_tokens
              WHERE token_hash = $1
            `,
            [tokenHash]
          );

        if (
          result.rows.length === 0 ||
          result.rows[0].used_at ||
          new Date(
            result.rows[0].expires_at
          ).getTime() <= Date.now()
        ) {
          sendJSON(res, 400, {
            error:
              "Invalid or expired verification code"
          });

          return;
        }

        const codeMatch =
          await bcrypt.compare(
            code,
            result.rows[0].code_hash
          );

        if (!codeMatch) {
          sendJSON(res, 400, {
            error:
              "Invalid or expired verification code"
          });

          return;
        }

        sendJSON(res, 200, {
          message:
            "Code verified successfully",
          resetToken
        });

        return;
      }

      /* ===================================================
         RESET PASSWORD
      =================================================== */

      if (
        req.method === "POST" &&
        req.url === "/api/reset-password"
      ) {
        const data =
          await getBody(req);

        const resetToken =
          String(
            data.resetToken || ""
          ).trim();

        const newPassword =
          String(
            data.newPassword || ""
          );

        if (
          !resetToken ||
          !newPassword
        ) {
          sendJSON(res, 400, {
            error:
              "Reset token and new password are required"
          });

          return;
        }

        if (
          newPassword.length < 8
        ) {
          sendJSON(res, 400, {
            error:
              "Password must be at least 8 characters"
          });

          return;
        }

        const tokenHash =
          hashToken(resetToken);

        const result =
          await pool.query(
            `
              SELECT
                user_id,
                code_hash,
                expires_at,
                used_at
              FROM password_reset_tokens
              WHERE token_hash = $1
            `,
            [tokenHash]
          );

        if (
          result.rows.length === 0 ||
          result.rows[0].used_at ||
          new Date(
            result.rows[0].expires_at
          ).getTime() <= Date.now()
        ) {
          sendJSON(res, 400, {
            error:
              "Invalid or expired reset token"
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
            result.rows[0].user_id
          ]
        );

        await pool.query(
          `
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE token_hash = $1
          `,
          [tokenHash]
        );

        /*
          Invalidate existing login sessions
          after a successful password reset.
        */

        await pool.query(
          `
            DELETE FROM sessions
            WHERE user_id = $1
          `,
          [result.rows[0].user_id]
        );

        sendJSON(res, 200, {
          message:
            "Password reset successfully. Please log in again."
        });

        return;
      }

      /* ===================================================
         UNKNOWN API ROUTE
      =================================================== */

      if (
        req.url.startsWith("/api/")
      ) {
        sendJSON(res, 404, {
          error:
            "API endpoint not found"
        });

        return;
      }

      /* ===================================================
         STATIC FILES
      =================================================== */

      let filePath =
        req.url.split("?")[0];

      if (
        filePath === "/" ||
        filePath === ""
      ) {
        filePath = "/index.html";
      }

      /*
        Prevent path traversal.
      */

      const publicRoot =
        path.join(
          __dirname,
          "public"
        );

      const requestedPath =
        path.normalize(
          path.join(
            publicRoot,
            filePath
          )
        );

      if (
        !requestedPath.startsWith(
          publicRoot
        )
      ) {
        sendJSON(res, 403, {
          error: "Forbidden"
        });

        return;
      }

      fs.readFile(
        requestedPath,
        (error, content) => {
          if (error) {
            sendJSON(res, 404, {
              error:
                "File not found"
            });

            return;
          }

          const ext =
            path.extname(
              requestedPath
            ).toLowerCase();

          const contentTypes = {
            ".html":
              "text/html; charset=utf-8",
            ".css":
              "text/css; charset=utf-8",
            ".js":
              "application/javascript; charset=utf-8",
            ".json":
              "application/json; charset=utf-8",
            ".png":
              "image/png",
            ".jpg":
              "image/jpeg",
            ".jpeg":
              "image/jpeg",
            ".svg":
              "image/svg+xml",
            ".webp":
              "image/webp",
            ".ico":
              "image/x-icon"
          };

          res.writeHead(200, {
            "Content-Type":
              contentTypes[ext] ||
              "application/octet-stream"
          });

          res.end(content);
        }
      );

      return;

    } catch (error) {
      console.error(
        "SERVER ERROR:",
        error
      );

      if (!res.headersSent) {
        sendJSON(res, 500, {
          error:
            "Internal server error"
        });
      }
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

        console.log(
          `SMSPool configured: ${Boolean(
            SMSPOOL_API_KEY
          )}`
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
