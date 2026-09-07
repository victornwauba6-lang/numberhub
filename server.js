const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const FIVESIM_BASE_URL = "https://5sim.net/v1";

const NUMBERHUB_PRICES = {
  "United States": {
    whatsapp: 4500,
    facebook: 1700,
    tiktok: 2000,
    telegram: 3500
  },
  "United Kingdom": {
    whatsapp: 4000,
    facebook: 2000,
    tiktok: 1500,
    telegram: 4000
  },
  "Canada": {
    whatsapp: 4000,
    facebook: 1300,
    tiktok: 2000,
    telegram: 3000
  },
  "Philippines": {
    whatsapp: 3500,
    facebook: 1100,
    tiktok: 1200,
    telegram: 2500
  }
};




// Automatic pricing for countries without a manually configured price.
// Existing NUMBERHUB_PRICES always take priority.
const FIVESIM_USD_TO_NGN = 1500;
const NUMBERHUB_MIN_AUTO_PRICE = 1000;

function calculateNumberHubPrice(countryName, serviceName, supplierCost) {
  const countryPrices =
    NUMBERHUB_PRICES[String(countryName || "").trim()];
  const serviceKey =
    String(serviceName || "").trim().toLowerCase();

  // Fixed prices always take priority.
  if (
    countryPrices &&
    Object.prototype.hasOwnProperty.call(countryPrices, serviceKey)
  ) {
    return Number(countryPrices[serviceKey]);
  }

  const costUSD = Number(supplierCost);

  if (!Number.isFinite(costUSD) || costUSD <= 0) {
    return null;
  }

  const costNGN = costUSD * FIVESIM_USD_TO_NGN;

  let tierPrice;

  if (costNGN <= 300) {
    // Numbers costing ₦300 or less: minimum ₦1,000 gain.
    tierPrice = costNGN + 1000;
  } else if (costNGN <= 400) {
    tierPrice = 1400;
  } else if (costNGN <= 500) {
    tierPrice = 1600;
  } else if (costNGN <= 700) {
    tierPrice = 1900;
  } else if (costNGN <= 1000) {
    tierPrice = 2300;
  } else if (costNGN <= 1500) {
    tierPrice = 2800;
  } else if (costNGN <= 2000) {
    tierPrice = 3700;
  } else if (costNGN <= 2500) {
    tierPrice = 4500;
  } else if (costNGN <= 3000) {
    tierPrice = 5500;
  } else if (costNGN <= 4000) {
    tierPrice = 7000;
  } else if (costNGN <= 5000) {
    tierPrice = 8500;
  } else {
    // For very expensive numbers, keep a healthy margin.
    tierPrice = costNGN + 3500;
  }

  return Math.max(NUMBERHUB_MIN_AUTO_PRICE, tierPrice);
}

const FIVESIM_COUNTRY_MAP = {
  'Afghanistan': "afghanistan",
  'Albania': "albania",
  'Algeria': "algeria",
  'Angola': "angola",
  'Argentina': "argentina",
  'Armenia': "armenia",
  'Australia': "australia",
  'Austria': "austria",
  'Azerbaijan': "azerbaijan",
  'Bahamas': "bahamas",
  'Bahrain': "bahrain",
  'Bangladesh': "bangladesh",
  'Barbados': "barbados",
  'Belarus': "belarus",
  'Belgium': "belgium",
  'Belize': "belize",
  'Benin': "benin",
  'Bhutan': "bhutan",
  'Bolivia': "bolivia",
  'Bosnia and Herzegovina': "bosnia",
  'Botswana': "botswana",
  'Brazil': "brazil",
  'Brunei': "brunei",
  'Bulgaria': "bulgaria",
  'Burkina Faso': "burkina-faso",
  'Burundi': "burundi",
  'Cambodia': "cambodia",
  'Cameroon': "cameroon",
  'Canada': "canada",
  'Cape Verde': "cape-verde",
  'Central African Republic': "central-african-republic",
  'Chad': "chad",
  'Chile': "chile",
  'China': "china",
  'Colombia': "colombia",
  'Congo': "congo",
  'Costa Rica': "costa-rica",
  'Croatia': "croatia",
  'Cyprus': "cyprus",
  'Czech Republic': "czech-republic",
  'Denmark': "denmark",
  'Djibouti': "djibouti",
  'Dominican Republic': "dominican-republic",
  'Ecuador': "ecuador",
  'Egypt': "egypt",
  'El Salvador': "el-salvador",
  'Estonia': "estonia",
  'Ethiopia': "ethiopia",
  'Finland': "finland",
  'France': "france",
  'Georgia': "georgia",
  'Germany': "germany",
  'Ghana': "ghana",
  'Greece': "greece",
  'Guatemala': "guatemala",
  'Guinea': "guinea",
  'Haiti': "haiti",
  'Honduras': "honduras",
  'Hong Kong': "hong-kong",
  'Hungary': "hungary",
  'Iceland': "iceland",
  'India': "india",
  'Indonesia': "indonesia",
  'Iran': "iran",
  'Iraq': "iraq",
  'Ireland': "ireland",
  'Israel': "israel",
  'Italy': "italy",
  'Ivory Coast': "ivory-coast",
  'Jamaica': "jamaica",
  'Japan': "japan",
  'Jordan': "jordan",
  'Kazakhstan': "kazakhstan",
  'Kenya': "kenya",
  'Kuwait': "kuwait",
  'Kyrgyzstan': "kyrgyzstan",
  'Laos': "laos",
  'Latvia': "latvia",
  'Lebanon': "lebanon",
  'Lesotho': "lesotho",
  'Liberia': "liberia",
  'Libya': "libya",
  'Lithuania': "lithuania",
  'Luxembourg': "luxembourg",
  'Madagascar': "madagascar",
  'Malawi': "malawi",
  'Malaysia': "malaysia",
  'Maldives': "maldives",
  'Mali': "mali",
  'Malta': "malta",
  'Mauritania': "mauritania",
  'Mauritius': "mauritius",
  'Mexico': "mexico",
  'Moldova': "moldova",
  'Monaco': "monaco",
  'Mongolia': "mongolia",
  'Montenegro': "montenegro",
  'Morocco': "morocco",
  'Mozambique': "mozambique",
  'Myanmar': "myanmar",
  'Namibia': "namibia",
  'Nepal': "nepal",
  'Netherlands': "netherlands",
  'New Zealand': "new-zealand",
  'Nicaragua': "nicaragua",
  'Niger': "niger",
  'Nigeria': "nigeria",
  'North Macedonia': "north-macedonia",
  'Norway': "norway",
  'Oman': "oman",
  'Pakistan': "pakistan",
  'Panama': "panama",
  'Papua New Guinea': "papua-new-guinea",
  'Paraguay': "paraguay",
  'Peru': "peru",
  'Philippines': "philippines",
  'Poland': "poland",
  'Portugal': "portugal",
  'Puerto Rico': "puerto-rico",
  'Qatar': "qatar",
  'Romania': "romania",
  'Russia': "russia",
  'Rwanda': "rwanda",
  'Saudi Arabia': "saudi-arabia",
  'Senegal': "senegal",
  'Serbia': "serbia",
  'Seychelles': "seychelles",
  'Sierra Leone': "sierra-leone",
  'Singapore': "singapore",
  'Slovakia': "slovakia",
  'Slovenia': "slovenia",
  'South Africa': "south-africa",
  'South Korea': "south-korea",
  'Spain': "spain",
  'Sri Lanka': "sri-lanka",
  'Sudan': "sudan",
  'Suriname': "suriname",
  'Sweden': "sweden",
  'Switzerland': "switzerland",
  'Taiwan': "taiwan",
  'Tajikistan': "tajikistan",
  'Tanzania': "tanzania",
  'Thailand': "thailand",
  'Togo': "togo",
  'Trinidad and Tobago': "trinidad-and-tobago",
  'Tunisia': "tunisia",
  'Turkey': "turkey",
  'Turkmenistan': "turkmenistan",
  'Uganda': "uganda",
  'Ukraine': "ukraine",
  'United Arab Emirates': "united-arab-emirates",
  'United Kingdom': "england",
  'United States': "usa",
  'Uruguay': "uruguay",
  'Uzbekistan': "uzbekistan",
  'Venezuela': "venezuela",
  'Vietnam': "vietnam",
  'Yemen': "yemen",
  'Zambia': "zambia",
  'Zimbabwe': "zimbabwe"
};

function fiveSimCountryCode(country) {
  return FIVESIM_COUNTRY_MAP[country] || String(country).trim().toLowerCase();
}


