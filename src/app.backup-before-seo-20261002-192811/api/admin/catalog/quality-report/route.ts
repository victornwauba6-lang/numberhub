import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { discoverUnifiedCatalog } from "@/lib/suppliers/catalog/unified-discovery-service";
import {
  classifySupplierService,
  type ServiceClassification,
} from "@/lib/catalog/service-classifier";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();

    const discovery = await discoverUnifiedCatalog();

    const serviceMap = new Map<string, string[]>();

    for (const country of discovery.countries) {
      for (const service of country.services) {
        const normalized = service.trim().toLowerCase();

        if (!serviceMap.has(normalized)) {
          serviceMap.set(normalized, []);
        }

        serviceMap.get(normalized)!.push(country.iso2 ?? "UNRESOLVED");
      }
    }

    const classifications = Array.from(serviceMap.entries())
      .map(([service, countries]) => {
        const result = classifySupplierService(service);

        return {
          service,
          classification: result.classification,
          reason: result.reason,
          countryCount: countries.length,
        };
      })
      .sort((a, b) => {
        const order: Record<ServiceClassification, number> = {
          blocked: 0,
          review: 1,
          approved: 2,
        };

        const classificationDifference =
          order[a.classification] - order[b.classification];

        if (classificationDifference !== 0) {
          return classificationDifference;
        }

        return a.service.localeCompare(b.service);
      });

    const summary = {
      discoveredCountries: discovery.countries.length,
      discoveredServices: classifications.length,
      approved: classifications.filter(
        (item) => item.classification === "approved",
      ).length,
      review: classifications.filter(
        (item) => item.classification === "review",
      ).length,
      blocked: classifications.filter(
        (item) => item.classification === "blocked",
      ).length,
      unresolvedCountries: discovery.countries
        .filter((country) => !country.iso2)
        .map((country) => country.supplierCountries.join(", ")),
      supplierErrors: discovery.supplierErrors,
    };

    return NextResponse.json({
      success: true,
      summary,
      services: classifications,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Catalog quality report failed",
      },
      { status: 500 },
    );
  }
}
