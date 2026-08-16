const http = require("http");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      wallet NUMERIC(12,2) DEFAULT 0,
      purchases INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log("PostgreSQL database ready");
}

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/api/status") {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: "online",
      service: "NumberHub",
      message: "Backend is working"
    }));
    return;
  }

  if (req.method === "POST" && req.url === "/api/register") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const name = String(data.name || "").trim();
        const email = String(data.email || "").trim().toLowerCase();

        if (!name || !email) {
          res.writeHead(400);
          res.end(JSON.stringify({
            error: "Name and email are required"
          }));
          return;
        }

        const result = await pool.query(
          `INSERT INTO users (name, email)
           VALUES ($1, $2)
           RETURNING id, name, email, wallet, purchases, created_at`,
          [name, email]
        );

        res.writeHead(201);
        res.end(JSON.stringify({
          message: "Account created successfully",
          user: result.rows[0]
        }));

      } catch (error) {
        if (error.code === "23505") {
          res.writeHead(409);
          res.end(JSON.stringify({
            error: "Email already registered"
          }));
          return;
        }

        console.error(error);
        res.writeHead(500);
        res.end(JSON.stringify({
          error: "Could not create account"
        }));
      }
    });

    return;
  }

  if (
    req.method === "GET" &&
    (req.url === "/" || req.url === "/index.html")
  ) {
    res.writeHead(200, {
      "Content-Type": "text/html"
    });

    fs.createReadStream(
      path.join(__dirname, "index.html")
    ).pipe(res);

    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({
    error: "Not found"
  }));
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