async function fiveSimRequest(endpoint, options = {}) {
  const apiKey = process.env.FIVESIM_API_KEY;

  if (!apiKey) {
    throw new Error("FIVESIM_API_KEY is not configured");
  }

  const response = await fetch(FIVESIM_BASE_URL + endpoint, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `5SIM API ${response.status}: ${data.message || data.error || text}`
    );
  }

  return data;
}

async function fiveSimProfile() {
  return fiveSimRequest("/user/profile");
}

async function fiveSimBuyActivation(country, product, operator = "any") {
  const endpoint =
    `/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(product)}`;

  return fiveSimRequest(endpoint, {
    method: "GET"
  });
}

async function fiveSimGetPrices(country, product) {
  const endpoint =
    `/guest/prices?country=${encodeURIComponent(country)}&product=${encodeURIComponent(product)}`;

  return fiveSimRequest(endpoint, {
    method: "GET"
  });
}

function fiveSimCheapestAvailable(prices, country, product) {
  const countryData = prices?.[country]?.[product];

  if (!countryData || typeof countryData !== "object") {
    return null;
  }

  const available = Object.entries(countryData)
    .filter(([, item]) =>
      item &&
      Number(item.count) > 0 &&
      Number.isFinite(Number(item.cost))
    )
    .map(([operator, item]) => ({
      operator,
      cost: Number(item.cost),
      count: Number(item.count)
    }))
    .sort((a, b) => a.cost - b.cost);

  return available[0] || null;
}


const TEXTVERIFIED_BASE_URL = "https://backend.textverified.com";

let textVerifiedToken = null;
let textVerifiedTokenExpiresAt = 0;

async function textVerifiedGetToken() {
  const email = process.env.TEXTVERIFIED_EMAIL;
  const apiKey = process.env.TEXTVERIFIED_API_KEY;

  if (!email) {
    throw new Error("TEXTVERIFIED_EMAIL is not configured");
  }

  if (!apiKey) {
    throw new Error("TEXTVERIFIED_API_KEY is not configured");
  }

  if (textVerifiedToken && Date.now() < textVerifiedTokenExpiresAt) {
    return textVerifiedToken;
  }

  const response = await fetch(
    `${TEXTVERIFIED_BASE_URL}/api/pub/v2/auth`,
    {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "X-API-USERNAME": email,
        "X-API-KEY": apiKey
      }
    }
  );

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `TextVerified auth ${response.status}: ${
        data.message || data.error || text
      }`
    );
  }

  const token =
    data.token ||
    data.accessToken ||
    data.access_token;

  if (!token) {
    throw new Error("TextVerified authentication succeeded but no token was returned");
  }

  textVerifiedToken = token;

  // Refresh early so we don't reuse an expired token.
  const expiresInSeconds =
    Number(data.expiresIn || data.expires_in || 300);

  textVerifiedTokenExpiresAt =
    Date.now() + Math.max(30, expiresInSeconds - 30) * 1000;

  return textVerifiedToken;
}

async function textVerifiedRequest(endpoint, options = {}) {
  const token = await textVerifiedGetToken();

  const response = await fetch(
    TEXTVERIFIED_BASE_URL + endpoint,
    {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }
  );

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `TextVerified API ${response.status}: ${
        data.message || data.error || text
      }`
    );
  }

  return data;
}

async function textVerifiedGetServices() {
  return textVerifiedRequest(
    "/api/pub/v2/services?numberType=mobile&reservationType=verification",
    {
      method: "GET"
    }
  );
}


async function runTextVerifiedInventoryTest(req, res, origin) {
  const admin = await getAdminUserId(req);
  if (admin.error) {
    return sendJSON(res, admin.status, { error: admin.error }, origin);
  }

  try {
    const services = await textVerifiedGetServices();

    const whatsapp = services.filter((item) =>
      String(item.serviceName || "").toLowerCase().includes("whatsapp") ||
      String(item.description || "").toLowerCase().includes("whatsapp")
    );

    const result = {
      success: true,
      provider: "TextVerified",
      numberType: "mobile",
      reservationType: "verification",
      whatsappServices: whatsapp,
      totalServices: Array.isArray(services) ? services.length : 0
    };

    return sendJSON(res, 200, result, origin);
  } catch (error) {
    console.error("TextVerified inventory test failed:", error);
    return sendJSON(res, 502, {
      success: false,
      provider: "TextVerified",
      error: error.message
    }, origin);
  }
}


async function textVerifiedCheckUSWhatsApp() {
  const inventory = await textVerifiedRequest(
    "/api/pub/v2/inventory/verifications",
    {
      method: "POST",
      body: JSON.stringify({
        numberType: "mobile",
        serviceName: "whatsapp",
        capability: "Sms"
      })
    }
  );

  const pricing = await textVerifiedRequest(
    "/api/pub/v2/pricing/verifications",
    {
      method: "POST",
      body: JSON.stringify({
        areaCode: false,
        carrier: false,
        numberType: "mobile",
        serviceName: "whatsapp",
        capability: "Sms"
      })
    }
  );

  return {
    success: true,
    provider: "TextVerified",
    country: "US",
    service: "whatsapp",
    numberType: "mobile",
    reservationType: "verification",
    inventory,
    pricing
  };
}

async function textVerifiedCheckUSService(serviceName) {
  const normalizedService = String(serviceName || "").trim().toLowerCase();

  if (!normalizedService) {
    throw new Error("TextVerified service name is required");
  }

  const inventory = await textVerifiedRequest(
    "/api/pub/v2/inventory/verifications",
    {
      method: "POST",
      body: JSON.stringify({
        numberType: "mobile",
        serviceName: normalizedService,
        capability: "Sms"
      })
    }
  );

  const pricing = await textVerifiedRequest(
    "/api/pub/v2/pricing/verifications",
    {
      method: "POST",
      body: JSON.stringify({
        areaCode: false,
        carrier: false,
        numberType: "mobile",
        serviceName: normalizedService,
        capability: "Sms"
      })
    }
  );

  return {
    serviceName: normalizedService,
    numberType: "mobile",
    reservationType: "verification",
    inventory,
    pricing
  };
}

function textVerifiedExtractPrice(pricing) {
  const candidates = [
    pricing?.price,
    pricing?.unitPrice,
    pricing?.cost,
    pricing?.amount,
    pricing?.data?.price,
    pricing?.data?.unitPrice,
    pricing?.data?.cost,
    pricing?.data?.amount
  ];

  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }

  throw new Error("TextVerified pricing response did not contain a valid price");
}

async function textVerifiedBuyVerification(serviceName, idempotencyKey) {
  const normalizedService = String(serviceName || "").trim().toLowerCase();

  if (!normalizedService) {
    throw new Error("TextVerified service name is required");
  }

  const headers = {};

  if (idempotencyKey) {
    headers["Idempotency-Key"] = String(idempotencyKey);
  }

  return textVerifiedRequest(
    "/api/pub/v2/verifications",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        capability: "Sms",
        serviceName: normalizedService
      })
    }
  );
}

async function textVerifiedGetVerification(verificationId) {
  return textVerifiedRequest(
    `/api/pub/v2/verifications/${encodeURIComponent(verificationId)}`,
    {
      method: "GET"
    }
  );
}

async function textVerifiedGetSMS(verificationId) {
  return textVerifiedRequest(
    `/api/pub/v2/sms?ReservationId=${encodeURIComponent(verificationId)}`,
    {
      method: "GET"
    }
  );
}

async function textVerifiedCancelVerification(verificationId) {
  return textVerifiedRequest(
    `/api/pub/v2/verifications/${encodeURIComponent(verificationId)}/cancel`,
    {
      method: "POST"
    }
  );
}

