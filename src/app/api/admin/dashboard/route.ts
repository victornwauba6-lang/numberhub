import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: "Admin access required" },
      { status: 403 },
    );
  }

  try {
    const [
      customersResult,
      suppliersResult,
      productsResult,
      optionsResult,
      ordersResult,
      paymentsResult,
      pendingPaymentsResult,
      revenueResult,
    ] = await Promise.all([
      db.query<{ total: string; active: string }>(`
        SELECT
          COUNT(*) FILTER (WHERE r.name = 'CUSTOMER')::text AS total,
          COUNT(*) FILTER (
            WHERE r.name = 'CUSTOMER' AND u.is_active = true
          )::text AS active
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
      `),

      db.query<{ total: string; active: string }>(`
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE is_active = true AND is_test = false)::text AS active
        FROM suppliers
      `),

      db.query<{ total: string; active: string }>(`
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE is_active = true)::text AS active
        FROM products
      `),

      db.query<{ total: string; available: string }>(`
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (
            WHERE po.is_active = true
              AND po.is_available = true
              AND s.is_active = true
              AND s.is_test = false
          )::text AS available
        FROM product_options po
        INNER JOIN suppliers s ON s.id = po.supplier_id
      `),

      db.query<{ total: string; active: string; completed: string }>(`
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (
            WHERE status IN ('CREATED', 'PROCESSING')
          )::text AS active,
          COUNT(*) FILTER (
            WHERE status = 'COMPLETED'
          )::text AS completed
        FROM orders
      `),

      db.query<{ total: string; successful: string }>(`
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE status = 'SUCCESS')::text AS successful
        FROM payments
      `),

      db.query<{ total: string; amountMinor: string }>(`
        SELECT
          COUNT(*)::text AS total,
          COALESCE(SUM(amount_minor), 0)::text AS "amountMinor"
        FROM payments
        WHERE status IN ('PENDING', 'PROCESSING')
      `),

      db.query<{ amountMinor: string }>(`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN direction = 'CREDIT' THEN amount_minor
                ELSE 0
              END
            ),
            0
          )::text AS "amountMinor"
        FROM wallet_transactions
        WHERE transaction_type IN ('DEPOSIT', 'REFUND')
      `),
    ]);

    return NextResponse.json({
      success: true,
      admin: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      stats: {
        customers: {
          total: Number(customersResult.rows[0]?.total ?? 0),
          active: Number(customersResult.rows[0]?.active ?? 0),
        },
        suppliers: {
          total: Number(suppliersResult.rows[0]?.total ?? 0),
          active: Number(suppliersResult.rows[0]?.active ?? 0),
        },
        products: {
          total: Number(productsResult.rows[0]?.total ?? 0),
          active: Number(productsResult.rows[0]?.active ?? 0),
        },
        options: {
          total: Number(optionsResult.rows[0]?.total ?? 0),
          available: Number(optionsResult.rows[0]?.available ?? 0),
        },
        orders: {
          total: Number(ordersResult.rows[0]?.total ?? 0),
          active: Number(ordersResult.rows[0]?.active ?? 0),
          completed: Number(ordersResult.rows[0]?.completed ?? 0),
        },
        payments: {
          total: Number(paymentsResult.rows[0]?.total ?? 0),
          successful: Number(paymentsResult.rows[0]?.successful ?? 0),
          pending: Number(pendingPaymentsResult.rows[0]?.total ?? 0),
          pendingAmountMinor: pendingPaymentsResult.rows[0]?.amountMinor ?? "0",
        },
        walletCreditsMinor: revenueResult.rows[0]?.amountMinor ?? "0",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Admin dashboard data could not be loaded",
      },
      { status: 500 },
    );
  }
}
