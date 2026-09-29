import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { discoverUnifiedCatalog } from "@/lib/suppliers/catalog/unified-discovery-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();

    const result = await discoverUnifiedCatalog();

    return NextResponse.json({
      success: true,
      summary: {
        totalDiscoveredCountries: result.countries.length,
        totalDiscoveredServices: result.services.length,
        supplierErrors: result.supplierErrors.length,
        supplierErrorDetails: result.supplierErrors,
        unresolvedCountries: result.countries.filter(
          (country) => !country.iso2,
        ).length,
        unresolvedCountryNames: result.countries
          .filter((country) => !country.iso2)
          .map((country) => country.supplierCountries.join(", ")),
      },
      countries: result.countries,
      services: result.services,
      supplierErrors: result.supplierErrors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Discovery failed",
      },
      { status: 500 },
    );
  }
}
