import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveCountry } from "@/lib/catalog/country-resolver";
import { getGlobalCatalog } from "@/lib/suppliers/catalog/global-catalog-service";
import { materializeGlobalCatalog } from "@/lib/suppliers/catalog/catalog-materializer";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get("country")?.trim();
    const service = request.nextUrl.searchParams.get("service")?.trim();

    if (!country || !service) {
      return NextResponse.json(
        {
          error: "Country and service are required.",
          example: "/api/catalog/live?country=usa&service=whatsapp",
        },
        { status: 400 },
      );
    }

    const resolvedCountry = resolveCountry(country);

    if (!resolvedCountry?.iso2) {
      return NextResponse.json(
        { error: `Country could not be resolved: ${country}` },
        { status: 400 },
      );
    }

    // Synchronize the requested country/service with the live supplier
    // catalog before reading materialized product options. This keeps
    // availability global without bypassing the normal purchase path.
    await materializeGlobalCatalog(
      resolvedCountry.iso2.toLowerCase(),
      service.toLowerCase(),
    );

    const catalog = await getGlobalCatalog(country, service);

    const optionRows = await db.query<{
      optionId: string;
      supplier: string;
      supplierOption: string;
      available: boolean;
      priceMinor: string | null;
      promoPriceMinor: string | null;
    }>(
      `
        SELECT
          po.id AS "optionId",
          sup.slug AS supplier,
          po.supplier_product_id AS "supplierOption",
          po.is_available AS available,
          po.price_minor::text AS "priceMinor",
          po.promo_price_minor::text AS "promoPriceMinor"
        FROM product_options po
        INNER JOIN products p
          ON p.id = po.product_id
        INNER JOIN countries c
          ON c.id = p.country_id
        INNER JOIN services s
          ON s.id = p.service_id
        INNER JOIN suppliers sup
          ON sup.id = po.supplier_id
        WHERE LOWER(c.code) = $1
          AND LOWER(s.slug) = $2
          AND p.is_active = true
          AND c.is_active = true
          AND c.is_test = false
          AND s.is_active = true
          AND s.is_test = false
          AND po.is_active = true
          AND sup.is_active = true
          AND sup.is_test = false
      `,
      [resolvedCountry.iso2.toLowerCase(), service.toLowerCase()],
    );

    const optionIdMap = new Map(
      optionRows.rows.map((row) => [
        `${row.supplier.toLowerCase()}:${row.supplierOption.toLowerCase()}`,
        row,
      ]),
    );

    return NextResponse.json({
      country: catalog.country,
      service: catalog.service,
      optionCount: catalog.options.length,
      options: catalog.options.map((option, index) => {
        const materialized = optionIdMap.get(
          `${option.supplier.toLowerCase()}:${option.supplierOption.toLowerCase()}`,
        );

        return {
          optionNumber: index + 1,
          optionId: option.optionId,
          productOptionId: materialized?.optionId ?? null,
          materializedPriceNgn:
            materialized?.priceMinor != null
              ? Number(materialized.priceMinor) / 100
              : null,
          materializedPromoPriceNgn:
            materialized?.promoPriceMinor != null
              ? Number(materialized.promoPriceMinor) / 100
              : null,
          supplier: option.supplier,
          supplierOption: option.supplierOption,
          cost: option.cost,
          currency: option.currency,
          customerPriceNgn: option.customerPriceNgn,
          pricingSource: option.pricingSource,
          available: option.available,
          materializedAvailable: materialized?.available ?? false,
          purchasable:
            option.available &&
            materialized?.optionId != null &&
            materialized.available,
          stock: option.stock,
          rates: option.rates ?? {},
        };
      }),
      supplierErrors: catalog.supplierErrors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Live catalog request failed.",
      },
      { status: 500 },
    );
  }
}
