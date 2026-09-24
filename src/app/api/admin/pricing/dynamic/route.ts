import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { getGlobalCatalog } from "@/lib/suppliers/catalog/global-catalog-service";
import { materializeGlobalCatalog } from "@/lib/suppliers/catalog/catalog-materializer";

type DynamicPricingOverride = {
  multiplier: number;
  referenceCustomerPriceMinor?: number;
  referenceSupplierCostNgnMinor?: number;
};

type ManualOverrides = {
  legacy?: Record<string, Record<string, number>>;
  countries?: Record<
    string,
    Record<string, Record<string, Record<string, number>>>
  >;
  dynamicCountries?: Record<
    string,
    Record<
      string,
      Record<string, Record<string, DynamicPricingOverride>>
    >
  >;
};

function getCurrencyRate(
  settings: Record<string, unknown>,
  currency: string,
) {
  const rates = settings;

  if (!rates || typeof rates !== "object" || Array.isArray(rates)) {
    return null;
  }

  const rate = (rates as Record<string, unknown>)[currency];

  return typeof rate === "number" && Number.isFinite(rate) && rate > 0
    ? rate
    : null;
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    const body = await request.json().catch(() => null);

    const country =
      typeof body?.country === "string"
        ? body.country.trim().toLowerCase()
        : "";

    const service =
      typeof body?.service === "string"
        ? body.service.trim().toLowerCase()
        : "";

    const supplier =
      typeof body?.supplier === "string"
        ? body.supplier.trim().toLowerCase()
        : "";

    const supplierOption =
      typeof body?.supplierOption === "string"
        ? body.supplierOption.trim().toLowerCase()
        : "";

    const customerPriceNgn =
      typeof body?.customerPriceNgn === "number"
        ? body.customerPriceNgn
        : Number(body?.customerPriceNgn);

    if (!country || !service || !supplier || !supplierOption) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Country, service, supplier and supplier option are required.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(customerPriceNgn) ||
      customerPriceNgn <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer price must be greater than zero.",
        },
        { status: 400 },
      );
    }

    const catalog = await getGlobalCatalog(country, service);

    const option = catalog.options.find(
      (item) =>
        item.supplier.toLowerCase() === supplier &&
        item.supplierOption.toLowerCase() === supplierOption,
    );

    if (!option) {
      return NextResponse.json(
        {
          success: false,
          error: "The requested supplier option was not found.",
          supplierErrors: catalog.supplierErrors,
        },
        { status: 404 },
      );
    }

    if (
      option.cost === null ||
      !Number.isFinite(option.cost) ||
      option.cost <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "The supplier currently has no valid cost for this option.",
        },
        { status: 400 },
      );
    }

    const rateResult = await db.query<{ setting_value: Record<string, unknown> }>(
      "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
      ["pricing.currency_rates"],
    );

    const currencySettings = rateResult.rows[0]?.setting_value ?? {};
    const currency = option.currency.trim().toUpperCase();
    const rate = getCurrencyRate(currencySettings, currency);

    if (rate === null) {
      return NextResponse.json(
        {
          success: false,
          error: `No currency rate is configured for ${currency}.`,
        },
        { status: 400 },
      );
    }

    const supplierCostNgnMinor = Math.round(
      option.cost * rate * 100,
    );

    if (supplierCostNgnMinor <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "The calculated supplier cost is invalid.",
        },
        { status: 400 },
      );
    }

    const customerPriceMinor = Math.round(
      customerPriceNgn * 100,
    );

    const multiplier =
      customerPriceMinor / supplierCostNgnMinor;

    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to calculate a valid pricing multiplier.",
        },
        { status: 400 },
      );
    }

    const settingsResult = await db.query<{
      setting_value: ManualOverrides;
    }>(
      "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
      ["pricing.manual_overrides"],
    );

    const currentOverrides =
      settingsResult.rows[0]?.setting_value ?? {};

    const nextOverrides: ManualOverrides = {
      ...currentOverrides,
      dynamicCountries: {
        ...(currentOverrides.dynamicCountries ?? {}),
      },
    };

    nextOverrides.dynamicCountries![country] = {
      ...(nextOverrides.dynamicCountries?.[country] ?? {}),
    };

    nextOverrides.dynamicCountries![country]![service] = {
      ...(nextOverrides.dynamicCountries?.[country]?.[service] ?? {}),
    };

    nextOverrides.dynamicCountries![country]![service]![supplier] = {
      ...(nextOverrides.dynamicCountries?.[country]?.[service]?.[supplier] ??
        {}),
    };

    nextOverrides.dynamicCountries![country]![service]![supplier]![
      supplierOption
    ] = {
      multiplier,
      referenceCustomerPriceMinor: customerPriceMinor,
      referenceSupplierCostNgnMinor: supplierCostNgnMinor,
    };

    await db.query(
      `INSERT INTO system_settings (
        setting_key,
        setting_value,
        description,
        updated_by_user_id,
        updated_at
      )
      VALUES (
        $1,
        $2::jsonb,
        $3,
        $4,
        NOW()
      )
      ON CONFLICT (setting_key)
      DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        description = EXCLUDED.description,
        updated_by_user_id = EXCLUDED.updated_by_user_id,
        updated_at = NOW()`,
      [
        "pricing.manual_overrides",
        JSON.stringify(nextOverrides),
        "Manual pricing relationships and legacy pricing overrides.",
        admin.id,
      ],
    );

    await materializeGlobalCatalog(country, service);

    return NextResponse.json({
      success: true,
      country,
      service,
      supplier,
      supplierOption,
      supplierCurrency: currency,
      supplierCost: option.cost,
      supplierCostNgn: supplierCostNgnMinor / 100,
      customerPriceNgn: customerPriceMinor / 100,
      multiplier,
      pricingSource: "manual_override",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to save dynamic pricing.";

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