async function sendPasswordResetEmail(to, code) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: [to],
      subject: "NumberHub Password Reset Code",
      text: `Your NumberHub password reset code is: ${code}

This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.`,
      html: `<p>Your NumberHub password reset code is:</p>
             <h2>${code}</h2>
             <p>This code expires in 10 minutes.</p>
             <p>If you did not request a password reset, you can ignore this email.</p>`
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error ${response.status}: ${errorText}`);
  }
}

const PORT = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

function sendJSON(res, status, data, origin) {
  const allowedOrigin =
    origin === "http://localhost:3000" ||
    origin === "https://numberhub.onrender.com"
      ? origin
      : "https://numberhub.onrender.com";

  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  });
  res.end(JSON.stringify(data));
}

async function getAdminUserId(req) {
  const cookies = String(req.headers.cookie || "");
  const match = cookies.match(/(?:^|;\s*)session=([^;]+)/);

  if (!match) {
    return { error: "Not authenticated", status: 401 };
  }

  const sessionToken = match[1];

  const tokenHash = crypto
    .createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const result = await pool.query(
    `SELECT s.user_id
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
       AND u.is_admin = TRUE`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return { error: "Admin access required", status: 403 };
  }

  return { userId: result.rows[0].user_id };
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
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      phone_number TEXT,
      password_hash TEXT NOT NULL,
      wallet NUMERIC(12,2) DEFAULT 0,
      purchases INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      is_admin BOOLEAN NOT NULL DEFAULT FALSE
    );

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone_number TEXT;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
      ON password_reset_tokens(user_id);

    CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
      ON password_reset_tokens(expires_at);

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
      supplier_id TEXT,
      reference TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS number_purchases_user_id_idx
      ON number_purchases(user_id);

    CREATE INDEX IF NOT EXISTS number_purchases_created_at_idx
      ON number_purchases(created_at);
  `);

  await pool.query(`
    ALTER TABLE number_purchases
    ADD COLUMN IF NOT EXISTS supplier_id TEXT
  `);

  await pool.query(`
    ALTER TABLE number_purchases
    ADD COLUMN IF NOT EXISTS supplier_expires_at TIMESTAMPTZ
  `);

  await pool.query(`
    ALTER TABLE number_purchases
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ
  `);

  await pool.query(`
    ALTER TABLE number_purchases
    ADD COLUMN IF NOT EXISTS supplier_cost_usd NUMERIC(12,4)
  `);

  console.log("PostgreSQL database ready");
}


