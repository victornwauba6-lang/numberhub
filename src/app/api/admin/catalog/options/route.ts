import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();

    const [countriesResult, servicesResult] = await Promise.all([
      db.query<{
        code: string;
        name: string;
      }>(`
        SELECT code, name
        FROM countries
        WHERE is_active = true
          AND is_test = false
        ORDER BY name
      `),

      db.query<{
        slug: string;
        name: string;
      }>(`
        SELECT slug, name
        FROM services
        WHERE is_active = true
          AND is_test = false
        ORDER BY name
      `),
    ]);

    return NextResponse.json({
      success: true,
      countries: countriesResult.rows,
      services: servicesResult.rows,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Catalog options could not be loaded.";

    if (message === "Authentication required") {
      return NextResponse.json(
        { success: false, error: message },
        { status: 401 },
      );
    }

    if (message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
