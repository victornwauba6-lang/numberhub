import {
  getFiveSimCountryServiceOptions,
} from "@/lib/suppliers/catalog/fivesim-catalog-service";
import {
  createTextVerifiedCatalogService,
} from "@/lib/suppliers/catalog/textverified-catalog-service";

export type SupplierCatalogService = {
  slug: string;
  getCountryServiceOptions: (
    country: string,
    service: string,
  ) => Promise<
    Array<{
      supplierOption: string;
      currency: string;
      cost: number | null;
      available: boolean;
      stock: number | null;
      rates?: Record<string, number>;
    }>
  >;
  getServices?: () => Promise<unknown>;
};

const configuredCatalogServices: SupplierCatalogService[] = [];

const fiveSimApiKey = process.env.FIVESIM_API_KEY?.trim();

if (fiveSimApiKey) {
  configuredCatalogServices.push({
    slug: "fivesim",
    async getCountryServiceOptions(country, service) {
      const options = await getFiveSimCountryServiceOptions(
        country,
        service,
      );

      return options.map((option) => ({
        supplierOption: option.operator,
        currency: option.currency,
        cost: Number.isFinite(option.cost)
          ? option.cost
          : null,
        available: option.count > 0,
        stock: Number.isFinite(option.count)
          ? option.count
          : null,
        rates: option.rates,
      }));
    },
  });
}

const textVerifiedEmail = process.env.TEXTVERIFIED_EMAIL?.trim();
const textVerifiedApiKey = process.env.TEXTVERIFIED_API_KEY?.trim();

if (textVerifiedEmail && textVerifiedApiKey) {
  const textVerifiedCatalog =
    createTextVerifiedCatalogService({
      email: textVerifiedEmail,
      apiKey: textVerifiedApiKey,
    });

  configuredCatalogServices.push({
    slug: "textverified",
    getCountryServiceOptions:
      textVerifiedCatalog.getCountryServiceOptions,
    getServices: textVerifiedCatalog.getServices,
  });
}

export function getConfiguredSupplierCatalogServices() {
  return configuredCatalogServices;
}
