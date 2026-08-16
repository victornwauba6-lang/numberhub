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
    "Content-Type": "application/json"
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
    )
  `);

  console.log("PostgreSQL database ready");
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/status") {
      sendJSON(res, 200, {
        status: "online",
        service: "NumberHub",
        message: "Backend is working"
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

      sendJSON(res, 200, {
        message: "Login successful",
        user
      });

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
