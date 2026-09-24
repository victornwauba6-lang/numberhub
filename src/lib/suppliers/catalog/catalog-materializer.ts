import { db } from "@/lib/db";
import { resolveCountry } from "@/lib/catalog/country-resolver";
import {
  getGlobalCatalog,
  type GlobalCatalogOption,
} from "@/lib/suppliers/catalog/global-catalog-service";

type MaterializeResult = {
  country: string;
  service: string;
  productId: string;
  createdOptions: number;
  updatedOptions: number;
  unavailableOptions: number;
  skippedOptions: number;
  optionIds: string[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function displayOptionName(
  supplier: string,
  supplierOption: string,
): string {
  if (supplier === "textverified") {
    return "Standard";
  }

  return supplierOption
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function getOrCreateProduct(
  client: {
    query: <T = unknown>(
      text: string,
      values?: unknown[],
    ) => Promise<{ rows: T[] }>;
  },
  country: string,
  service: string,
): Promise<string> {
  const resolvedCountry = resolveCountry(country);

  if (!resolvedCountry?.iso2) {
    throw new Error(`Country could not be resolved: ${country}`);
  }

  const countryResult = await client.query<{ id: string }>(
    `
      SELECT id
      FROM countries
      WHERE LOWER(code) = $1
        AND is_active = true
        AND is_test = false
      LIMIT 1
    `,
    [resolvedCountry.iso2.toLowerCase()],
  );

  if (!countryResult.rows[0]) {
    throw new Error(`Country not found: ${country}`);
  }

  const serviceResult = await client.query<{ id: string }>(
    `
      SELECT id
      FROM services
      WHERE LOWER(slug) = $1
        AND is_active = true
        AND is_test = false
      LIMIT 1
    `,
    [service],
  );

  if (!serviceResult.rows[0]) {
    throw new Error(`Service not found: ${service}`);
  }

  const existingProduct = await client.query<{ id: string }>(
    `
      SELECT id
      FROM products
      WHERE country_id = $1
        AND service_id = $2
      LIMIT 1
    `,
    [countryResult.rows[0].id, serviceResult.rows[0].id],
  );

  if (existingProduct.rows[0]) {
    return existingProduct.rows[0].id;
  }

  const createdProduct = await client.query<{ id: string }>(
    `
      INSERT INTO products (
        country_id,
        service_id,
        is_active
      )
      VALUES ($1, $2, true)
      RETURNING id
    `,
    [countryResult.rows[0].id, serviceResult.rows[0].id],
  );

  return createdProduct.rows[0].id;
}

async function findNextOptionNumber(
  client: {
    query: <T = unknown>(
      text: string,
      values?: unknown[],
    ) => Promise<{ rows: T[] }>;
  },
  productId: string,
): Promise<number> {
  const result = await client.query<{ nextNumber: number }>(
    `
      SELECT COALESCE(MAX(option_number), 0) + 1 AS "nextNumber"
      FROM product_options
      WHERE product_id = $1
    `,
    [productId],
  );

  return result.rows[0]?.nextNumber ?? 1;
}

async function findSupplierId(
  client: {
    query: <T = unknown>(
      text: string,
      values?: unknown[],
    ) => Promise<{ rows: T[] }>;
  },
  supplierSlug: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM suppliers
      WHERE slug = $1
        AND is_active = true
        AND is_test = false
      LIMIT 1
    `,
    [supplierSlug],
  );

  if (!result.rows[0]) {
    throw new Error(`Production supplier not found: ${supplierSlug}`);
  }

  return result.rows[0].id;
}

async function upsertOption(
  client: {
    query: <T = unknown>(
      text: string,
      values?: unknown[],
    ) => Promise<{ rows: T[] }>;
  },
  productId: string,
  supplierId: string,
  option: GlobalCatalogOption,
  optionNumber: number,
): Promise<{
  id: string;
  created: boolean;
}> {
  const existing = await client.query<{
    id: string;
    optionNumber: number;
  }>(
    `
      SELECT id, option_number AS "optionNumber"
      FROM product_options
      WHERE product_id = $1
        AND supplier_id = $2
        AND supplier_product_id = $3
      LIMIT 1
    `,
    [productId, supplierId, option.supplierOption],
  );

  if (existing.rows[0]) {
    if (option.customerPriceMinor === null) {
      await client.query(
        `
          UPDATE product_options
          SET
            is_available = false,
            updated_at = NOW()
          WHERE id = $1
        `,
        [existing.rows[0].id],
      );

      return {
        id: existing.rows[0].id,
        created: false,
      };
    }

    await client.query(
      `
        UPDATE product_options
        SET
          name = $1,
          price_minor = $2,
          currency = 'NGN',
          is_active = true,
          is_available = $3,
          supplier_product_id = $4,
          updated_at = NOW()
        WHERE id = $5
      `,
      [
        displayOptionName(option.supplier, option.supplierOption),
        option.customerPriceMinor,
        option.available,
        option.supplierOption,
        existing.rows[0].id,
      ],
    );

    return {
      id: existing.rows[0].id,
      created: false,
    };
  }

  if (option.customerPriceMinor === null) {
    return {
      id: "",
      created: false,
    };
  }

  const created = await client.query<{ id: string }>(
    `
      INSERT INTO product_options (
        product_id,
        option_number,
        name,
        supplier_id,
        price_minor,
        promo_price_minor,
        currency,
        is_active,
        is_available,
        supplier_product_id,
        priority,
        purchase_limit_per_customer,
        refund_enabled
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        NULL,
        'NGN',
        true,
        $6,
        $7,
        100,
        NULL,
        true
      )
      RETURNING id
    `,
    [
      productId,
      optionNumber,
      displayOptionName(option.supplier, option.supplierOption),
      supplierId,
      option.customerPriceMinor,
      option.available,
      option.supplierOption,
    ],
  );

  return {
    id: created.rows[0].id,
    created: true,
  };
}

async function upsertRoute(
  client: {
    query: <T = unknown>(
      text: string,
      values?: unknown[],
    ) => Promise<{ rows: T[] }>;
  },
  productOptionId: string,
  supplierId: string,
  supplierProductId: string,
  routePriority: number,
): Promise<void> {
  await client.query(
    `
      INSERT INTO option_supplier_routes (
        product_option_id,
        supplier_id,
        route_priority,
        is_active,
        is_primary,
        supplier_product_id
      )
      VALUES ($1, $2, $3, true, true, $4)
      ON CONFLICT (product_option_id, supplier_id)
      DO UPDATE SET
        route_priority = EXCLUDED.route_priority,
        is_active = true,
        is_primary = true,
        supplier_product_id = EXCLUDED.supplier_product_id,
        updated_at = NOW()
    `,
    [
      productOptionId,
      supplierId,
      routePriority,
      supplierProductId,
    ],
  );
}

export async function materializeGlobalCatalog(
  country: string,
  service: string,
): Promise<MaterializeResult> {
  const normalizedCountry = normalize(country);
  const normalizedService = normalize(service);

  if (!normalizedCountry || !normalizedService) {
    throw new Error("Country and service are required");
  }

  const catalog = await getGlobalCatalog(
    normalizedCountry,
    normalizedService,
  );

  console.log("[catalog-materializer] live catalog", {
    country: normalizedCountry,
    service: normalizedService,
    optionCount: catalog.options.length,
    options: catalog.options.map((option) => ({
      supplier: option.supplier,
      supplierOption: option.supplierOption,
      customerPriceNgn: option.customerPriceNgn,
      available: option.available,
    })),
    supplierErrors: catalog.supplierErrors,
  });

  const client = await db.connect();

  let createdOptions = 0;
  let updatedOptions = 0;
  let unavailableOptions = 0;
  let skippedOptions = 0;
  const optionIds: string[] = [];

  try {
    await client.query("BEGIN");

    const productId = await getOrCreateProduct(
      client,
      normalizedCountry,
      normalizedService,
    );

    const seenOptionKeys = new Set<string>();

    for (const option of catalog.options) {
      const supplier = normalize(option.supplier);
      const supplierOption = normalize(option.supplierOption);

      if (!supplier || !supplierOption) {
        skippedOptions += 1;
        continue;
      }

      const key = `${supplier}:${supplierOption}`;
      seenOptionKeys.add(key);

      const supplierId = await findSupplierId(
        client,
        supplier,
      );

      const existing = await client.query<{
        id: string;
        optionNumber: number;
      }>(
        `
          SELECT id, option_number AS "optionNumber"
          FROM product_options
          WHERE product_id = $1
            AND supplier_id = $2
            AND supplier_product_id = $3
          LIMIT 1
        `,
        [productId, supplierId, supplierOption],
      );

      const nextOptionNumber =
        existing.rows[0]?.optionNumber ??
        (await findNextOptionNumber(client, productId));

      const upserted = await upsertOption(
        client,
        productId,
        supplierId,
        option,
        nextOptionNumber,
      );

      if (!upserted.id) {
        skippedOptions += 1;
        continue;
      }

      if (upserted.created) {
        createdOptions += 1;
      } else {
        updatedOptions += 1;
      }

      await upsertRoute(
        client,
        upserted.id,
        supplierId,
        supplierOption,
        option.available ? 100 : 200,
      );

      if (!option.available) {
        unavailableOptions += 1;
      }

      optionIds.push(upserted.id);
    }

    const existingOptions = await client.query<{
      id: string;
      supplier: string;
      supplierOption: string;
    }>(
      `
        SELECT
          po.id,
          sup.slug AS supplier,
          po.supplier_product_id AS "supplierOption"
        FROM product_options po
        JOIN suppliers sup
          ON sup.id = po.supplier_id
        WHERE po.product_id = $1
          AND po.is_active = true
          AND sup.is_test = false
      `,
      [productId],
    );

    for (const existingOption of existingOptions.rows) {
      const key = `${normalize(existingOption.supplier)}:${normalize(
        existingOption.supplierOption ?? "",
      )}`;

      if (!seenOptionKeys.has(key)) {
        await client.query(
          `
            UPDATE product_options
            SET
              is_available = false,
              updated_at = NOW()
            WHERE id = $1
          `,
          [existingOption.id],
        );

        await client.query(
          `
            UPDATE option_supplier_routes
            SET
              is_active = false,
              is_primary = false,
              updated_at = NOW()
            WHERE product_option_id = $1
          `,
          [existingOption.id],
        );

        unavailableOptions += 1;
      }
    }

    await client.query("COMMIT");

    return {
      country: normalizedCountry,
      service: normalizedService,
      productId,
      createdOptions,
      updatedOptions,
      unavailableOptions,
      skippedOptions,
      optionIds,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
