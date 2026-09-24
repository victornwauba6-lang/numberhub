import { resolveCountry } from "@/lib/catalog/country-resolver";

const FIVESIM_BASE_URL = "https://5sim.net/v1";

export type FiveSimOperatorOption = {
  operator: string;
  currency: "USD";
  cost: number;
  count: number;
  rates: {
    rate?: number;
    rate1?: number;
    rate3?: number;
    rate24?: number;
    rate72?: number;
    rate168?: number;
    rate720?: number;
  };
};

export type FiveSimCatalogEntry = {
  country: string;
  service: string;
  operators: FiveSimOperatorOption[];
};

function extractMessage(body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message?: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }

  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }

  return "5SIM request failed.";
}

async function fiveSimRequest(
  apiKey: string,
  endpoint: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${FIVESIM_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();

    let body: unknown = null;

    if (text.trim()) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { rawText: text };
      }
    }

    if (!response.ok) {
      throw new Error(
        `5SIM API ${response.status}: ${extractMessage(body)}`,
      );
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function toNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

type FiveSimCountryMap = Map<string, string>;

let fiveSimCountryMapCache: {
  expiresAt: number;
  map: FiveSimCountryMap;
} | null = null;

async function getFiveSimSupplierCountryMap(
  apiKey: string,
): Promise<FiveSimCountryMap> {
  const now = Date.now();

  if (
    fiveSimCountryMapCache &&
    fiveSimCountryMapCache.expiresAt > now
  ) {
    return fiveSimCountryMapCache.map;
  }

  const body = await fiveSimRequest(apiKey, "/guest/prices");
  const map: FiveSimCountryMap = new Map();

  if (isRecord(body)) {
    for (const supplierCountry of Object.keys(body)) {
      const normalizedSupplierCountry = supplierCountry.trim().toLowerCase();

      if (!normalizedSupplierCountry) {
        continue;
      }

      const resolved = resolveCountry(normalizedSupplierCountry);

      if (resolved?.iso2) {
        map.set(resolved.iso2.toLowerCase(), normalizedSupplierCountry);
      }

      map.set(normalizedSupplierCountry, normalizedSupplierCountry);
    }
  }

  fiveSimCountryMapCache = {
    expiresAt: now + 5 * 60 * 1000,
    map,
  };

  return map;
}

async function normalizeFiveSimCountry(
  apiKey: string,
  input?: string,
): Promise<string | undefined> {
  const normalizedInput = input?.trim().toLowerCase();

  if (!normalizedInput) {
    return undefined;
  }

  const map = await getFiveSimSupplierCountryMap(apiKey);

  const direct = map.get(normalizedInput);

  if (direct) {
    return direct;
  }

  const resolved = resolveCountry(normalizedInput);

  if (resolved?.iso2) {
    const supplierCountry = map.get(resolved.iso2.toLowerCase());

    if (supplierCountry) {
      return supplierCountry;
    }
  }

  return normalizedInput;
}

export async function getFiveSimFullCatalogSnapshot(): Promise<
  FiveSimCatalogEntry[]
> {
  const apiKey = process.env.FIVESIM_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("FIVESIM_API_KEY is not configured");
  }

  const body = await fiveSimRequest(apiKey, "/guest/prices");

  if (!isRecord(body)) {
    return [];
  }

  const results: FiveSimCatalogEntry[] = [];

  for (const [countryCode, countryValue] of Object.entries(body)) {
    if (!isRecord(countryValue)) {
      continue;
    }

    for (const [serviceSlug, serviceValue] of Object.entries(countryValue)) {
      if (!isRecord(serviceValue)) {
        continue;
      }

      const operators: FiveSimOperatorOption[] = [];

      for (const [operator, operatorValue] of Object.entries(serviceValue)) {
        if (!isRecord(operatorValue)) {
          continue;
        }

        const cost = toNumber(operatorValue.cost);
        const count = toNumber(operatorValue.count);

        if (cost === null || count === null) {
          continue;
        }

        operators.push({
          operator,
          currency: "USD",
          cost,
          count,
          rates: {
            rate: toNumber(operatorValue.rate) ?? undefined,
            rate1: toNumber(operatorValue.rate1) ?? undefined,
            rate3: toNumber(operatorValue.rate3) ?? undefined,
            rate24: toNumber(operatorValue.rate24) ?? undefined,
            rate72: toNumber(operatorValue.rate72) ?? undefined,
            rate168: toNumber(operatorValue.rate168) ?? undefined,
            rate720: toNumber(operatorValue.rate720) ?? undefined,
          },
        });
      }

      operators.sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return a.cost - b.cost;
      });

      results.push({
        country: countryCode,
        service: serviceSlug,
        operators,
      });
    }
  }

  return results;
}

