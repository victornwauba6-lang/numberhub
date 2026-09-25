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
      ALTER TABLE countries
      ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false NOT NULL
    `);

    await db.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false NOT NULL
    `);

    await db.query(`
      ALTER TABLE suppliers
      ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false NOT NULL
    `);

    return NextResponse.json({
      success: true,
      message: "Catalog schema repaired successfully",
    });
  } catch (error) {
    console.error("Catalog schema repair error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Catalog schema repair failed",
      },
      { status: 500 },
    );
  }
}
