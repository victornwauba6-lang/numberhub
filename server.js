const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const PORT = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:3000",
    "Access-Control-Allow-Credentials": "true"
  });
  res.end(JSON.stringify(data));
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

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
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx
      ON sessions(expires_at);


    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('deposit', 'purchase', 'refund')),
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      method TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'successful', 'failed', 'cancelled')),
      reference TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS wallet_transactions_user_id_idx
      ON wallet_transactions(user_id);

    CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx
      ON wallet_transactions(created_at);

    CREATE TABLE IF NOT EXISTS number_purchases (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone_number TEXT NOT NULL,
      country TEXT NOT NULL,
      service TEXT NOT NULL,
      provider TEXT,
      price NUMERIC(12,2) NOT NULL CHECK (price > 0),
      status TEXT NOT NULL DEFAULT 'active',
      sms_code TEXT,
      reference TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS number_purchases_user_id_idx
      ON number_purchases(user_id);

    CREATE INDEX IF NOT EXISTS number_purchases_created_at_idx
      ON number_purchases(created_at);
  `);

  console.log("PostgreSQL database ready");
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/api/status") {
      sendJSON(res, 200, {
        status: "online",
        service: "NumberHub",
        message: "Backend is working"
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/wallet/deposit") {
      const cookies = String(req.headers.cookie || "");
      const match = cookies.match(/(?:^|;\s*)session=([^;]+)/);

      if (!match) {
        sendJSON(res, 401, {
          error: "Not authenticated"
        });
        return;
      }

      const sessionToken = match[1];

      const tokenHash = crypto
        .createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      const sessionResult = await pool.query(
        `SELECT user_id
         FROM sessions
         WHERE token_hash = $1
           AND expires_at > NOW()`,
        [tokenHash]
      );

      if (sessionResult.rows.length === 0) {
        sendJSON(res, 401, {
          error: "Session expired or invalid"
        });
        return;
      }

      const userId = sessionResult.rows[0].user_id;
      const data = await getBody(req);

      const amount = Number(data.amount);
      const method = String(data.method || "").trim();

      const allowedMethods = ["OPay", "Bank Transfer", "Kuda"];

      if (!Number.isFinite(amount) || amount < 100) {
        sendJSON(res, 400, {
          error: "Minimum deposit amount is ₦100"
        });
        return;
      }

      if (!allowedMethods.includes(method)) {
        sendJSON(res, 400, {
          error: "Invalid payment method"
        });
        return;
      }

      const reference =
        "NH-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        crypto.randomBytes(4).toString("hex").toUpperCase();

      const result = await pool.query(
        `INSERT INTO wallet_transactions
          (user_id, type, amount, method, status, reference, description)
         VALUES ($1, 'deposit', $2, $3, 'pending', $4, $5)
         RETURNING id, amount, method, status, reference, description, created_at`,
        [
          userId,
          amount.toFixed(2),
          method,
          reference,
          "Wallet funding request awaiting payment confirmation"
        ]
      );

      sendJSON(res, 201, {
        message: "Deposit request created",
        transaction: result.rows[0]
      });

      return;
    }

    if (req.method === "GET" && req.url === "/api/wallet/transactions") {
      const cookies = String(req.headers.cookie || "");
      const match = cookies.match(/(?:^|;\\s*)session=([^;]+)/);

      if (!match) {
        sendJSON(res, 401, {
          error: "Not authenticated"
        });
        return;
      }

      const sessionToken = match[1];

      const tokenHash = crypto
        .createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      const sessionResult = await pool.query(
        `SELECT user_id
         FROM sessions
         WHERE token_hash = $1
           AND expires_at > NOW()`,
        [tokenHash]
      );

      if (sessionResult.rows.length === 0) {
        sendJSON(res, 401, {
          error: "Session expired or invalid"
        });
        return;
      }

      const userId = sessionResult.rows[0].user_id;

      const result = await pool.query(
        `SELECT id, type, amount, method, status, reference,
                description, created_at
         FROM wallet_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [userId]
      );

      sendJSON(res, 200, {
        transactions: result.rows
      });

      return;
    }

    if (req.method === "POST" && req.url === "/api/numbers/purchase") {
      const cookies = String(req.headers.cookie || "");
      const match = cookies.match(/(?:^|;\s*)session=([^;]+)/);

      if (!match) {
        sendJSON(res, 401, { error: "Not authenticated" });
        return;
      }

      const tokenHash = crypto.createHash("sha256")
        .update(match[1])
        .digest("hex");

      const sessionResult = await pool.query(
        `SELECT user_id
         FROM sessions
         WHERE token_hash = $1
           AND expires_at > NOW()`,
        [tokenHash]
      );

      if (sessionResult.rows.length === 0) {
        sendJSON(res, 401, { error: "Session expired or invalid" });
        return;
      }

      const userId = sessionResult.rows[0].user_id;
      const data = await getBody(req);

      const service = String(data.service || "").trim();
      const provider = String(data.provider || "").trim();
      const phoneNumber = String(data.phone_number || "").trim();
      const country = String(data.country || "").trim();
      const price = Number(data.price);

      if (!service || !provider || !phoneNumber || !country ||
          !Number.isFinite(price) || price <= 0) {
        sendJSON(res, 400, {
          error: "Invalid purchase details"
        });
        return;
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const userResult = await client.query(
          `SELECT wallet, purchases
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [userId]
        );

        if (userResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendJSON(res, 404, { error: "User not found" });
          return;
        }

        const wallet = Number(userResult.rows[0].wallet || 0);

        if (wallet < price) {
          await client.query("ROLLBACK");
          sendJSON(res, 400, {
            error: "Insufficient wallet balance"
          });
          return;
        }

        const reference =
          "NP-" +
          Date.now().toString(36).toUpperCase() +
          "-" +
          crypto.randomBytes(4).toString("hex").toUpperCase();

        const purchaseResult = await client.query(
          `INSERT INTO number_purchases
            (user_id, phone_number, country, service, provider,
             price, status, reference)
           VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
           RETURNING id, phone_number, country, service, provider,
                     price, status, reference, created_at`,
          [
            userId,
            phoneNumber,
            country,
            service,
            provider,
            price.toFixed(2),
            reference
          ]
        );

        await client.query(
          `UPDATE users
           SET wallet = wallet - $1,
               purchases = purchases + 1
           WHERE id = $2`,
          [price.toFixed(2), userId]
        );

        await client.query(
          `INSERT INTO wallet_transactions
            (user_id, type, amount, method, status, reference, description)
           VALUES ($1, 'purchase', $2, 'Wallet', 'successful', $3, $4)`,
          [
            userId,
            price.toFixed(2),
            reference,
            "Number purchase"
          ]
        );

        await client.query("COMMIT");

        sendJSON(res, 201, {
          message: "Number purchased successfully",
          purchase: purchaseResult.rows[0]
        });

        return;

      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    if (req.method === "GET" && req.url === "/api/numbers/history") {
      const cookies = String(req.headers.cookie || "");
      const match = cookies.match(/(?:^|;\s*)session=([^;]+)/);

      if (!match) {
        sendJSON(res, 401, { error: "Not authenticated" });
        return;
      }

      const tokenHash = crypto.createHash("sha256")
        .update(match[1])
        .digest("hex");

      const sessionResult = await pool.query(
        `SELECT user_id FROM sessions
         WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
      );

      if (sessionResult.rows.length === 0) {
        sendJSON(res, 401, { error: "Session expired or invalid" });
        return;
      }

      const result = await pool.query(
        `SELECT id, phone_number, country, service, provider,
                price, status, sms_code, reference, created_at
         FROM number_purchases
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [sessionResult.rows[0].user_id]
      );

      sendJSON(res, 200, { purchases: result.rows });
      return;
    }

    if (req.method === "GET" && req.url === "/api/me") {
      const cookies = String(req.headers.cookie || "");
      const match = cookies.match(/(?:^|;\\s*)session=([^;]+)/);

      if (!match) {
        sendJSON(res, 401, {
          error: "Not authenticated"
        });
        return;
      }

      const sessionToken = match[1];

      const tokenHash = crypto
        .createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      const result = await pool.query(
        `SELECT u.id, u.name, u.email, u.wallet, u.purchases, u.created_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1
           AND s.expires_at > NOW()`,
        [tokenHash]
      );

      if (result.rows.length === 0) {
        sendJSON(res, 401, {
          error: "Session expired or invalid"
        });
        return;
      }

      sendJSON(res, 200, {
        authenticated: true,
        user: result.rows[0]
      });

      return;
    }

    if (req.method === "POST" && req.url === "/api/register") {
      const data = await getBody(req);

      const name = String(data.name || "").trim();
      const email = String(data.email || "").trim().toLowerCase();
      const password = String(data.password || "");

      if (!name || !email || !password) {
        sendJSON(res, 400, {
          error: "Name, email and password are required"
        });
        return;
      }

      if (password.length < 8) {
        sendJSON(res, 400, {
          error: "Password must be at least 8 characters"
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await pool.query(
        `INSERT INTO users
          (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, wallet, purchases, created_at`,
        [name, email, passwordHash]
      );

      sendJSON(res, 201, {
        message: "Account created successfully",
        user: result.rows[0]
      });

      return;
    }

    if (req.method === "POST" && req.url === "/api/login") {
      const data = await getBody(req);

      const email = String(data.email || "").trim().toLowerCase();
      const password = String(data.password || "");

      if (!email || !password) {
        sendJSON(res, 400, {
          error: "Email and password are required"
        });
        return;
      }

      const result = await pool.query(
        `SELECT id, name, email, password_hash, wallet, purchases, created_at
         FROM users
         WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        sendJSON(res, 401, {
          error: "Invalid email or password"
        });
        return;
      }

      const user = result.rows[0];

      const passwordMatch = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!passwordMatch) {
        sendJSON(res, 401, {
          error: "Invalid email or password"
        });
        return;
      }

      delete user.password_hash;

      const sessionToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      try {
        await pool.query(
          `INSERT INTO sessions (token_hash, user_id, expires_at)
           VALUES ($1, $2, $3)`,
          [tokenHash, user.id, expiresAt]
        );
      } catch (sessionError) {
        console.error("LOGIN SESSION INSERT ERROR:", sessionError);
        throw sessionError;
      }

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Credentials": "true",
        "Set-Cookie": `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800`
      });

      res.end(JSON.stringify({
        message: "Login successful",
        user
      }));

      return;
    }

    if (
      req.method === "GET" &&
      (req.url === "/" || req.url === "/index.html")
    ) {
      const indexPath = path.join(__dirname, "index.html");

      if (!fs.existsSync(indexPath)) {
        sendJSON(res, 500, {
          error: "index.html not found"
        });
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8"
      });

      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    sendJSON(res, 404, {
      error: "Not found"
    });

  } catch (error) {
    console.error("Server error:", error);

    if (error.code === "23505") {
      sendJSON(res, 409, {
        error: "Email already registered"
      });
      return;
    }

    sendJSON(res, 500, {
      error: "Internal server error"
    });
  }
});

initDatabase()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`NumberHub backend running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
