const BASE_URL = "https://smsbulk.net/api/v1";
const CACHE_MS = 5 * 60 * 1000;

type Service = { code: string; slug: string; name: string };
type CountryOffer = {
  isoCode: string;
  slug?: string;
  name?: string;
  price: string | number;
  currency?: string;
  stock?: number;
  availability?: string;
};

let serviceCache: { expiresAt: number; services: Service[] } | null = null;
const countryCache = new Map<
  string,
  { expiresAt: number; countries: CountryOffer[] }
>();

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const SERVICE_ALIASES: Record<string, string[]> = {
  whatsapp: ["whatsapp"],
  telegram: ["telegram"],
  facebook: ["facebook"],
  "facebook-meta-viewpoints": ["facebook"],
  google: ["google"],
  "google-gmail": ["google"],
  tiktok: ["tiktok"],
  instagram: ["instagram"],
  "instagram-threads": ["instagram"],
  amazon: ["amazon"],
  twitter: ["twitter", "x"],
  "x-twitter": ["twitter", "x"],
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`SMSBulk catalogue request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

async function getServices(): Promise<Service[]> {
  if (serviceCache && serviceCache.expiresAt > Date.now()) {
    return serviceCache.services;
  }
  const response = await getJson<{ data?: Service[] } | Service[]>("/services");
  const services = Array.isArray(response)
    ? response
    : Array.isArray(response.data) ? response.data : [];
  serviceCache = { services, expiresAt: Date.now() + CACHE_MS };
  return services;
}

async function getCountries(slug: string): Promise<CountryOffer[]> {
  const cached = countryCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.countries;

  const response = await getJson<{ countries?: CountryOffer[] }>(
    `/services/${encodeURIComponent(slug)}/countries`,
  );
  const countries = Array.isArray(response.countries) ? response.countries : [];
  countryCache.set(slug, { countries, expiresAt: Date.now() + CACHE_MS });
  return countries;
}

export function createSmsBulkCatalogService() {
  return {
    async getCountryServiceOptions(country: string, service: string) {
      const requested = normalize(service);
      const aliases = SERVICE_ALIASES[requested] ?? [requested];
      const services = await getServices();
      const match = services.find((item) =>
        aliases.some((alias) =>
          normalize(item.name) === alias ||
          normalize(item.slug).replace(/-verification$/, "") === alias
        )
      );

      if (!match) return [];

      const wantedCountry = normalize(country);
      const countries = await getCountries(match.slug);
      const offer = countries.find((item) =>
        item.isoCode?.toUpperCase() === country.trim().toUpperCase() ||
        normalize(item.slug ?? "") === wantedCountry ||
        normalize(item.name ?? "") === wantedCountry
      );

      if (!offer) return [];

      const price = Number(offer.price);
      const stock = Number(offer.stock ?? 0);
      const available =
        String(offer.availability ?? "").toLowerCase() === "ok" && stock > 0;

      return [{
        // The adapter uses this actual code when purchasing.
        supplierOption: match.code,
        currency: offer.currency || "USD",
        cost: Number.isFinite(price) && price > 0 ? price : null,
        available,
        stock: Number.isFinite(stock) ? stock : null,
      }];
    },

    async getServices() {
      const services = await getServices();
      return services.map((item) => ({
        key: item.code,
        id: normalize(item.name).replace(/-verification$/, ""),
        name: item.name,
      }));
    },
  };
}
