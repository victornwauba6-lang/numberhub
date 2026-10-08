import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
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
    await db.query(`
      ALTER TABLE option_supplier_routes
      ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0
        CHECK (consecutive_failures >= 0)
    `);

    await db.query(`
      ALTER TABLE option_supplier_routes
      ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ
    `);

    await db.query(`
      ALTER TABLE option_supplier_routes
      ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ
    `);

    return NextResponse.json({
      success: true,
      message: "Supplier route schema repaired successfully",
    });
  } catch (error) {
    console.error("Supplier route schema repair error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Supplier route schema repair failed",
      },
      { status: 500 },
    );
  }
}
