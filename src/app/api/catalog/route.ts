import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConfiguredSupplierCatalogServices } from "@/lib/suppliers/catalog/catalog-loader";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [countriesResult, servicesResult, offeringsResult] =
      await Promise.all([
        db.query<{
          code: string;
          name: string;
          flag: string | null;
          sortOrder: number;
        }>(
          `
            SELECT
              code,
              name,
              flag_emoji AS flag,
              sort_order AS "sortOrder"
            FROM countries
            WHERE is_active = true
              AND is_test = false
            ORDER BY sort_order, name
          `,
        ),

        db.query<{
          slug: string;
          name: string;
          icon: string | null;
          sortOrder: number;
        }>(
          `
            SELECT
              slug,
              name,
              icon,
              sort_order AS "sortOrder"
            FROM services
            WHERE is_active = true
              AND is_test = false
            ORDER BY sort_order, name
          `,
        ),

        db.query<{
          countryCode: string;
          countryName: string;
          countryFlag: string | null;
          serviceSlug: string;
          serviceName: string;
          serviceIcon: string | null;
          productId: string;
          productOptionName: string;
          optionId: string;
          optionNumber: number;
          priceMinor: string;
          promoPriceMinor: string | null;
          currency: string;
          purchaseLimitPerCustomer: number | null;
          refundEnabled: boolean;
          isAvailable: boolean;
          supplierSlug: string;
        }>(
          `
            SELECT
              c.code AS "countryCode",
              c.name AS "countryName",
              c.flag_emoji AS "countryFlag",
              s.slug AS "serviceSlug",
              s.name AS "serviceName",
              s.icon AS "serviceIcon",
              p.id AS "productId",
              po.name AS "productOptionName",
              po.id AS "optionId",
              po.option_number AS "optionNumber",
              po.price_minor::text AS "priceMinor",
              po.promo_price_minor::text AS "promoPriceMinor",
              po.currency AS "currency",
              po.purchase_limit_per_customer AS "purchaseLimitPerCustomer",
              po.refund_enabled AS "refundEnabled",
              po.is_available AS "isAvailable",
              sup.slug AS "supplierSlug"
            FROM products p
            JOIN countries c
              ON c.id = p.country_id
            JOIN services s
              ON s.id = p.service_id
            JOIN product_options po
              ON po.product_id = p.id
            JOIN suppliers sup
              ON sup.id = po.supplier_id
            WHERE p.is_active = true
              AND c.is_active = true
              AND c.is_test = false
              AND s.is_active = true
              AND s.is_test = false
              AND po.is_active = true
              AND (
                po.is_available = true
                OR sup.slug = 'smspool'
              )
              AND sup.is_active = true
              AND sup.is_test = false
              AND (
              LOWER(sup.slug) <> 'fivesim'
              OR (
                UPPER(c.code) = 'US'
                AND LOWER(s.slug) = 'whatsapp'
              )
            )
            ORDER BY c.name, s.name
          `,
        ),
      ]);

    const serviceMap = new Map(
      servicesResult.rows.map((service) => [
        service.slug.toLowerCase(),
        service,
      ]),
    );

    const configuredCatalogServices =
      getConfiguredSupplierCatalogServices();

    await Promise.all(
      configuredCatalogServices.map(async (catalogService) => {
        if (!catalogService.getServices) {
          return;
        }

        try {
          const discoveredServices = await catalogService.getServices();

          for (const discovered of discoveredServices) {
            const slug = discovered.key.trim().toLowerCase();
            const name = discovered.name.trim();

            if (!slug || !name) {
              continue;
            }

            if (!serviceMap.has(slug)) {
              serviceMap.set(slug, {
                slug,
                name: name.slice(0, 100),
                icon: null,
                sortOrder: 100000,
              });
            }
          }
        } catch (error) {
          console.warn(
            "Catalog supplier service discovery failed",
            {
              supplier: catalogService.slug,
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            },
          );
        }
      }),
    );

    const services = Array.from(serviceMap.values()).sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name),
    );

    return NextResponse.json({
      countries: countriesResult.rows,
      services,
      offerings: offeringsResult.rows,
    });
  } catch (error) {
    console.error("Catalog API error:", error);

    return NextResponse.json(
      { error: "Unable to load marketplace catalog" },
      { status: 500 },
    );
  }
}