export async function getFiveSimCatalog(
  country?: string,
  service?: string,
): Promise<FiveSimCatalogEntry[]> {
  const apiKey = process.env.FIVESIM_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("FIVESIM_API_KEY is not configured");
  }

  const countryInput = country?.trim().toLowerCase();

  const normalizedCountry = await normalizeFiveSimCountry(
    apiKey,
    countryInput,
  );
  const normalizedService = service?.trim().toLowerCase();

  let endpoint = "/guest/prices";

  if (normalizedCountry && normalizedService) {
    endpoint +=
      `?country=${encodeURIComponent(normalizedCountry)}` +
      `&product=${encodeURIComponent(normalizedService)}`;
  }

  const body = await fiveSimRequest(apiKey, endpoint);

  if (!isRecord(body)) {
    return [];
  }

  const results: FiveSimCatalogEntry[] = [];

  for (const [countryCode, countryValue] of Object.entries(body)) {
    if (!isRecord(countryValue)) {
      continue;
    }

    for (const [serviceSlug, serviceValue] of Object.entries(countryValue)) {
      if (!isRecord(serviceValue)) {
        continue;
      }

      if (
        normalizedCountry &&
        !(
          countryCode.toLowerCase() === normalizedCountry ||
          (countryInput && countryCode.toLowerCase() === countryInput)
        )
      ) {
        continue;
      }

      if (
        normalizedService &&
        serviceSlug.toLowerCase() !== normalizedService
      ) {
        continue;
      }

      const operators: FiveSimOperatorOption[] = [];

      for (const [operator, operatorValue] of Object.entries(
        serviceValue,
      )) {
        if (!isRecord(operatorValue)) {
          continue;
        }

        const cost = toNumber(operatorValue.cost);
        const count = toNumber(operatorValue.count);

        if (cost === null || count === null) {
          continue;
        }

        operators.push({
          operator,
          currency: "USD",
          cost,
          count,
          rates: {
            rate: toNumber(operatorValue.rate) ?? undefined,
            rate1: toNumber(operatorValue.rate1) ?? undefined,
            rate3: toNumber(operatorValue.rate3) ?? undefined,
            rate24: toNumber(operatorValue.rate24) ?? undefined,
            rate72: toNumber(operatorValue.rate72) ?? undefined,
            rate168: toNumber(operatorValue.rate168) ?? undefined,
            rate720: toNumber(operatorValue.rate720) ?? undefined,
          },
        });
      }

      operators.sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return a.cost - b.cost;
      });

      results.push({
        country: countryCode,
        service: serviceSlug,
        operators,
      });
    }
  }

  return results;
}

export async function getFiveSimCountryServiceOptions(
  country: string,
  service: string,
): Promise<FiveSimOperatorOption[]> {
  const countryInput = country.trim().toLowerCase();

  const apiKey = process.env.FIVESIM_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("FIVESIM_API_KEY is not configured");
  }

  const normalizedCountry = await normalizeFiveSimCountry(
    apiKey,
    countryInput,
  );

  const normalizedService = service.trim().toLowerCase();

  const entries = await getFiveSimCatalog(country, service);

  return entries.find(
    (entry) =>
      entry.country.toLowerCase() === normalizedCountry &&
      entry.service.toLowerCase() === normalizedService,
  )?.operators ?? [];
}
