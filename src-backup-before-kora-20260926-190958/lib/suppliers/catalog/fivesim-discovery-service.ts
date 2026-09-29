import { getFiveSimCatalog } from "@/lib/suppliers/catalog/fivesim-catalog-service";
import { resolveCountry } from "@/lib/catalog/country-resolver";
import { isCustomerFacingService } from "@/lib/catalog/service-filter";

export type FiveSimDiscoveredCountry = {
  supplierCountry: string;
  iso2: string | null;
  name: string | null;
  services: string[];
};

export async function discoverFiveSimCatalog(): Promise<
  FiveSimDiscoveredCountry[]
> {
  const catalog = await getFiveSimCatalog("", "");

  const countries = new Map<
    string,
    {
      supplierCountry: string;
      iso2: string | null;
      name: string | null;
      services: Set<string>;
    }
  >();

  for (const entry of catalog) {
    const supplierCountry = entry.country.trim().toLowerCase();
    const service = entry.service.trim().toLowerCase();

    if (!supplierCountry || !service) {
      continue;
    }

    if (!isCustomerFacingService(service)) {
      continue;
    }

    const resolved = resolveCountry(supplierCountry);

    const key = resolved?.iso2 ?? `supplier:${supplierCountry}`;

    if (!countries.has(key)) {
      countries.set(key, {
        supplierCountry,
        iso2: resolved?.iso2 ?? null,
        name: resolved?.name ?? null,
        services: new Set(),
      });
    }

    countries.get(key)!.services.add(service);
  }

  return Array.from(countries.values())
    .map((country) => ({
      supplierCountry: country.supplierCountry,
      iso2: country.iso2,
      name: country.name,
      services: Array.from(country.services).sort(),
    }))
    .sort((a, b) => {
      const aName = a.name ?? a.supplierCountry;
      const bName = b.name ?? b.supplierCountry;

      return aName.localeCompare(bName);
    });
}
