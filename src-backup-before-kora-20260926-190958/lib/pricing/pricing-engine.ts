import { db } from "@/lib/db";

type DynamicPricingOverride = {
  multiplier: number;
  referenceCustomerPriceMinor?: number;
  referenceSupplierCostNgnMinor?: number;
};

type PricingSettings = {
  currencyRates: Record<string, number>;
  defaultMarkup: {
    bands?: Array<{
      max_cost_minor?: number;
      min_cost_minor?: number;
      price_minor?: number;
      multiplier?: number;
    }>;
  };
  rounding: {
    mode?: "nearest_100" | "none";
  };
  manualOverrides: {
    legacy?: Record<string, Record<string, number>>;
    countries?: Record<
      string,
      Record<string, Record<string, Record<string, number>>>
    >;
    dynamicCountries?: Record<
      string,
      Record<
        string,
        Record<
          string,
          Record<string, DynamicPricingOverride>
        >
      >
    >;
  };
};

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const result = await db.query<{ setting_value: T }>(
    "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
    [key],
  );

  return result.rows[0]?.setting_value ?? fallback;
}

async function getPricingSettings(): Promise<PricingSettings> {
  const [currencyRates, defaultMarkup, rounding, manualOverrides] =
    await Promise.all([
      getSetting<PricingSettings["currencyRates"]>(
        "pricing.currency_rates",
        {},
      ),
      getSetting<PricingSettings["defaultMarkup"]>(
        "pricing.default_markup",
        {},
      ),
      getSetting<PricingSettings["rounding"]>(
        "pricing.rounding",
        {},
      ),
      getSetting<PricingSettings["manualOverrides"]>(
        "pricing.manual_overrides",
        {},
      ),
    ]);

  return {
    currencyRates,
    defaultMarkup,
    rounding,
    manualOverrides,
  };
}

function roundPrice(priceMinor: number, mode?: "nearest_100" | "none") {
  if (mode !== "nearest_100") {
    return Math.max(0, Math.round(priceMinor));
  }

  return Math.max(0, Math.round(priceMinor / 100) * 100);
}

export type CustomerPriceInput = {
  supplier: string;
  supplierOption: string;
  cost: number | null;
  currency: string;
  country?: string;
  service?: string;
};

export type CustomerPriceResult = {
  customerPriceMinor: number | null;
  customerPriceNgn: number | null;
  pricingSource: "manual_override" | "automatic_rule" | "unpriced";
  supplierCost: number | null;
  supplierCurrency: string;
};

export async function calculateCustomerPrice(
  input: CustomerPriceInput,
): Promise<CustomerPriceResult> {
  const settings = await getPricingSettings();

  const supplier = input.supplier.trim().toLowerCase();
  const supplierOption = input.supplierOption.trim().toLowerCase();
  const currency = input.currency.trim().toUpperCase();
  const country = input.country?.trim().toLowerCase() ?? "";
  const service = input.service?.trim().toLowerCase() ?? "";

  if (input.cost === null || !Number.isFinite(input.cost)) {
    return {
      customerPriceMinor: null,
      customerPriceNgn: null,
      pricingSource: "unpriced",
      supplierCost: input.cost,
      supplierCurrency: currency,
    };
  }

  const dynamicOverride =
    country && service
      ? settings.manualOverrides.dynamicCountries?.[country]?.[service]?.[
          supplier
        ]?.[supplierOption]
      : undefined;

  const rate = settings.currencyRates[currency];

  if (
    dynamicOverride &&
    typeof dynamicOverride.multiplier === "number" &&
    Number.isFinite(dynamicOverride.multiplier) &&
    dynamicOverride.multiplier > 0 &&
    Number.isFinite(rate) &&
    rate > 0
  ) {
    const supplierCostNgnMinor = Math.round(
      input.cost * rate * 100,
    );

    let dynamicCustomerPriceMinor = Math.round(
      supplierCostNgnMinor * dynamicOverride.multiplier,
    );

    dynamicCustomerPriceMinor = roundPrice(
      dynamicCustomerPriceMinor,
      settings.rounding.mode,
    );

    return {
      customerPriceMinor: dynamicCustomerPriceMinor,
      customerPriceNgn: dynamicCustomerPriceMinor / 100,
      pricingSource: "manual_override",
      supplierCost: input.cost,
      supplierCurrency: currency,
    };
  }

  const countryManualPrice =
    country && service
      ? settings.manualOverrides.countries?.[country]?.[service]?.[supplier]?.[
          supplierOption
        ]
      : undefined;

  const legacyManualPrice =
    settings.manualOverrides.legacy?.[supplier]?.[supplierOption];

  const manualPrice =
    typeof countryManualPrice === "number"
      ? countryManualPrice
      : legacyManualPrice;

  if (
    typeof manualPrice === "number" &&
    Number.isFinite(manualPrice) &&
    manualPrice > 0
  ) {
    return {
      customerPriceMinor: manualPrice,
      customerPriceNgn: manualPrice / 100,
      pricingSource: "manual_override",
      supplierCost: input.cost,
      supplierCurrency: currency,
    };
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    return {
      customerPriceMinor: null,
      customerPriceNgn: null,
      pricingSource: "unpriced",
      supplierCost: input.cost,
      supplierCurrency: currency,
    };
  }

  const supplierCostNgnMinor = Math.round(input.cost * rate * 100);

  const bands = [...(settings.defaultMarkup.bands ?? [])].sort(
    (a, b) =>
      (a.min_cost_minor ?? 0) - (b.min_cost_minor ?? 0),
  );

  let customerPriceMinor: number | null = null;

  for (const band of bands) {
    const min = band.min_cost_minor ?? 0;
    const max = band.max_cost_minor;

    if (
      supplierCostNgnMinor >= min &&
      (max === undefined || supplierCostNgnMinor <= max)
    ) {
      if (typeof band.price_minor === "number") {
        customerPriceMinor = band.price_minor;
      } else if (typeof band.multiplier === "number") {
        customerPriceMinor = Math.round(
          supplierCostNgnMinor * band.multiplier,
        );
      }
      break;
    }
  }

  if (customerPriceMinor === null) {
    return {
      customerPriceMinor: null,
      customerPriceNgn: null,
      pricingSource: "unpriced",
      supplierCost: input.cost,
      supplierCurrency: currency,
    };
  }

  customerPriceMinor = roundPrice(
    customerPriceMinor,
    settings.rounding.mode,
  );

  return {
    customerPriceMinor,
    customerPriceNgn: customerPriceMinor / 100,
    pricingSource: "automatic_rule",
    supplierCost: input.cost,
    supplierCurrency: currency,
  };
}