async function runTextVerifiedTest(req, res, origin) {
  const admin = await getAdminUserId(req);

  if (admin.error) {
    return sendJSON(res, admin.status, { error: admin.error }, origin);
  }

  try {
    const services = await textVerifiedGetServices();

    return sendJSON(res, 200, {
      success: true,
      provider: "TextVerified",
      services
    }, origin);
  } catch (error) {
    console.error("TextVerified test failed:", error);

    return sendJSON(res, 502, {
      success: false,
      provider: "TextVerified",
      error: error.message
    }, origin);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      const origin = req.headers.origin;
      const allowedOrigin =
        origin === "http://localhost:3000" ||
        origin === "https://numberhub.onrender.com"
          ? origin
          : "https://numberhub.onrender.com";

      res.writeHead(204, {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin"
      });
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/api/admin/bootstrap") {
      const data = await getBody(req);
      const secret = String(data.secret || "");

      if (!process.env.ADMIN_BOOTSTRAP_SECRET ||
          secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
        sendJSON(res, 403, { error: "Invalid admin setup secret" });
        return;
      }

      const result = await pool.query(
        `UPDATE users
         SET is_admin = TRUE
         WHERE LOWER(email) = $1
         RETURNING id, name, email, is_admin`,
        ["numberhubsupport@gmail.com"]
      );

      if (result.rows.length === 0) {
        sendJSON(res, 404, { error: "Admin account not found" });
        return;
      }

      sendJSON(res, 200, {
        message: "Admin account activated successfully",
        user: result.rows[0]
      });
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

    if (req.method === "GET" && req.url === "/api/admin/textverified-mock-success-test") {
    const admin = await getAdminUserId(req);
    if (admin.error) {
      return sendJSON(res, admin.status, { error: admin.error }, req.headers.origin);
    }

    try {
      const created = await textVerifiedRequest(
        "/api/pub/v2/verifications",
        {
          method: "POST",
          headers: {
            "Idempotency-Key": "numberhub-mock-test-success-" + Date.now()
          },
          body: JSON.stringify({
            capability: "Sms",
            serviceName: "test_success"
          })
        }
      );

      const verificationUrl =
        created.href ||
        created.url ||
        created.links?.self?.href ||
        created.links?.self;

      if (!verificationUrl) {
        throw new Error("Mock verification was created but no verification URL was returned");
      }

      const verificationPath = verificationUrl.startsWith("http")
        ? new URL(verificationUrl).pathname + new URL(verificationUrl).search
        : verificationUrl;

      const verification = await textVerifiedRequest(
        verificationPath,
        { method: "GET" }
      );

      let sms = null;

      const smsUrl =
        verification.sms?.href ||
        verification.sms?.url ||
        verification.links?.sms?.href ||
        verification.links?.sms;

      if (smsUrl) {
        const smsPath = smsUrl.startsWith("http")
          ? new URL(smsUrl).pathname + new URL(smsUrl).search
          : smsUrl;

        sms = await textVerifiedRequest(smsPath, { method: "GET" });
      }

      return sendJSON(res, 200, {
        success: true,
        provider: "TextVerified",
        mode: "mock",
        test: "test_success",
        created,
        verification,
        sms
      }, req.headers.origin);

    } catch (error) {
      console.error("TextVerified mock complete flow test failed:", error);
      return sendJSON(res, 502, {
        success: false,
        provider: "TextVerified",
        mode: "mock",
        test: "test_success",
        error: error.message
      }, req.headers.origin);
    }
  }

  if (req.method === "GET" && req.url === "/api/admin/textverified-us-whatsapp-test") {
    const admin = await getAdminUserId(req);
    if (admin.error) {
      return sendJSON(res, admin.status, { error: admin.error }, req.headers.origin);
    }

    try {
      const result = await textVerifiedCheckUSWhatsApp();
      return sendJSON(res, 200, result, req.headers.origin);
    } catch (error) {
      console.error("TextVerified US WhatsApp test failed:", error);
      return sendJSON(res, 502, {
        success: false,
        provider: "TextVerified",
        country: "US",
        service: "whatsapp",
        error: error.message
      }, req.headers.origin);
    }
  }

  if (req.method === "GET" && req.url === "/api/admin/textverified-inventory-test") {
    return await runTextVerifiedInventoryTest(req, res, req.headers.origin);
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/api/admin/textverified-service-price-test")
  ) {
    const admin = await getAdminUserId(req);

    if (admin.error) {
      return sendJSON(
        res,
        admin.status,
        { error: admin.error },
        req.headers.origin
      );
    }

    try {
      const url = new URL(req.url, "http://localhost");
      const service = String(
        url.searchParams.get("service") || ""
      ).trim().toLowerCase();

      if (!service) {
        return sendJSON(
          res,
          400,
          { error: "Use ?service=whatsapp" },
          req.headers.origin
        );
      }

      const result = await textVerifiedCheckUSService(service);

      const supplierCostUSD =
        textVerifiedExtractPrice(result.pricing);

      const sellingPrice =
        calculateNumberHubPrice(
          "United States",
          service,
          supplierCostUSD
        );

      return sendJSON(
        res,
        200,
        {
          success: true,
          provider: "TextVerified",
          country: "United States",
          service,
          inventory: result.inventory,
          supplierCostUSD,
          supplierCostNGN:
            supplierCostUSD * FIVESIM_USD_TO_NGN,
          numberHubSellingPrice: sellingPrice
        },
        req.headers.origin
      );
    } catch (error) {
      console.error(
        "TextVerified service price test failed:",
        error
      );

      return sendJSON(
        res,
        502,
        {
          success: false,
          provider: "TextVerified",
          error: error.message
        },
        req.headers.origin
      );
    }
  }

  if (req.method === "GET" && req.url === "/api/admin/textverified-test") {
      return await runTextVerifiedTest(req, res, req.headers.origin);
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
        const paymentReference = String(data.paymentReference || "").trim();

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

        if (!paymentReference || paymentReference.length < 3) {
          sendJSON(res, 400, {
            error: "Please enter your payment reference or transaction ID"
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
          (user_id, type, amount, method, status, reference, payment_reference, description)
         VALUES ($1, 'deposit', $2, $3, 'pending', $4, $5, $6)
         RETURNING id, amount, method, status, reference, payment_reference, description, created_at`,
        [
          userId,
          amount.toFixed(2),
          method,
          reference,
          paymentReference,
          "Wallet funding request awaiting payment confirmation"
        ]
      );

      // Notify NumberHub admin about the new funding request.
      try {
        const tx = result.rows[0];

        const userResult = await pool.query(
          `SELECT name, username, email
           FROM users
           WHERE id = $1
           LIMIT 1`,
          [userId]
        );

        const user = userResult.rows[0] || {};

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: ["numberhubsupport@gmail.com"],
            subject: `NumberHub Funding Request — ₦${Number(tx.amount).toFixed(2)}`,
            text: `New NumberHub funding request.

Customer: ${user.name || "Unknown"}
Username: ${user.username || "Not set"}
Email: ${user.email || "Unknown"}

Amount: ₦${Number(tx.amount).toFixed(2)}
Method: ${tx.method}
Payment Reference: ${tx.payment_reference || "Not provided"}
NumberHub Reference: ${tx.reference}
Status: ${tx.status}

The wallet has NOT been credited. Verify the payment before approving the request.`,
            html: `
              <h2>New NumberHub Funding Request</h2>
              <p><b>Customer:</b> ${user.name || "Unknown"}</p>
              <p><b>Username:</b> ${user.username || "Not set"}</p>
              <p><b>Email:</b> ${user.email || "Unknown"}</p>
              <hr>
              <p><b>Amount:</b> ₦${Number(tx.amount).toFixed(2)}</p>
              <p><b>Method:</b> ${tx.method}</p>
              <p><b>Payment Reference:</b> ${tx.payment_reference || "Not provided"}</p>
              <p><b>NumberHub Reference:</b> ${tx.reference}</p>
              <p><b>Status:</b> ${tx.status}</p>
              <hr>
              <p><b>Wallet has NOT been credited.</b> Verify the payment before approving.</p>
            `
          })
        });

        if (!emailResponse.ok) {
          console.error("Funding notification email failed:", await emailResponse.text());
        }
      } catch (emailError) {
        console.error("Funding notification error:", emailError);
      }

      sendJSON(res, 201, {
        message: "Deposit request created",
        transaction: result.rows[0]
      });

      return;
    }

    if (req.method === "POST" && req.url === "/api/admin/migrate-payment-reference") {
      const migrationSecret = process.env.MIGRATION_SECRET;
      const providedSecret = String(req.headers["x-migration-secret"] || "");

      if (migrationSecret && providedSecret === migrationSecret) {
        await pool.query(
          `ALTER TABLE wallet_transactions
           ADD COLUMN IF NOT EXISTS payment_reference TEXT`
        );

        sendJSON(res, 200, {
          message: "Payment reference column created successfully"
        });
        return;
      }

      const admin = await getAdminUserId(req);

      if (admin.error) {
        sendJSON(res, admin.status, { error: admin.error });
        return;
      }

      await pool.query(
        `ALTER TABLE wallet_transactions
         ADD COLUMN IF NOT EXISTS payment_reference TEXT`
      );

      sendJSON(res, 200, {
        message: "Payment reference column created successfully"
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/admin/refund") {
      const admin = await getAdminUserId(req);

      if (admin.error) {
        sendJSON(res, admin.status, { error: admin.error });
        return;
      }

      const body = await getBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const amount = Number(body.amount);

      if (!email || !Number.isFinite(amount) || amount <= 0) {
        sendJSON(res, 400, {
          error: "Valid email and positive refund amount are required"
        });
        return;
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const userResult = await client.query(
          `SELECT id, name, email, wallet
           FROM users
           WHERE LOWER(email) = $1
           FOR UPDATE`,
          [email]
        );

        if (userResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendJSON(res, 404, { error: "Customer account not found" });
          return;
        }

        const user = userResult.rows[0];

        const reference =
          "REFUND-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");

        const walletResult = await client.query(
          `UPDATE users
           SET wallet = wallet + $1
           WHERE id = $2
           RETURNING wallet`,
          [amount.toFixed(2), user.id]
        );

        await client.query(
          `INSERT INTO wallet_transactions
             (user_id, type, amount, method, status, reference, description)
           VALUES ($1, 'refund', $2, 'admin', 'successful', $3, $4)`,
          [
            user.id,
            amount.toFixed(2),
            reference,
            "Wallet refund issued by admin"
          ]
        );

        await client.query("COMMIT");

        sendJSON(res, 200, {
          message: "Refund credited successfully",
          customer: {
            id: user.id,
            name: user.name,
            email: user.email
          },
          refund: {
            amount: amount.toFixed(2),
            reference,
            status: "successful"
          },
          wallet: walletResult.rows[0].wallet
        });
        return;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch (_) {}

        throw error;
      } finally {
        client.release();
      }
    }

    if (req.method === "GET" && req.url === "/api/admin/deposits") {
      const admin = await getAdminUserId(req);

      if (admin.error) {
        sendJSON(res, admin.status, { error: admin.error });
        return;
      }

      const result = await pool.query(
        `SELECT
           wt.id,
           wt.user_id,
           u.name,
           u.username,
           u.email,
           wt.amount,
           wt.method,
           wt.status,
           wt.reference,
           wt.payment_reference,
           wt.description,
           wt.created_at
         FROM wallet_transactions wt
         JOIN users u ON u.id = wt.user_id
         WHERE wt.type = 'deposit'
           AND wt.status = 'pending'
         ORDER BY wt.created_at ASC
         LIMIT 100`
      );

      sendJSON(res, 200, {
        deposits: result.rows
      });
      return;
    }

    if (req.method === "POST" && /^\/api\/admin\/deposits\/\d+\/approve$/.test(req.url)) {
      const admin = await getAdminUserId(req);

      if (admin.error) {
        sendJSON(res, admin.status, { error: admin.error });
        return;
      }

      const depositId = Number(req.url.split("/")[4]);

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const depositResult = await client.query(
          `SELECT id, user_id, amount, status, reference
           FROM wallet_transactions
           WHERE id = $1
             AND type = 'deposit'
           FOR UPDATE`,
          [depositId]
        );

        if (depositResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendJSON(res, 404, { error: "Deposit not found" });
          return;
        }

        const deposit = depositResult.rows[0];

        if (deposit.status !== "pending") {
          await client.query("ROLLBACK");
          sendJSON(res, 409, {
            error: "Deposit has already been processed",
            status: deposit.status
          });
          return;
        }

        await client.query(
          `UPDATE wallet_transactions
           SET status = 'successful',
               description = $2
           WHERE id = $1`,
          [
            deposit.id,
            "Wallet funding approved by admin"
          ]
        );

        const walletResult = await client.query(
          `UPDATE users
           SET wallet = wallet + $1
           WHERE id = $2
           RETURNING wallet`,
          [deposit.amount, deposit.user_id]
        );

        if (walletResult.rows.length === 0) {
          throw new Error("Customer account not found");
        }

        await client.query("COMMIT");

        sendJSON(res, 200, {
          message: "Deposit approved and wallet credited",
          transaction: {
            id: deposit.id,
            reference: deposit.reference,
            amount: deposit.amount,
            status: "successful"
          },
          wallet: walletResult.rows[0].wallet
        });
        return;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch (_) {}

        throw error;
      } finally {
        client.release();
      }
    }

    if (req.method === "POST" && /^\/api\/admin\/deposits\/\d+\/reject$/.test(req.url)) {
      const admin = await getAdminUserId(req);

      if (admin.error) {
        sendJSON(res, admin.status, { error: admin.error });
        return;
      }

      const depositId = Number(req.url.split("/")[4]);

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const depositResult = await client.query(
          `SELECT id, user_id, amount, status, reference
           FROM wallet_transactions
           WHERE id = $1
             AND type = 'deposit'
           FOR UPDATE`,
          [depositId]
        );

        if (depositResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendJSON(res, 404, { error: "Deposit not found" });
          return;
        }

        const deposit = depositResult.rows[0];

        if (deposit.status !== "pending") {
          await client.query("ROLLBACK");
          sendJSON(res, 409, {
            error: "Deposit has already been processed",
            status: deposit.status
          });
          return;
        }

        await client.query(
          `UPDATE wallet_transactions
           SET status = 'failed',
               description = $2
           WHERE id = $1`,
          [
            deposit.id,
            "Wallet funding rejected by admin"
          ]
        );

        await client.query("COMMIT");

        sendJSON(res, 200, {
          message: "Deposit rejected",
          transaction: {
            id: deposit.id,
            reference: deposit.reference,
            amount: deposit.amount,
            status: "failed"
          }
        });

        return;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch (_) {}

        throw error;
      } finally {
        client.release();
      }
    }

    if (req.method === "GET" && req.url === "/api/wallet/transactions") {
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


    if (req.method === "GET" && req.url.startsWith("/api/numbers/services")) {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const requestedCountry = String(
        url.searchParams.get("country") || "United States"
      ).trim();

      const country = fiveSimCountryCode(requestedCountry);
      const requestOrigin = req.headers.origin;

      try {
        const prices = await fiveSimRequest(
          `/guest/prices?country=${encodeURIComponent(country)}`
        );

        const countryData = prices?.[country];

        if (!countryData || typeof countryData !== "object") {
          sendJSON(res, 404, {
            error: "No service data found for this country"
          }, requestOrigin);
          return;
        }

        const services = Object.entries(countryData)
          .map(([product, operators]) => {
            if (!operators || typeof operators !== "object") {
              return null;
            }

            const available = Object.entries(operators)
              .filter(([, item]) =>
                item &&
                Number(item.count) > 0 &&
                Number.isFinite(Number(item.cost))
              )
              .map(([operator, item]) => ({
                operator,
                cost: Number(item.cost),
                count: Number(item.count)
              }))
              .sort((a, b) => a.cost - b.cost);

            if (!available.length) {
              return null;
            }

            return {
              product,
              available: available.reduce(
                (total, item) => total + item.count,
                0
              ),
              cheapestCost: available[0].cost,
              operators: available
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.product.localeCompare(b.product));

        const servicesWithCustomerPrices = services.map(item => ({
          ...item,
          customerPrice: calculateNumberHubPrice(
            requestedCountry,
            item.product,
            item.cheapestCost
          )
        }));

        sendJSON(res, 200, {
          country: requestedCountry,
          providerCountry: country,
          count: servicesWithCustomerPrices.length,
          services: servicesWithCustomerPrices
        }, requestOrigin);
        return;

      } catch (error) {
        console.error("5SIM service lookup error:", error);

        sendJSON(res, 502, {
          error: "Unable to load services right now. Please try again."
        }, requestOrigin);
        return;
      }
    }

    if (req.method === "GET" && req.url.startsWith("/api/numbers/sms/")) {
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
      const supplierId = decodeURIComponent(
        req.url.substring("/api/numbers/sms/".length).split("?")[0]
      ).trim();

      if (!supplierId) {
        sendJSON(res, 400, { error: "Missing activation ID" });
        return;
      }

      const purchaseResult = await pool.query(
        `SELECT id, phone_number, country, service, status, sms_code, price, reference
         FROM number_purchases
         WHERE user_id = $1
           AND supplier_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, supplierId]
      );

      if (purchaseResult.rows.length === 0) {
        sendJSON(res, 404, { error: "Purchase not found" });
        return;
      }

      try {
        const activation = await fiveSimRequest(
          `/user/check/${encodeURIComponent(supplierId)}`
        );

        const smsList = Array.isArray(activation.sms)
          ? activation.sms
          : [];

        let smsCode = "";

        if (smsList.length) {
          const latest = smsList[smsList.length - 1];

          smsCode = String(
            latest.code ||
            latest.sms ||
            latest.text ||
            ""
          ).trim();
        }

        const status = String(
          activation.status ||
          purchaseResult.rows[0].status ||
          "active"
        ).trim();

        const terminalStatus = status.toLowerCase();

        if (
          (terminalStatus === "canceled" || terminalStatus === "timeout") &&
          !smsCode &&
          !purchaseResult.rows[0].sms_code
        ) {
          const refundClient = await pool.connect();

          try {
            await refundClient.query("BEGIN");

            const lockedPurchaseResult = await refundClient.query(
              `SELECT id, price, reference, sms_code
               FROM number_purchases
               WHERE id = $1
                 AND user_id = $2
               FOR UPDATE`,
              [purchaseResult.rows[0].id, userId]
            );

            if (lockedPurchaseResult.rows.length === 0) {
              await refundClient.query("ROLLBACK");
              sendJSON(res, 404, { error: "Purchase not found" });
              return;
            }

            const lockedPurchase = lockedPurchaseResult.rows[0];
            const refundReference = "REFUND-" + lockedPurchase.reference;

            const existingRefund = await refundClient.query(
              `SELECT id
               FROM wallet_transactions
               WHERE user_id = $1
                 AND reference = $2
                 AND type = 'refund'
               LIMIT 1`,
              [userId, refundReference]
            );

            const alreadyRefunded = existingRefund.rows.length > 0;

            if (!alreadyRefunded && !lockedPurchase.sms_code) {
              await refundClient.query(
                `UPDATE users
                 SET wallet = wallet + $1
                 WHERE id = $2`,
                [lockedPurchase.price, userId]
              );

              await refundClient.query(
                `INSERT INTO wallet_transactions
                   (user_id, type, amount, method, status, reference, description)
                 VALUES ($1, 'refund', $2, '5SIM', 'successful', $3, $4)`,
                [
                  userId,
                  lockedPurchase.price,
                  refundReference,
                  terminalStatus === "canceled"
                    ? "Automatic refund for canceled number"
                    : "Automatic refund for expired number"
                ]
              );
            }

            await refundClient.query(
              `UPDATE number_purchases
               SET status = $1
               WHERE id = $2
                 AND user_id = $3`,
              [terminalStatus, lockedPurchase.id, userId]
            );

            await refundClient.query("COMMIT");

            sendJSON(res, 200, {
              status: terminalStatus,
              smsCode: "",
              phoneNumber: purchaseResult.rows[0].phone_number,
              activationId: supplierId,
              refunded: !alreadyRefunded && !lockedPurchase.sms_code,
              refundAmount: Number(lockedPurchase.price).toFixed(2),
              message: alreadyRefunded
                ? "This number is no longer active. The refund was already processed."
                : terminalStatus === "canceled"
                  ? "Number was canceled and your wallet has been refunded."
                  : "Number expired and your wallet has been refunded."
            });
            return;
          } catch (refundError) {
            try {
              await refundClient.query("ROLLBACK");
            } catch (_) {}
            throw refundError;
          } finally {
            refundClient.release();
          }
        }

        if (smsCode) {
          await pool.query(
            `UPDATE number_purchases
             SET sms_code = $1,
                 status = $2
             WHERE id = $3
               AND user_id = $4`,
            [smsCode, status, purchaseResult.rows[0].id, userId]
          );
        } else {
          await pool.query(
            `UPDATE number_purchases
             SET status = $1
             WHERE id = $2
               AND user_id = $3`,
            [status, purchaseResult.rows[0].id, userId]
          );
        }

        sendJSON(res, 200, {
          status,
          smsCode,
          phoneNumber: purchaseResult.rows[0].phone_number,
          activationId: supplierId
        });

      } catch (error) {
        console.error("5SIM SMS check error:", error);

        const errorMessage = String(error.message || "").toLowerCase();

        if (errorMessage.includes("order not found")) {
          const refundClient = await pool.connect();

          try {
            await refundClient.query("BEGIN");

            const lockedPurchaseResult = await refundClient.query(
              `SELECT id, price, reference, sms_code
               FROM number_purchases
               WHERE id = $1
                 AND user_id = $2
               FOR UPDATE`,
              [purchaseResult.rows[0].id, userId]
            );

            if (lockedPurchaseResult.rows.length === 0) {
              await refundClient.query("ROLLBACK");
              sendJSON(res, 404, { error: "Purchase not found" });
              return;
            }

            const lockedPurchase = lockedPurchaseResult.rows[0];
            let refunded = false;

            if (!lockedPurchase.sms_code) {
              const refundReference =
                "REFUND-" + lockedPurchase.reference;

              const existingRefund = await refundClient.query(
                `SELECT id
                 FROM wallet_transactions
                 WHERE user_id = $1
                   AND reference = $2
                   AND type = 'refund'
                 LIMIT 1`,
                [userId, refundReference]
              );

              if (existingRefund.rows.length === 0) {
                await refundClient.query(
                  `UPDATE users
                   SET wallet = wallet + $1
                   WHERE id = $2`,
                  [lockedPurchase.price, userId]
                );

                await refundClient.query(
                  `INSERT INTO wallet_transactions
                     (user_id, type, amount, method, status, reference, description)
                   VALUES ($1, 'refund', $2, '5SIM', 'successful', $3, $4)`,
                  [
                    userId,
                    lockedPurchase.price,
                    refundReference,
                    "Automatic refund for expired number"
                  ]
                );

                refunded = true;
              }
            }

            await refundClient.query(
              `UPDATE number_purchases
               SET status = 'timeout'
               WHERE id = $1
                 AND user_id = $2`,
              [purchaseResult.rows[0].id, userId]
            );

            await refundClient.query("COMMIT");

            sendJSON(res, 200, {
              status: "timeout",
              smsCode: "",
              phoneNumber: purchaseResult.rows[0].phone_number,
              activationId: supplierId,
              refunded,
              refundAmount: Number(lockedPurchase.price).toFixed(2),
              message: refunded
                ? "This number expired and your wallet has been refunded."
                : "This number has expired or is no longer available."
            });
            return;
          } catch (refundError) {
            try {
              await refundClient.query("ROLLBACK");
            } catch (_) {}
            throw refundError;
          } finally {
            refundClient.release();
          }
        }

        sendJSON(res, 502, {
          error: error.message || "Unable to check OTP"
        });
      }

      return;
    }

    if (req.method === "POST" && req.url.startsWith("/api/numbers/cancel/")) {
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
      const supplierId = decodeURIComponent(
        req.url.substring("/api/numbers/cancel/".length)
      ).trim();

      if (!supplierId) {
        sendJSON(res, 400, { error: "Missing supplier ID" });
        return;
      }

      try {
        const purchaseResult = await pool.query(
          `SELECT id, phone_number, status, sms_code, supplier_id
           FROM number_purchases
           WHERE user_id = $1
             AND supplier_id = $2
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId, supplierId]
        );

        if (purchaseResult.rows.length === 0) {
          sendJSON(res, 404, { error: "Number purchase not found" });
          return;
        }

        const purchase = purchaseResult.rows[0];

        if (purchase.sms_code) {
          sendJSON(res, 400, {
            error: "This number cannot be canceled because an OTP has already been received."
          });
          return;
        }

        if (["finished", "canceled", "timeout", "banned"].includes(
          String(purchase.status || "").toLowerCase()
        )) {
          sendJSON(res, 400, {
            error: "This number is no longer active and cannot be canceled."
          });
          return;
        }

        const cancelResult = await fiveSimRequest(
          `/user/cancel/${encodeURIComponent(supplierId)}`,
          { method: "GET" }
        );

        const supplierStatus = String(cancelResult?.status || "").toLowerCase();

        if (supplierStatus && supplierStatus !== "canceled") {
          sendJSON(res, 400, {
            error: "Unable to cancel this number right now. Please try again.",
            status: cancelResult.status
          });
          return;
        }

        const refundClient = await pool.connect();

        try {
          await refundClient.query("BEGIN");

          const lockedPurchase = await refundClient.query(
            `SELECT id, price, reference, status, sms_code
             FROM number_purchases
             WHERE id = $1
               AND user_id = $2
             FOR UPDATE`,
            [purchase.id, userId]
          );

          if (lockedPurchase.rows.length === 0) {
            await refundClient.query("ROLLBACK");
            sendJSON(res, 404, { error: "Number purchase not found" });
            return;
          }

          const locked = lockedPurchase.rows[0];
          const refundReference = "REFUND-" + locked.reference;

          const existingRefund = await refundClient.query(
            `SELECT id
             FROM wallet_transactions
             WHERE user_id = $1
               AND reference = $2
               AND type = 'refund'
             LIMIT 1`,
            [userId, refundReference]
          );

          if (existingRefund.rows.length === 0) {
            await refundClient.query(
              `UPDATE users
               SET wallet = wallet + $1
               WHERE id = $2`,
              [locked.price, userId]
            );

            await refundClient.query(
              `INSERT INTO wallet_transactions
                 (user_id, type, amount, method, status, reference, description)
               VALUES ($1, 'refund', $2, '5SIM', 'successful', $3, $4)`,
              [
                userId,
                locked.price,
                refundReference,
                "Automatic refund for canceled number"
              ]
            );
          }

          await refundClient.query(
            `UPDATE number_purchases
             SET status = 'canceled'
             WHERE id = $1
               AND user_id = $2`,
            [purchase.id, userId]
          );

          await refundClient.query("COMMIT");

          sendJSON(res, 200, {
            success: true,
            status: "canceled",
            refunded: existingRefund.rows.length === 0,
            refundAmount: Number(locked.price).toFixed(2),
            message: existingRefund.rows.length === 0
              ? "Number canceled and wallet refunded successfully."
              : "Number canceled successfully. Refund was already processed.",
            supplier: cancelResult
          });
        } catch (refundError) {
          try {
            await refundClient.query("ROLLBACK");
          } catch (_) {}
          throw refundError;
        } finally {
          refundClient.release();
        }

      } catch (error) {
        console.error("5SIM number cancellation error:", error);

        sendJSON(res, 502, {
          error: error.message || "Unable to cancel number"
        });
      }

      return;
    }

    if (req.method === "POST" && req.url === "/api/numbers/purchase") {
      const cookies = String(req.headers.cookie || "");
      const match = cookies.match(/(?:^|;\s*)session=([^;]+)/);

      if (!match) {
        sendJSON(res, 401, { error: "Not authenticated" });
        return;
      }

      const tokenHash = crypto
        .createHash("sha256")
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
      const numberType = String(data.numberType || "").trim();
      const requestedCountry = String(
        data.country || "United States"
      ).trim();

      /*
       * USA Numbers (Servers A & B) use TextVerified.
       * All other number types continue using 5SIM.
       */
      const useTextVerified = numberType === "usa";

      if (useTextVerified) {
        if (!service) {
          sendJSON(res, 400, {
            error: "Invalid purchase details"
          });
          return;
        }

        const countryName = "United States";
        const serviceKey = service.toLowerCase();

        let supplierInfo;

        try {
          supplierInfo = await textVerifiedCheckUSService(serviceKey);

          const availableQuantity = Number(
            supplierInfo?.inventory?.availableQuantity ??
            supplierInfo?.inventory?.data?.availableQuantity ??
            supplierInfo?.inventory?.quantity ??
            supplierInfo?.inventory?.data?.quantity ??
            0
          );

          if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) {
            sendJSON(res, 400, {
              error: `No ${service} numbers are currently available. Please choose another service or try again later.`
            });
            return;
          }
        } catch (supplierError) {
          console.error(
            "TextVerified availability lookup error:",
            supplierError
          );

          sendJSON(res, 502, {
            error: "Unable to check TextVerified availability right now. Please try again."
          });
          return;
        }

        let supplierCostUSD;

        try {
          supplierCostUSD = textVerifiedExtractPrice(
            supplierInfo.pricing
          );
        } catch (pricingError) {
          console.error(
            "TextVerified pricing extraction error:",
            pricingError
          );

          sendJSON(res, 502, {
            error: "Unable to determine the current number price. Please try again."
          });
          return;
        }

        const price = calculateNumberHubPrice(
          countryName,
          service,
          supplierCostUSD
        );

        if (!Number.isFinite(price) || price <= 0) {
          sendJSON(res, 400, {
            error: "Unable to calculate the selling price"
          });
          return;
        }

        // Check the customer's wallet BEFORE purchasing from TextVerified.
        const walletCheck = await pool.query(
          `SELECT wallet
           FROM users
           WHERE id = $1`,
          [userId]
        );

        if (walletCheck.rows.length === 0) {
          sendJSON(res, 404, {
            error: "User not found"
          });
          return;
        }

        const wallet = Number(walletCheck.rows[0].wallet || 0);

        if (wallet < price) {
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

        let supplierPurchase;

        try {
          supplierPurchase = await textVerifiedBuyVerification(
            serviceKey,
            reference
          );
        } catch (supplierError) {
          console.error(
            "TextVerified purchase error:",
            supplierError
          );

          sendJSON(res, 502, {
            error: "Unable to purchase this number right now. Please try again."
          });
          return;
        }

        const phoneNumber = String(
          supplierPurchase?.number ||
          supplierPurchase?.phoneNumber ||
          supplierPurchase?.phone ||
          ""
        ).trim();

        const supplierId = String(
          supplierPurchase?.id || ""
        ).trim();

        const supplierExpiresAt =
          supplierPurchase?.endsAt ||
          supplierPurchase?.expiresAt ||
          null;

        if (!phoneNumber || !supplierId) {
          if (supplierId) {
            try {
              await textVerifiedCancelVerification(supplierId);
            } catch (cancelError) {
              console.error(
                "Could not cancel TextVerified verification:",
                cancelError
              );
            }
          }

          sendJSON(res, 502, {
            error: "We couldn't complete the number purchase. Please try again."
          });
          return;
        }

        const dbClient = await pool.connect();

        try {
          await dbClient.query("BEGIN");

          const lockedUser = await dbClient.query(
            `SELECT wallet, purchases
             FROM users
             WHERE id = $1
             FOR UPDATE`,
            [userId]
          );

          if (lockedUser.rows.length === 0) {
            await dbClient.query("ROLLBACK");

            try {
              await textVerifiedCancelVerification(supplierId);
            } catch (cancelError) {
              console.error(
                "Could not cancel TextVerified verification:",
                cancelError
              );
            }

            sendJSON(res, 404, {
              error: "User not found"
            });
            return;
          }

          const currentWallet = Number(
            lockedUser.rows[0].wallet || 0
          );

          // Re-check after acquiring the database lock.
          if (currentWallet < price) {
            await dbClient.query("ROLLBACK");

            try {
              await textVerifiedCancelVerification(supplierId);
            } catch (cancelError) {
              console.error(
                "Could not cancel TextVerified verification:",
                cancelError
              );
            }

            sendJSON(res, 400, {
              error: "Insufficient wallet balance"
            });
            return;
          }

          const purchaseResult = await dbClient.query(
            `INSERT INTO number_purchases
               (user_id, phone_number, country, service, provider,
                price, status, supplier_id, supplier_expires_at, supplier_cost_usd, reference)
             VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10)
             RETURNING id, phone_number, country, service, provider,
                       price, status, supplier_id, supplier_expires_at, supplier_cost_usd, reference, created_at`,
            [
              userId,
              phoneNumber,
              countryName,
              service,
              "TextVerified",
              price.toFixed(2),
              supplierId,
              supplierExpiresAt,
              supplierCostUSD,
              reference
            ]
          );

          await dbClient.query(
            `UPDATE users
             SET wallet = wallet - $1,
                 purchases = purchases + 1
             WHERE id = $2`,
            [
              price.toFixed(2),
              userId
            ]
          );

          await dbClient.query(
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

          await dbClient.query("COMMIT");

          sendJSON(res, 201, {
            message: "Number purchased successfully",
            purchase: purchaseResult.rows[0],
            supplier: {
              id: supplierId,
              provider: "TextVerified"
            }
          });

          return;
        } catch (dbError) {
          try {
            await dbClient.query("ROLLBACK");
          } catch (_) {}

          try {
            await textVerifiedCancelVerification(supplierId);
          } catch (cancelError) {
            console.error(
              "Could not cancel TextVerified verification:",
              cancelError
            );
          }

          throw dbError;
        } finally {
          dbClient.release();
        }
      }

      /*
       * Existing 5SIM purchase flow.
       * Used for Other USA, All Countries and More Countries.
       */
      const countryName = requestedCountry;
      const country = fiveSimCountryCode(countryName);
      const serviceKey = service.toLowerCase();

      const productMap = {
        whatsapp: "whatsapp",
        facebook: "facebook",
        instagram: "instagram",
        telegram: "telegram",
        tiktok: "tiktok",
        google: "google",
        twitter: "twitter",
        x: "twitter"
      };

      const product = productMap[serviceKey];

      if (!service || !product) {
        sendJSON(res, 400, {
          error: "Invalid purchase details"
        });
        return;
      }

      let option;

      try {
        const prices = await fiveSimGetPrices(country, product);

        option = fiveSimCheapestAvailable(
          prices,
          country,
          product
        );

        if (!option) {
          sendJSON(res, 400, {
            error: `No ${service} numbers are currently available. Please choose another service or country.`
          });
          return;
        }
      } catch (supplierError) {
        console.error(
          "5SIM price lookup error:",
          supplierError
        );

        sendJSON(res, 502, {
          error: "Unable to check availability right now. Please try again."
        });
        return;
      }

      const price = calculateNumberHubPrice(
        countryName,
        service,
        option.cost
      );

      if (!Number.isFinite(price) || price <= 0) {
        sendJSON(res, 400, {
          error: "Unable to calculate the selling price"
        });
        return;
      }

      // Check the customer's wallet BEFORE purchasing from 5SIM.
      const walletCheck = await pool.query(
        `SELECT wallet
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (walletCheck.rows.length === 0) {
        sendJSON(res, 404, {
          error: "User not found"
        });
        return;
      }

      const wallet = Number(
        walletCheck.rows[0].wallet || 0
      );

      if (wallet < price) {
        sendJSON(res, 400, {
          error: "Insufficient wallet balance"
        });
        return;
      }

      let supplierPurchase;

      try {
        supplierPurchase = await fiveSimBuyActivation(
          country,
          product,
          option.operator
        );
      } catch (supplierError) {
        console.error(
          "5SIM purchase error:",
          supplierError
        );

        sendJSON(res, 502, {
          error: "Unable to purchase this number right now. Please try again."
        });
        return;
      }

      const phoneNumber = String(
        supplierPurchase.phone ||
        supplierPurchase.number ||
        ""
      ).trim();

      const supplierId = supplierPurchase.id;
      const supplierExpiresAt =
        supplierPurchase.expires || null;

      if (!phoneNumber || !supplierId) {
        sendJSON(res, 502, {
          error: "We couldn't complete the number purchase. Please try again."
        });
        return;
      }

      const dbClient = await pool.connect();

      try {
        await dbClient.query("BEGIN");

        const lockedUser = await dbClient.query(
          `SELECT wallet, purchases
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [userId]
        );

        if (lockedUser.rows.length === 0) {
          await dbClient.query("ROLLBACK");

          try {
            await fiveSimRequest(
              `/user/cancel/${supplierId}`,
              { method: "GET" }
            );
          } catch (cancelError) {
            console.error(
              "Could not cancel 5SIM order:",
              cancelError
            );
          }

          sendJSON(res, 404, {
            error: "User not found"
          });
          return;
        }

        const currentWallet = Number(
          lockedUser.rows[0].wallet || 0
        );

        // Re-check after acquiring the database lock.
        if (currentWallet < price) {
          await dbClient.query("ROLLBACK");

          try {
            await fiveSimRequest(
              `/user/cancel/${supplierId}`,
              { method: "GET" }
            );
          } catch (cancelError) {
            console.error(
              "Could not cancel 5SIM order:",
              cancelError
            );
          }

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

        const purchaseResult = await dbClient.query(
          `INSERT INTO number_purchases
             (user_id, phone_number, country, service, provider,
              price, status, supplier_id, supplier_expires_at, supplier_cost_usd, reference)
           VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10)
           RETURNING id, phone_number, country, service, provider,
                     price, status, supplier_id, supplier_expires_at, supplier_cost_usd, reference, created_at`,
          [
            userId,
            phoneNumber,
            countryName,
            service,
            provider || option.operator,
            price.toFixed(2),
            supplierId,
            supplierExpiresAt,
            Number(option.cost),
            reference
          ]
        );

        await dbClient.query(
          `UPDATE users
           SET wallet = wallet - $1,
               purchases = purchases + 1
           WHERE id = $2`,
          [
            price.toFixed(2),
            userId
          ]
        );

        await dbClient.query(
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

        await dbClient.query("COMMIT");

        sendJSON(res, 201, {
          message: "Number purchased successfully",
          purchase: purchaseResult.rows[0],
          supplier: {
            id: supplierId,
            provider: "5SIM"
          }
        });

        return;
      } catch (dbError) {
        try {
          await dbClient.query("ROLLBACK");
        } catch (_) {}

        try {
          await fiveSimRequest(
            `/user/cancel/${supplierId}`,
            { method: "GET" }
          );
        } catch (cancelError) {
          console.error(
            "Could not cancel 5SIM order:",
            cancelError
          );
        }

        throw dbError;
      } finally {
        dbClient.release();
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
      console.log("AUTH DEBUG /api/me cookie:", cookies ? "PRESENT" : "MISSING");
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

      const result = await pool.query(
        `SELECT u.id, u.name, u.email, u.wallet, u.purchases, u.created_at, u.is_admin
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1
           AND s.expires_at > NOW()`,
        [tokenHash]
      );

      console.log("AUTH DEBUG /api/me session rows:", result.rows.length);

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


    if (
      (req.method === "GET" || req.method === "PUT") &&
      req.url === "/api/profile"
    ) {
      const cookies = String(req.headers.cookie || "");
      const match = cookies.match(/(?:^|;\s*)session=([^;]+)/);

      if (!match) {
        sendJSON(res, 401, { error: "Not authenticated" });
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

      if (req.method === "GET") {
        const result = await pool.query(
          `SELECT
             u.id,
             u.name,
             u.username,
             u.email,
             u.phone_number,
             u.wallet,
             u.purchases,
             u.created_at,
             COALESCE((
               SELECT SUM(wt.amount)
               FROM wallet_transactions wt
               WHERE wt.user_id = u.id
                 AND wt.type = 'deposit'
                 AND wt.status = 'successful'
             ), 0) AS total_recharged
           FROM users u
           WHERE u.id = $1`,
          [userId]
        );

        if (result.rows.length === 0) {
          sendJSON(res, 404, { error: "User not found" });
          return;
        }

        const user = result.rows[0];

        sendJSON(res, 200, {
          profile: {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            phone_number: user.phone_number,
            wallet: user.wallet,
            usd_balance: 0,
            total_recharged: user.total_recharged,
            total_otp_buys: user.purchases,
            created_at: user.created_at
          }
        });

        return;
      }

      const data = await getBody(req);

      const name = String(data.name || "").trim();
      const username = String(data.username || "").trim();
      const phoneNumber = String(data.phone_number || "").trim();

      if (!name) {
        sendJSON(res, 400, {
          error: "Full name is required"
        });
        return;
      }

      if (username && !/^[A-Za-z0-9_]{3,30}$/.test(username)) {
        sendJSON(res, 400, {
          error: "Username must be 3-30 characters and use only letters, numbers, or underscores"
        });
        return;
      }

      try {
        const result = await pool.query(
          `UPDATE users
           SET name = $1,
               username = NULLIF($2, ''),
               phone_number = NULLIF($3, '')
           WHERE id = $4
           RETURNING id, name, username, email, phone_number, wallet, purchases, created_at`,
          [name, username, phoneNumber, userId]
        );

        sendJSON(res, 200, {
          message: "Profile updated successfully",
          profile: result.rows[0]
        });
      } catch (error) {
        if (error.code === "23505") {
          sendJSON(res, 409, {
            error: "That username is already taken"
          });
          return;
        }

        throw error;
      }

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

    if (req.method === "POST" && req.url === "/api/forgot-password") {
      const data = await getBody(req);
      const email = String(data.email || "").trim().toLowerCase();

      if (!email) {
        sendJSON(res, 400, { error: "Email is required" });
        return;
      }

      const userResult = await pool.query(
        `SELECT id, email FROM users WHERE email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        sendJSON(res, 200, {
          message: "If an account exists for that email, a verification code has been sent."
        });
        return;
      }

      const user = userResult.rows[0];

      await pool.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );

      const code = String(crypto.randomInt(100000, 1000000));
      const codeHash = await bcrypt.hash(code, 12);
      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await pool.query(
        `INSERT INTO password_reset_tokens
          (user_id, token_hash, code_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, tokenHash, codeHash, expiresAt]
      );

      try {
        await sendPasswordResetEmail(user.email, code);
      } catch (emailError) {
        console.error("PASSWORD RESET EMAIL ERROR:", emailError);

        await pool.query(
          `UPDATE password_reset_tokens
           SET used_at = NOW()
           WHERE token_hash = $1`,
          [tokenHash]
        );

        sendJSON(res, 500, {
          error: "Unable to send the verification code. Please try again later."
        });
        return;
      }

      sendJSON(res, 200, {
        message: "If an account exists for that email, a verification code has been sent.",
        resetToken
      });

      return;
    }

    if (req.method === "POST" && req.url === "/api/verify-reset-code") {
      const data = await getBody(req);

      const resetToken = String(data.resetToken || "");
      const code = String(data.code || "").trim();

      if (!resetToken || !code) {
        sendJSON(res, 400, {
          error: "Reset token and verification code are required"
        });
        return;
      }

      const tokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const result = await pool.query(
        `SELECT code_hash, expires_at, used_at
         FROM password_reset_tokens
         WHERE token_hash = $1`,
        [tokenHash]
      );

      if (
        result.rows.length === 0 ||
        result.rows[0].used_at ||
        new Date(result.rows[0].expires_at).getTime() <= Date.now()
      ) {
        sendJSON(res, 400, {
          error: "Invalid or expired verification code"
        });
        return;
      }

      const codeMatch = await bcrypt.compare(
        code,
        result.rows[0].code_hash
      );

      if (!codeMatch) {
        sendJSON(res, 400, {
          error: "Invalid or expired verification code"
        });
        return;
      }

      sendJSON(res, 200, {
        message: "Code verified successfully",
        resetToken
      });

      return;
    }

    if (req.method === "POST" && req.url === "/api/change-password") {
      const data = await getBody(req);

      const currentPassword = String(data.currentPassword || "");
      const newPassword = String(data.newPassword || "");
      const confirmPassword = String(data.confirmPassword || "");

      if (!currentPassword || !newPassword || !confirmPassword) {
        sendJSON(res, 400, {
          error: "Current password, new password, and confirmation are required"
        });
        return;
      }

      if (newPassword.length < 8) {
        sendJSON(res, 400, {
          error: "Password must be at least 8 characters"
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        sendJSON(res, 400, {
          error: "New passwords do not match"
        });
        return;
      }

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
         WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
      );

      if (sessionResult.rows.length === 0) {
        sendJSON(res, 401, {
          error: "Not authenticated"
        });
        return;
      }

      const userResult = await pool.query(
        `SELECT password_hash
         FROM users
         WHERE id = $1`,
        [sessionResult.rows[0].user_id]
      );

      if (userResult.rows.length === 0) {
        sendJSON(res, 404, {
          error: "User not found"
        });
        return;
      }

      const passwordMatches = await bcrypt.compare(
        currentPassword,
        userResult.rows[0].password_hash
      );

      if (!passwordMatches) {
        sendJSON(res, 400, {
          error: "Current password is incorrect"
        });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await pool.query(
        `UPDATE users
         SET password_hash = $1
         WHERE id = $2`,
        [passwordHash, sessionResult.rows[0].user_id]
      );

      await pool.query(
        `DELETE FROM sessions
         WHERE user_id = $1 AND token_hash <> $2`,
        [sessionResult.rows[0].user_id, tokenHash]
      );

      sendJSON(res, 200, {
        message: "Password changed successfully"
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/reset-password") {
      const data = await getBody(req);

      const resetToken = String(data.resetToken || "");
      const newPassword = String(data.newPassword || "");

      if (!resetToken || !newPassword) {
        sendJSON(res, 400, {
          error: "Reset token and new password are required"
        });
        return;
      }

      if (newPassword.length < 8) {
        sendJSON(res, 400, {
          error: "Password must be at least 8 characters"
        });
        return;
      }

      const tokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const result = await pool.query(
        `SELECT user_id, code_hash, expires_at, used_at
         FROM password_reset_tokens
         WHERE token_hash = $1`,
        [tokenHash]
      );

      if (
        result.rows.length === 0 ||
        result.rows[0].used_at ||
        new Date(result.rows[0].expires_at).getTime() <= Date.now()
      ) {
        sendJSON(res, 400, {
          error: "Invalid or expired password reset request"
        });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await pool.query("BEGIN");

      try {
        await pool.query(
          `UPDATE users
           SET password_hash = $1
           WHERE id = $2`,
          [passwordHash, result.rows[0].user_id]
        );

        await pool.query(
          `UPDATE password_reset_tokens
           SET used_at = NOW()
           WHERE token_hash = $1`,
          [tokenHash]
        );

        await pool.query(
          `DELETE FROM sessions
           WHERE user_id = $1`,
          [result.rows[0].user_id]
        );

        await pool.query("COMMIT");
      } catch (resetError) {
        await pool.query("ROLLBACK");
        throw resetError;
      }

      sendJSON(res, 200, {
        message: "Password changed successfully. Please log in with your new password."
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
        `SELECT id, name, email, password_hash, wallet, purchases, created_at, is_admin
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
        "Access-Control-Allow-Origin": (req.headers.origin === "http://localhost:3000" || req.headers.origin === "https://numberhub.onrender.com") ? req.headers.origin : "https://numberhub.onrender.com",
        "Access-Control-Allow-Credentials": "true",
        "Set-Cookie": `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800`
      });

      res.end(JSON.stringify({
        message: "Login successful",
        user
      }));

      return;
    }

    if (req.method === "POST" && req.url === "/api/logout") {
      const cookies = req.headers.cookie || "";
      const match = cookies.match(/(?:^|;\s*)session=([^;]+)/);

      if (match) {
        const sessionToken = match[1];
        const tokenHash = crypto
          .createHash("sha256")
          .update(sessionToken)
          .digest("hex");

        await pool.query(
          `DELETE FROM sessions WHERE token_hash = $1`,
          [tokenHash]
        );
      }

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": (req.headers.origin === "http://localhost:3000" || req.headers.origin === "https://numberhub.onrender.com") ? req.headers.origin : "https://numberhub.onrender.com",
        "Access-Control-Allow-Credentials": "true",
        "Set-Cookie": "session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0"
      });

      res.end(JSON.stringify({
        message: "Logout successful"
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

    // Serve frontend static files
    if (req.method === "GET") {
      const requestedPath = decodeURIComponent((req.url || "/").split("?")[0]);

      if (/^\/(redesign\.css|style\.css|script\.js)$/.test(requestedPath)) {
        const filePath = path.join(__dirname, requestedPath.slice(1));

        if (fs.existsSync(filePath)) {
          const contentTypes = {
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8"
          };

          res.writeHead(200, {
            "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream"
          });

          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }
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
