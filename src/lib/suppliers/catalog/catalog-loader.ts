import {
  getFiveSimCountryServiceOptions,
} from "@/lib/suppliers/catalog/fivesim-catalog-service";
import {
  createTextVerifiedCatalogService,
} from "@/lib/suppliers/catalog/textverified-catalog-service";
import {
  createSmsPoolCatalogService,
} from "@/lib/suppliers/catalog/smspool-catalog-service";

export type SupplierDiscoveredService = {
  key: string;
  id: string;
  name: string;
};

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
  getServices?: () => Promise<SupplierDiscoveredService[]>;
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

const smsPoolApiKey = process.env.SMSPOOL_API_KEY?.trim();

if (smsPoolApiKey) {
  const smsPoolCatalog =
    createSmsPoolCatalogService(smsPoolApiKey);

  configuredCatalogServices.push({
    slug: "smspool",
    getCountryServiceOptions:
      smsPoolCatalog.getCountryServiceOptions,
    getServices: smsPoolCatalog.getServices,
  });
}

export function getConfiguredSupplierCatalogServices() {
  return configuredCatalogServices;
}
