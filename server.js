const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, "users.json");

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
}

function getUsers() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
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

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const { name, email } = data;

        if (!name || !email) {
          res.writeHead(400);
          res.end(JSON.stringify({
            error: "Name and email are required"
          }));
          return;
        }

        const users = getUsers();

        if (users.some(user => user.email === email)) {
          res.writeHead(409);
          res.end(JSON.stringify({
            error: "Email already registered"
          }));
          return;
        }

        const user = {
          id: Date.now(),
          name,
          email,
          wallet: 0,
          purchases: 0,
          createdAt: new Date().toISOString()
        };

        users.push(user);
        saveUsers(users);

        res.writeHead(201);
        res.end(JSON.stringify({
          message: "Account created successfully",
          user
        }));

      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({
          error: "Invalid request"
        }));
      }
    });

    return;
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, {"Content-Type": "text/html"});
    fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({
    error: "Not found"
  }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`NumberHub backend running on port ${PORT}`);
});
