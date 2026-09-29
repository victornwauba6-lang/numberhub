import {
  createTextVerifiedCatalogService,
} from "@/lib/suppliers/catalog/textverified-catalog-service";

export type TextVerifiedDiscoveredService = {
  key: string;
  name: string;
  description: string | null;
  capability: string | null;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object";
}

function getString(
  record: UnknownRecord,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function extractServices(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    return body;
  }

  if (!isRecord(body)) {
    return [];
  }

  for (const key of ["services", "data", "results"]) {
    const value = body[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

export async function discoverTextVerifiedServices(): Promise<
  TextVerifiedDiscoveredService[]
> {
  const email = process.env.TEXTVERIFIED_EMAIL?.trim();
  const apiKey = process.env.TEXTVERIFIED_API_KEY?.trim();

  if (!email || !apiKey) {
    throw new Error(
      "TEXTVERIFIED_EMAIL and TEXTVERIFIED_API_KEY are not configured",
    );
  }

  const catalog = createTextVerifiedCatalogService({
    email,
    apiKey,
  });

  const services = await catalog.getServices();

  const discovered: TextVerifiedDiscoveredService[] = [];

  for (const item of extractServices(services)) {
    if (!isRecord(item)) {
      continue;
    }

    const key =
      getString(
        item,
        "key",
        "slug",
        "id",
        "serviceName",
        "name",
      );

    if (!key) {
      continue;
    }

    const name =
      getString(
        item,
        "name",
        "serviceName",
        "displayName",
      ) ?? key;

    discovered.push({
      key,
      name,
      description: getString(item, "description"),
      capability: getString(item, "capability"),
    });
  }

  const unique = new Map<string, TextVerifiedDiscoveredService>();

  for (const service of discovered) {
    unique.set(service.key.toLowerCase(), service);
  }

  return Array.from(unique.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
