import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const requestedLimit = Number(searchParams.get("limit") || "100");
    const limit = Math.min(
      Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 100, 1),
      100,
    );

    const result = await db.query<{
      id: string;
      email: string;
      fullName: string | null;
      isActive: boolean;
      createdAt: string;
      role: string;
      balanceMinor: string;
      orderCount: string;
    }>(
      `
        SELECT
          u.id,
          u.email,
          u.full_name AS "fullName",
          u.is_active AS "isActive",
          u.created_at AS "createdAt",
          r.name AS role,
          COALESCE(w.balance_minor, 0)::text AS "balanceMinor",
          (
            SELECT COUNT(*)
            FROM orders o
            WHERE o.user_id = u.id
          )::text AS "orderCount"
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        LEFT JOIN wallets w ON w.user_id = u.id
        WHERE r.name = 'CUSTOMER'
          AND (
            $1 = ''
            OR u.email ILIKE '%' || $1 || '%'
            OR COALESCE(u.full_name, '') ILIKE '%' || $1 || '%'
          )
        ORDER BY u.created_at DESC
        LIMIT $2
      `,
      [search, limit],
    );

    return NextResponse.json({
      success: true,
      customers: result.rows.map((customer) => ({
        ...customer,
        orderCount: Number(customer.orderCount),
      })),
    });
  } catch (error: unknown) {
    console.error("Admin customers query failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Customer data could not be loaded",
      },
      { status: 500 },
    );
  }
}
