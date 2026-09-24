import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
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

  const { id } = await params;
  const orderId = id?.trim();

  if (!orderId) {
    return NextResponse.json(
      {
        success: false,
        error: "Order ID is required",
      },
      { status: 400 },
    );
  }

  try {
    const result = await db.query<{
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
      phoneNumber: string | null;
      supplierNumberReference: string | null;
      assignedAt: string | null;
    }>(
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
          vn.phone_number AS "phoneNumber",
          vn.supplier_number_reference AS "supplierNumberReference",
          vn.assigned_at AS "assignedAt"
        FROM orders o
        INNER JOIN countries c
          ON c.id = o.country_id
        INNER JOIN services s
          ON s.id = o.service_id
        INNER JOIN product_options po
          ON po.id = o.product_option_id
        LEFT JOIN verification_numbers vn
          ON vn.order_id = o.id
        WHERE o.id = $1
          AND o.user_id = $2
        LIMIT 1
      `,
      [orderId, user.id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      order: result.rows[0],
    });
  } catch (error) {
    console.error("[Order Detail API] Database error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load order",
      },
      { status: 500 },
    );
  }
}
