import { discoverFiveSimCatalog } from "@/lib/suppliers/catalog/fivesim-discovery-service";
import { getConfiguredSupplierCatalogServices } from "@/lib/suppliers/catalog/catalog-loader";
import { resolveCountry } from "@/lib/catalog/country-resolver";
import { isCustomerFacingService } from "@/lib/catalog/service-filter";

export type UnifiedDiscoveredCountry = {
  iso2: string | null;
  name: string | null;
  supplierCountries: string[];
  suppliers: string[];
  services: string[];
};

export type UnifiedDiscoveredService = {
  key: string;
  name: string;
  description: string | null;
  capability: string | null;
  suppliers: string[];
};

export type UnifiedDiscoveryResult = {
  countries: UnifiedDiscoveredCountry[];
  services: UnifiedDiscoveredService[];
  supplierErrors: Array<{
    supplier: string;
    error: string;
  }>;
};

type DiscoveredServiceRecord = {
  key: string;
  name: string;
  description: string | null;
  capability: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(
  record: Record<string, unknown>,
  keys: string[],
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
    if (Array.isArray(body[key])) {
      return body[key];
    }
  }

  return [];
}

function normalizeDiscoveredServices(
  body: unknown,
  supplier: string,
): UnifiedDiscoveredService[] {
  const services = new Map<string, UnifiedDiscoveredService>();

  for (const item of extractServices(body)) {
    if (!isRecord(item)) {
      continue;
    }

    const key = getString(item, ["key", "slug", "id", "serviceName", "name"]);

    if (!key) {
      continue;
    }

    const name =
      getString(item, ["name", "serviceName", "displayName"]) ?? key;

    const description = getString(item, [
      "description",
      "serviceDescription",
    ]);

    const capability = getString(item, [
      "capability",
      "capabilities",
      "type",
    ]);

    const normalizedKey = key.toLowerCase();

    if (!isCustomerFacingService(normalizedKey)) {
      continue;
    }

    if (!services.has(normalizedKey)) {
      services.set(normalizedKey, {
        key,
        name,
        description,
        capability,
        suppliers: [supplier],
      });
    }
  }

  return Array.from(services.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export async function discoverUnifiedCatalog(): Promise<UnifiedDiscoveryResult> {
  const countryMap = new Map<
    string,
    {
      iso2: string | null;
      name: string | null;
      supplierCountries: Set<string>;
      suppliers: Set<string>;
      services: Set<string>;
    }
  >();

  const serviceMap = new Map<
    string,
    {
      key: string;
      name: string;
      description: string | null;
      capability: string | null;
      suppliers: Set<string>;
    }
  >();

  const supplierErrors: UnifiedDiscoveryResult["supplierErrors"] = [];

  const catalogServices = getConfiguredSupplierCatalogServices();

  try {
    const fiveSimCountries = await discoverFiveSimCatalog();

    for (const country of fiveSimCountries) {
      const resolved = country.iso2
        ? resolveCountry(country.iso2)
        : null;

      const key =
        resolved?.iso2 ??
        country.iso2 ??
        `supplier:${country.supplierCountry}`;

      if (!countryMap.has(key)) {
        countryMap.set(key, {
          iso2: resolved?.iso2 ?? country.iso2,
          name: resolved?.name ?? country.name,
          supplierCountries: new Set(),
          suppliers: new Set(),
          services: new Set(),
        });
      }

      const target = countryMap.get(key)!;

      target.supplierCountries.add(country.supplierCountry);
      target.suppliers.add("fivesim");

      for (const service of country.services) {
        const normalizedService = service.trim().toLowerCase();

        if (!normalizedService) {
          continue;
        }

        target.services.add(normalizedService);

        const existingService = serviceMap.get(normalizedService);

        if (!existingService) {
          serviceMap.set(normalizedService, {
            key: normalizedService,
            name: normalizedService,
            description: null,
            capability: "sms",
            suppliers: new Set(["fivesim"]),
          });
        } else {
          existingService.suppliers.add("fivesim");
        }
      }
    }
  } catch (error) {
    supplierErrors.push({
      supplier: "fivesim",
      error:
        error instanceof Error
          ? error.message
          : "5SIM discovery failed.",
    });
  }

  for (const catalogService of catalogServices) {
    if (!catalogService.getServices) {
      continue;
    }

    try {
      const body = await catalogService.getServices();
      const discoveredServices = normalizeDiscoveredServices(
        body,
        catalogService.slug,
      );

      for (const service of discoveredServices) {
        const normalizedKey = service.key.toLowerCase();

        if (!serviceMap.has(normalizedKey)) {
          serviceMap.set(normalizedKey, {
            key: service.key,
            name: service.name,
            description: service.description,
            capability: service.capability,
            suppliers: new Set(),
          });
        }

        const target = serviceMap.get(normalizedKey)!;
        target.suppliers.add(catalogService.slug);
      }
    } catch (error) {
      supplierErrors.push({
        supplier: catalogService.slug,
        error:
          error instanceof Error
            ? error.message
            : `${catalogService.slug} service discovery failed.`,
      });
    }
  }

  return {
    countries: Array.from(countryMap.values())
      .map((country) => ({
        iso2: country.iso2,
        name: country.name,
        supplierCountries: Array.from(country.supplierCountries).sort(),
        suppliers: Array.from(country.suppliers).sort(),
        services: Array.from(country.services).sort(),
      }))
      .sort((a, b) => {
        const aName = a.name ?? a.supplierCountries[0] ?? "";
        const bName = b.name ?? b.supplierCountries[0] ?? "";

        return aName.localeCompare(bName);
      }),

    services: Array.from(serviceMap.values())
      .map((service) => ({
        key: service.key,
        name: service.name,
        description: service.description,
        capability: service.capability,
        suppliers: Array.from(service.suppliers).sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),

    supplierErrors,
  };
}



export async function syncDiscoveredCatalog(
  db: {
    query: <T = unknown>(
      text: string,
      values?: unknown[],
    ) => Promise<{ rows: T[] }>;
  },
): Promise<{
  discoveredCountries: number;
  discoveredServices: number;
  discoveredPairs: number;
  createdCountries: number;
  existingCountries: number;
  skippedCountries: number;
  createdServices: number;
  existingServices: number;
  createdProducts: number;
  existingProducts: number;
  skippedPairs: number;
  unresolvedCountries: string[];
}> {
  const discovery = await discoverUnifiedCatalog();

  let createdCountries = 0;
  let existingCountries = 0;
  let skippedCountries = 0;
  let createdServices = 0;
  let existingServices = 0;
  let createdProducts = 0;
  let existingProducts = 0;
  let skippedPairs = 0;

  const unresolvedCountries: string[] = [];

  const maxCountryOrderResult = await db.query<{ max: number | null }>(
    `
      SELECT COALESCE(MAX(sort_order), 0)::int AS max
      FROM countries
      WHERE is_test = false
    `,
  );

  let nextCountrySortOrder =
    Number(maxCountryOrderResult.rows[0]?.max ?? 0) + 1;

  const countryIds = new Map<string, string>();

  /*
   * STEP 1:
   * Synchronize every resolved supplier country.
   */
  for (const country of discovery.countries) {
    if (!country.iso2 || !country.name) {
      skippedCountries += 1;
      unresolvedCountries.push(
        country.supplierCountries.join(", ") || "unknown",
      );
      continue;
    }

    const code = country.iso2.trim().toUpperCase();
    const name = country.name.trim();

    if (!/^[A-Z]{2}$/.test(code) || !name) {
      skippedCountries += 1;
      unresolvedCountries.push(
        country.supplierCountries.join(", ") || code || "unknown",
      );
      continue;
    }

    const existingResult = await db.query<{ id: string }>(
      `
        SELECT id
        FROM countries
        WHERE UPPER(code) = UPPER($1)
           OR LOWER(name) = LOWER($2)
        LIMIT 1
      `,
      [code, name],
    );

    if (existingResult.rows[0]) {
      const id = existingResult.rows[0].id;

      await db.query(
        `
          UPDATE countries
          SET
            code = UPPER($1),
            name = $2,
            is_active = true,
            is_test = false,
            updated_at = NOW()
          WHERE id = $3
        `,
        [code, name, id],
      );

      countryIds.set(code, id);
      existingCountries += 1;
      continue;
    }

    const inserted = await db.query<{ id: string }>(
      `
        INSERT INTO countries (
          code,
          name,
          flag_emoji,
          is_active,
          sort_order,
          is_test
        )
        VALUES (
          UPPER($1),
          $2,
          NULL,
          $4,
          $3,
          false
        )
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          is_active = EXCLUDED.is_active,
          is_test = false,
          updated_at = NOW()
        RETURNING id
      `,
      [code, name, nextCountrySortOrder],
    );

    if (inserted.rows[0]) {
      countryIds.set(code, inserted.rows[0].id);
      createdCountries += 1;
      nextCountrySortOrder += 1;
    } else {
      skippedCountries += 1;
    }
  }

  /*
   * STEP 2:
   * Synchronize every discovered service.
   *
   * We use slug as the stable identity so existing service IDs
   * and existing orders remain intact.
   */
  const serviceIds = new Map<string, string>();

  const maxServiceOrderResult = await db.query<{ max: number | null }>(
    `
      SELECT COALESCE(MAX(sort_order), 0)::int AS max
      FROM services
      WHERE is_test = false
    `,
  );

  let nextServiceSortOrder =
    Number(maxServiceOrderResult.rows[0]?.max ?? 0) + 1;

  for (const service of discovery.services) {
    const slug = service.key.trim().toLowerCase();
    const name = (service.name || service.key).trim();

    if (!slug || !name) {
      continue;
    }

    const existingResult = await db.query<{
      id: string;
      is_test: boolean;
    }>(
      `
        SELECT id, is_test
        FROM services
        WHERE LOWER(slug) = LOWER($1)
        LIMIT 1
      `,
      [slug],
    );

    if (existingResult.rows[0]) {
      const id = existingResult.rows[0].id;

      await db.query(
        `
          UPDATE services
          SET
            name = $1,
            is_active = $3,
            is_test = false,
            updated_at = NOW()
          WHERE id = $2
        `,
        [name.slice(0, 100), id, isCustomerFacingService(slug)],
      );

      serviceIds.set(slug, id);
      existingServices += 1;
      continue;
    }

    const inserted = await db.query<{ id: string }>(
      `
        INSERT INTO services (
          slug,
          name,
          icon,
          is_active,
          sort_order,
          is_test
        )
        VALUES (
          $1,
          $2,
          NULL,
          true,
          $3,
          false
        )
        ON CONFLICT (slug)
        DO UPDATE SET
          name = EXCLUDED.name,
          is_active = true,
          is_test = false,
          updated_at = NOW()
        RETURNING id
      `,
      [
        slug.slice(0, 100),
        name.slice(0, 100),
        nextServiceSortOrder,
      ],
    );

    if (inserted.rows[0]) {
      serviceIds.set(slug, inserted.rows[0].id);
      createdServices += 1;
      nextServiceSortOrder += 1;
    }
  }

  /*
   * STEP 3:
   * Create the country/service product relationships.
   *
   * This does NOT call suppliers and does NOT create fake options.
   * It only records that the supplier discovery says the pair exists.
   */
  for (const country of discovery.countries) {
    if (!country.iso2) {
      continue;
    }

    const countryCode = country.iso2.trim().toUpperCase();
    const countryId = countryIds.get(countryCode);

    if (!countryId) {
      continue;
    }

    for (const serviceSlugRaw of country.services) {
      const serviceSlug = serviceSlugRaw.trim().toLowerCase();
      const serviceId = serviceIds.get(serviceSlug);

      if (!serviceId) {
        skippedPairs += 1;
        continue;
      }

      const existingProduct = await db.query<{ id: string }>(
        `
          SELECT id
          FROM products
          WHERE country_id = $1
            AND service_id = $2
          LIMIT 1
        `,
        [countryId, serviceId],
      );

      if (existingProduct.rows[0]) {
        await db.query(
          `
            UPDATE products
            SET
              is_active = true,
              updated_at = NOW()
            WHERE id = $1
          `,
          [existingProduct.rows[0].id],
        );

        existingProducts += 1;
        continue;
      }

      await db.query(
        `
          INSERT INTO products (
            country_id,
            service_id,
            is_active
          )
          VALUES ($1, $2, true)
          ON CONFLICT (country_id, service_id)
          DO UPDATE SET
            is_active = true,
            updated_at = NOW()
        `,
        [countryId, serviceId],
      );

      createdProducts += 1;
    }
  }

  const discoveredPairs = discovery.countries.reduce(
    (total, country) => total + country.services.length,
    0,
  );

  return {
    discoveredCountries: discovery.countries.length,
    discoveredServices: discovery.services.length,
    discoveredPairs,
    createdCountries,
    existingCountries,
    skippedCountries,
    createdServices,
    existingServices,
    createdProducts,
    existingProducts,
    skippedPairs,
    unresolvedCountries,
  };
}

export async function syncDiscoveredCountries(
  db: {
    query: <T = unknown>(
      text: string,
      values?: unknown[],
    ) => Promise<{ rows: T[] }>;
  },
): Promise<{
  discovered: number;
  created: number;
  existing: number;
  skipped: number;
}> {
  const discovery = await discoverUnifiedCatalog();

  let created = 0;
  let existing = 0;
  let skipped = 0;

  const maxOrderResult = await db.query<{ max: number | null }>(
    `
      SELECT COALESCE(MAX(sort_order), 0)::int AS max
      FROM countries
      WHERE is_test = false
    `,
  );

  let nextSortOrder = Number(maxOrderResult.rows[0]?.max ?? 0) + 1;

  for (const country of discovery.countries) {
    if (!country.iso2 || !country.name) {
      skipped += 1;
      continue;
    }

    const code = country.iso2.trim().toUpperCase();
    const name = country.name.trim();

    if (!/^[A-Z]{2}$/.test(code) || !name) {
      skipped += 1;
      continue;
    }

    const existingResult = await db.query<{ id: string }>(
      `
        SELECT id
        FROM countries
        WHERE LOWER(code) = LOWER($1)
           OR LOWER(name) = LOWER($2)
        LIMIT 1
      `,
      [code, name],
    );

    if (existingResult.rows[0]) {
      existing += 1;

      await db.query(
        `
          UPDATE countries
          SET
            code = UPPER($1),
            name = $2,
            is_active = true,
            is_test = false,
            updated_at = NOW()
          WHERE id = $3
        `,
        [code, name, existingResult.rows[0].id],
      );

      continue;
    }

    await db.query(
      `
        INSERT INTO countries (
          code,
          name,
          flag_emoji,
          is_active,
          sort_order,
          is_test
        )
        VALUES (
          UPPER($1),
          $2,
          NULL,
          true,
          $3,
          false
        )
        ON CONFLICT (code) DO NOTHING
      `,
      [code, name, nextSortOrder],
    );

    nextSortOrder += 1;
    created += 1;
  }

  return {
    discovered: discovery.countries.length,
    created,
    existing,
    skipped,
  };
}
