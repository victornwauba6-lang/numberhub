const TEXTVERIFIED_BASE_URL = "https://backend.textverified.com";

type TextVerifiedConfig = {
  email: string;
  apiKey: string;
};

type TextVerifiedTokenResponse = {
  token?: string;
  accessToken?: string;
  data?: {
    token?: string;
    accessToken?: string;
  };
};

type TextVerifiedService = {
  name?: string;
  serviceName?: string;
  key?: string;
  slug?: string;
  id?: string;
};

type TextVerifiedInventoryResponse = {
  inventory?: unknown;
  count?: number;
  available?: number;
  quantity?: number;
  data?: unknown;
};

type TextVerifiedPricingResponse = {
  price?: number | string;
  unitPrice?: number | string;
  cost?: number | string;
  amount?: number | string;
  data?: {
    price?: number | string;
    unitPrice?: number | string;
    cost?: number | string;
    amount?: number | string;
  };
};

export type TextVerifiedCatalogOption = {
  supplierOption: string;
  currency: "USD";
  cost: number | null;
  available: boolean;
  stock: number | null;
};

let cachedToken: {
  token: string;
  expiresAt: number;
} | null = null;

function extractToken(payload: TextVerifiedTokenResponse): string | null {
  return (
    payload.token ??
    payload.accessToken ??
    payload.data?.token ??
    payload.data?.accessToken ??
    null
  );
}

async function getTextVerifiedToken(
  config: TextVerifiedConfig,
): Promise<string> {
  if (
    cachedToken &&
    cachedToken.expiresAt > Date.now() + 30_000
  ) {
    return cachedToken.token;
  }

  const response = await fetch(
    `${TEXTVERIFIED_BASE_URL}/api/pub/v2/auth`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-USERNAME": config.email,
        "X-API-KEY": config.apiKey,
      },
      body: JSON.stringify({}),
      cache: "no-store",
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `TextVerified authentication failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  let payload: TextVerifiedTokenResponse;

  try {
    payload = JSON.parse(text) as TextVerifiedTokenResponse;
  } catch {
    throw new Error("TextVerified returned invalid authentication JSON.");
  }

  const token = extractToken(payload);

  if (!token) {
    throw new Error("TextVerified authentication response contained no token.");
  }

  cachedToken = {
    token,
    expiresAt: Date.now() + 270_000,
  };

  return token;
}

async function textVerifiedRequest<T>(
  config: TextVerifiedConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getTextVerifiedToken(config);

  const response = await fetch(
    `${TEXTVERIFIED_BASE_URL}${path}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    },
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `TextVerified request failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("TextVerified returned invalid JSON.");
  }
}

function extractNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function findNumericField(
  payload: unknown,
  fields: string[],
): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const field of fields) {
    const value = extractNumber(record[field]);

    if (value !== null) {
      return value;
    }
  }

  const nested = record.data;

  if (nested && typeof nested === "object") {
    const nestedRecord = nested as Record<string, unknown>;

    for (const field of fields) {
      const value = extractNumber(nestedRecord[field]);

      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}

function extractInventory(
  payload: TextVerifiedInventoryResponse,
): number | null {
  const direct = findNumericField(
    payload,
    ["count", "available", "quantity", "availableQuantity"],
  );

  if (direct !== null) {
    return direct;
  }

  if (Array.isArray(payload.inventory)) {
    return payload.inventory.length;
  }

  if (Array.isArray(payload.data)) {
    return payload.data.length;
  }

  return null;
}

function extractPrice(
  payload: TextVerifiedPricingResponse,
): number | null {
  return findNumericField(
    payload,
    ["price", "unitPrice", "cost", "amount"],
  );
}

function extractServices(payload: unknown): TextVerifiedService[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is TextVerifiedService =>
        Boolean(item) && typeof item === "object",
    );
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;

  for (const key of ["services", "data", "results"]) {
    if (Array.isArray(record[key])) {
      return record[key].filter(
        (item): item is TextVerifiedService =>
          Boolean(item) && typeof item === "object",
      );
    }
  }

  return [];
}

function extractServiceKey(service: TextVerifiedService): string | null {
  return (
    service.key ??
    service.slug ??
    service.id ??
    service.name ??
    service.serviceName ??
    null
  );
}

export async function getTextVerifiedCountryServiceOptions(
  config: TextVerifiedConfig,
  country: string,
  service: string,
): Promise<TextVerifiedCatalogOption[]> {
  const normalizedCountry = country.trim().toLowerCase();
  const normalizedService = service.trim().toLowerCase();

  if (!normalizedCountry || !normalizedService) {
    throw new Error("Country and service are required");
  }

  const servicesPayload = await textVerifiedRequest<unknown>(
    config,
    "/api/pub/v2/services?numberType=mobile&reservationType=verification",
  );

  const services = extractServices(servicesPayload);

  const matchingService = services.find((item) => {
    const values = [
      item.name,
      item.serviceName,
      item.key,
      item.slug,
      item.id,
    ]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());

    return values.includes(normalizedService);
  });

  const serviceKey = matchingService
    ? extractServiceKey(matchingService)
    : normalizedService;

  if (!serviceKey) {
    return [];
  }

  const inventoryPayload =
    await textVerifiedRequest<TextVerifiedInventoryResponse>(
      config,
      "/api/pub/v2/inventory/verifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numberType: "mobile",
          serviceName: serviceKey,
          capability: "sms",
          country: normalizedCountry,
        }),
      },
    );

  const pricingPayload =
    await textVerifiedRequest<TextVerifiedPricingResponse>(
      config,
      "/api/pub/v2/pricing/verifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          areaCode: false,
          carrier: false,
          numberType: "mobile",
          serviceName: serviceKey,
          capability: "sms",
          country: normalizedCountry,
        }),
      },
    );

  const stock = extractInventory(inventoryPayload);
  const cost = extractPrice(pricingPayload);

  return [
    {
      supplierOption: serviceKey,
      currency: "USD",
      cost,
      available: stock !== null ? stock > 0 : cost !== null,
      stock,
    },
  ];
}

export function createTextVerifiedCatalogService(
  config: TextVerifiedConfig,
) {
  return {
    getCountryServiceOptions: (
      country: string,
      service: string,
    ) =>
      getTextVerifiedCountryServiceOptions(
        config,
        country,
        service,
      ),

    getServices: () =>
      textVerifiedRequest<unknown>(
        config,
        "/api/pub/v2/services?numberType=mobile&reservationType=verification",
      ),
  };
}
