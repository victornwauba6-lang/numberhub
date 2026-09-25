import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { syncDiscoveredCountries } from "@/lib/suppliers/catalog/unified-discovery-service";

export const runtime = "nodejs";

export async function POST() {
  try {
    await requireAdmin();

    const result = await syncDiscoveredCountries(db);

    console.log("NUMBERHUB COUNTRY CATALOG SYNC RESULT:", result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Catalog synchronization failed.";

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
