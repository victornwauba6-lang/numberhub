import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type OrderRow = {
  id: string;
  status: string;
  currency: string;
  priceMinor: string;
  refundEnabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  serviceSlug: string;
  serviceName: string;
  serviceIcon: string;
  optionName: string;
  phoneNumber?: string | null;
  isLegacy?: boolean;
  legacyReference?: string | null;
};

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication required",
      },
      { status: 401 },
    );
  }

  try {
    const currentResult = await db.query<OrderRow>(
      `
        SELECT
          o.id,
          o.status,
          o.currency,
          o.price_minor::text AS "priceMinor",
          o.refund_enabled_snapshot AS "refundEnabled",
          o.expires_at AS "expiresAt",
          o.created_at AS "createdAt",
          o.updated_at AS "updatedAt",
          o.completed_at AS "completedAt",
          c.code AS "countryCode",
          c.name AS "countryName",
          c.flag_emoji AS "countryFlag",
          s.slug AS "serviceSlug",
          s.name AS "serviceName",
          s.icon AS "serviceIcon",
          po.name AS "optionName",
          NULL AS "phoneNumber",
          false AS "isLegacy",
          NULL AS "legacyReference"
        FROM orders o
        INNER JOIN countries c
          ON c.id = o.country_id
        INNER JOIN services s
          ON s.id = o.service_id
        INNER JOIN product_options po
          ON po.id = o.product_option_id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT 100
      `,
      [user.id],
    );

    const legacyResult = await db.query<OrderRow>(
      `
        SELECT
          lnp.id,
          CASE
            WHEN LOWER(lnp.status) IN ('finished', 'received', 'completed', 'success', 'successful')
              THEN 'COMPLETED'
            WHEN LOWER(lnp.status) IN ('canceled', 'cancelled')
              THEN 'CANCELLED'
            WHEN LOWER(lnp.status) IN ('timeout', 'expired')
              THEN 'EXPIRED'
            WHEN LOWER(lnp.status) IN ('active', 'processing', 'pending')
              THEN 'PROCESSING'
            ELSE 'PROCESSING'
          END AS status,
          'NGN' AS currency,
          lnp.price_minor::text AS "priceMinor",
          false AS "refundEnabled",
          NULL AS "expiresAt",
          lnp.created_at AS "createdAt",
          lnp.created_at AS "updatedAt",
          CASE
            WHEN LOWER(lnp.status) IN ('finished', 'received', 'completed', 'success', 'successful')
              THEN lnp.created_at
            ELSE NULL
          END AS "completedAt",
          UPPER(TRIM(lnp.country)) AS "countryCode",
          INITCAP(REPLACE(TRIM(lnp.country), '_', ' ')) AS "countryName",
          '🌐' AS "countryFlag",
          LOWER(REPLACE(TRIM(lnp.service), ' ', '-')) AS "serviceSlug",
          INITCAP(REPLACE(TRIM(lnp.service), '_', ' ')) AS "serviceName",
          '◈' AS "serviceIcon",
          'Historical number' AS "optionName",
          lnp.phone_number AS "phoneNumber",
          true AS "isLegacy",
          lnp.reference AS "legacyReference"
        FROM legacy_number_purchases lnp
        WHERE lnp.new_user_id = $1
        ORDER BY lnp.created_at DESC
        LIMIT 100
      `,
      [user.id],
    );

    const orders = [...currentResult.rows, ...legacyResult.rows]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )
      .slice(0, 150);

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("[Orders API] Database error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load orders",
      },
      { status: 500 },
    );
  }
}
