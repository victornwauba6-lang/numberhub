import {
  getConfiguredSupplierCatalogServices,
} from "@/lib/suppliers/catalog/catalog-loader";
import {
  calculateCustomerPrice,
} from "@/lib/pricing/pricing-engine";

export type GlobalCatalogOption = {
  optionId: string;
  supplier: string;
  supplierOption: string;
  currency: string;
  cost: number | null;
  customerPriceMinor: number | null;
  customerPriceNgn: number | null;
  pricingSource: "manual_override" | "automatic_rule" | "unpriced";
  available: boolean;
  stock: number | null;
  rates?: Record<string, number>;
};

export type GlobalCatalogResult = {
  country: string;
  service: string;
  options: GlobalCatalogOption[];
  supplierErrors: Array<{
    supplier: string;
    error: string;
  }>;
};

export async function getGlobalCatalog(
  country: string,
  service: string,
): Promise<GlobalCatalogResult> {
  const normalizedCountry = country.trim().toLowerCase();
  const normalizedService = service.trim().toLowerCase();

  if (!normalizedCountry || !normalizedService) {
    throw new Error("Country and service are required");
  }

  const options: GlobalCatalogOption[] = [];
  const supplierErrors: GlobalCatalogResult["supplierErrors"] = [];

  const catalogServices =
    getConfiguredSupplierCatalogServices();

  await Promise.all(
    catalogServices.map(async (catalogService) => {
      try {
        const supplierOptions =
          await catalogService.getCountryServiceOptions(
            normalizedCountry,
            normalizedService,
          );

        for (const option of supplierOptions) {
          const pricing = await calculateCustomerPrice({
            supplier: catalogService.slug,
            supplierOption: option.supplierOption,
            cost: option.cost,
            currency: option.currency,
            country: normalizedCountry,
            service: normalizedService,
          });

          options.push({
            optionId:
              `${catalogService.slug}:${normalizedCountry}:${normalizedService}:${option.supplierOption}`,
            supplier: catalogService.slug,
            supplierOption: option.supplierOption,
            currency: option.currency,
            cost: option.cost,
            customerPriceMinor: pricing.customerPriceMinor,
            customerPriceNgn: pricing.customerPriceNgn,
            pricingSource: pricing.pricingSource,
            available: option.available,
            stock: option.stock,
            rates: option.rates,
          });
        }
      } catch (error) {
        supplierErrors.push({
          supplier: catalogService.slug,
          error:
            error instanceof Error
              ? error.message
              : "Supplier catalog request failed.",
        });
      }
    }),
  );

  options.sort((a, b) => {
    if (a.available !== b.available) {
      return a.available ? -1 : 1;
    }

    if (
      a.customerPriceNgn !== null &&
      b.customerPriceNgn !== null &&
      a.customerPriceNgn !== b.customerPriceNgn
    ) {
      return a.customerPriceNgn - b.customerPriceNgn;
    }

    return a.optionId.localeCompare(b.optionId);
  });

  return {
    country: normalizedCountry,
    service: normalizedService,
    options,
    supplierErrors,
  };
}
