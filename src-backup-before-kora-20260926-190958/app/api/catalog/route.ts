import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
              po.refund_enabled AS "refundEnabled"
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
              AND po.is_available = true
              AND sup.is_active = true
              AND sup.is_test = false
            ORDER BY c.name, s.name
          `,
        ),
      ]);

    return NextResponse.json({
      countries: countriesResult.rows,
      services: servicesResult.rows,
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
