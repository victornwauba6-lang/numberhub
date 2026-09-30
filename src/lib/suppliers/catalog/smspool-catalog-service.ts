const SMSPOOL_BASE_URL = "https://api.smspool.net";

type SmsPoolCountry = {
  ID?: number;
  name?: string;
  short_name?: string;
  cc?: string;
  region?: string;
};

type SmsPoolService = {
  ID?: number;
  name?: string;
  favourite?: number;
};

type SmsPoolApiResponse = {
  status: number;
  text: string;
};

export type SmsPoolCatalogOption = {
  supplierOption: string;
  currency: "USD";
  cost: number | null;
  available: boolean;
  stock: number | null;
};

async function smsPoolRequest(
  apiKey: string,
  endpoint: string,
  params: Record<string, string> = {},
): Promise<SmsPoolApiResponse> {
  const response = await fetch(`${SMSPOOL_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      key: apiKey,
      ...params,
    }),
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `SMSPool request failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  return {
    status: response.status,
    text,
  };
}

function parseJson<T>(response: SmsPoolApiResponse, description: string): T {
  try {
    return JSON.parse(response.text) as T;
  } catch {
    throw new Error(`SMSPool returned invalid JSON for ${description}.`);
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function isWhatsAppService(service: SmsPoolService): boolean {
  const name = normalize(service.name ?? "");
  return name === "whatsapp" || name.startsWith("whatsapp ");
}

function parsePrice(text: string): number | null {
  try {
    const payload = JSON.parse(text) as Record<string, unknown>;

    const value = payload.price;

    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch {
    return null;
  }

  return null;
}

let cachedCountries:
  | {
      expiresAt: number;
      countries: SmsPoolCountry[];
    }
  | null = null;

let cachedServices:
  | {
      expiresAt: number;
      services: SmsPoolService[];
    }
  | null = null;

const CACHE_TTL_MS = 10 * 60 * 1000;

async function getCountries(apiKey: string): Promise<SmsPoolCountry[]> {
  if (cachedCountries && cachedCountries.expiresAt > Date.now()) {
    return cachedCountries.countries;
  }

  const response = await smsPoolRequest(apiKey, "/country/retrieve_all");
  const countries = parseJson<SmsPoolCountry[]>(
    response,
    "country list",
  );

  cachedCountries = {
    countries: Array.isArray(countries) ? countries : [],
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return cachedCountries.countries;
}

async function getServices(apiKey: string): Promise<SmsPoolService[]> {
  if (cachedServices && cachedServices.expiresAt > Date.now()) {
    return cachedServices.services;
  }

  const response = await smsPoolRequest(apiKey, "/service/retrieve_all");
  const services = parseJson<SmsPoolService[]>(
    response,
    "service list",
  );

  cachedServices = {
    services: Array.isArray(services) ? services : [],
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return cachedServices.services;
}

const CANONICAL_SERVICE_ALIASES: Record<string, string> = {
  facebook: "facebook",
  "facebook-meta-viewpoints": "facebook",
  instagram: "instagram",
  "instagram-threads": "instagram",
  telegram: "telegram",
  tiktok: "tiktok",
  twitter: "twitter",
  "x-twitter": "twitter",
  google: "google",
  "google-gmail": "google",
  amazon: "amazon",
  ebay: "ebay",
  whatsapp: "whatsapp",
};

function serviceSlug(service: SmsPoolService): string | null {
  if (!service.name || service.ID === undefined || service.ID === null) {
    return null;
  }

  const generated = slugify(service.name);
  if (!generated) {
    return null;
  }

  return CANONICAL_SERVICE_ALIASES[generated] ?? generated;
}

function buildUniqueServiceSlugs(
  services: SmsPoolService[],
): Map<string, string> {
  const result = new Map<string, string>();
  const used = new Set<string>();

  for (const service of services) {
    if (service.ID === undefined || service.ID === null) {
      continue;
    }

    const baseSlug = serviceSlug(service);
    if (!baseSlug) {
      continue;
    }

    let uniqueSlug = baseSlug;

    if (used.has(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${service.ID}`;
    }

    while (used.has(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${service.ID}-${used.size}`;
    }

    used.add(uniqueSlug);
    result.set(String(service.ID), uniqueSlug);
  }

  return result;
}

export async function getSmsPoolServices(
  apiKey: string,
): Promise<
  Array<{
    id: string;
    name: string;
  }>
> {
  const services = await getServices(apiKey);
  const uniqueSlugs = buildUniqueServiceSlugs(services);

  const result: Array<{ id: string; name: string }> = [];

  for (const service of services) {
    if (isWhatsAppService(service)) {
      continue;
    }

    const id =
      service.ID !== undefined && service.ID !== null
        ? String(service.ID)
        : null;

    if (!id) {
      continue;
    }

    const slug = uniqueSlugs.get(id);

    if (!slug) {
      continue;
    }

    result.push({
      id,
      name: service.name!.trim(),
    });
  }

  return result;
}

export async function getSmsPoolCountryServiceOptions(
  apiKey: string,
  country: string,
  service: string,
): Promise<SmsPoolCatalogOption[]> {
  const normalizedCountry = country.trim().toUpperCase();
  const normalizedService = normalize(service);

  if (!normalizedCountry || !normalizedService) {
    throw new Error("Country and service are required");
  }

  if (normalizedService === "whatsapp") {
    return [];
  }

  const [countries, services] = await Promise.all([
    getCountries(apiKey),
    getServices(apiKey),
  ]);

  const matchingCountry = countries.find(
    (item) =>
      normalize(item.short_name ?? "") === normalize(normalizedCountry),
  );

  if (!matchingCountry) {
    return [];
  }

  const uniqueSlugs = buildUniqueServiceSlugs(services);

  const matchingServices = services.filter((item) => {
    if (isWhatsAppService(item)) {
      return false;
    }

    if (item.ID === undefined || item.ID === null) {
      return false;
    }

    return uniqueSlugs.get(String(item.ID)) === normalizedService;
  });

  if (matchingServices.length === 0) {
    return [];
  }

  const options: SmsPoolCatalogOption[] = [];

  for (const matchingService of matchingServices) {
    if (matchingService.ID === undefined || matchingService.ID === null) {
      continue;
    }

    const response = await smsPoolRequest(apiKey, "/request/price", {
      country: String(matchingCountry.ID ?? normalizedCountry),
      service: String(matchingService.ID),
    });

    const cost = parsePrice(response.text);

    if (cost === null) {
      continue;
    }

    options.push({
      supplierOption: String(matchingService.ID),
      currency: "USD",
      cost,
      available: true,
      stock: null,
    });
  }

  return options;
}

export function createSmsPoolCatalogService(apiKey: string) {
  const normalizedApiKey = apiKey.trim();

  if (!normalizedApiKey) {
    throw new Error("SMSPOOL_API_KEY is required");
  }

  return {
    getCountryServiceOptions: (
      country: string,
      service: string,
    ) =>
      getSmsPoolCountryServiceOptions(
        normalizedApiKey,
        country,
        service,
      ),

    getServices: async () => {
      const services = await getServices(normalizedApiKey);

      const uniqueSlugs = buildUniqueServiceSlugs(services);

      return services
        .filter((service) => !isWhatsAppService(service))
        .map((service) => ({
          key:
            service.ID !== undefined && service.ID !== null
              ? uniqueSlugs.get(String(service.ID)) ?? null
              : null,
          id:
            service.ID !== undefined && service.ID !== null
              ? String(service.ID)
              : null,
          name: service.name ?? null,
        }))
        .filter(
          (
            service,
          ): service is {
            key: string;
            id: string;
            name: string;
          } => Boolean(service.key && service.id && service.name),
        );
    },
  };
}
