import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { materializeGlobalCatalog } from "@/lib/suppliers/catalog/catalog-materializer";

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);

    const country =
      typeof body?.country === "string"
        ? body.country.trim().toLowerCase()
        : "";

    const service =
      typeof body?.service === "string"
        ? body.service.trim().toLowerCase()
        : "";

    if (!country || !service) {
      return NextResponse.json(
        {
          success: false,
          error: "Country and service are required.",
        },
        { status: 400 },
      );
    }

    const result = await materializeGlobalCatalog(
      country,
      service,
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Catalog materialization failed.";

    if (message === "Authentication required") {
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 401 },
      );
    }

    if (message === "Forbidden") {
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
