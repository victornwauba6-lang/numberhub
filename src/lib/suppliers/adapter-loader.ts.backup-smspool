import type { SupplierAdapter } from "@/lib/suppliers/supplier-adapter";
import { createFiveSimAdapter } from "@/lib/suppliers/adapters/fivesim-adapter";
import { createTextVerifiedAdapter } from "@/lib/suppliers/adapters/textverified-adapter";

const configuredAdapters: Array<{
  slug: string;
  adapter: SupplierAdapter;
}> = [];

const fiveSimApiKey = process.env.FIVESIM_API_KEY?.trim();

if (fiveSimApiKey) {
  configuredAdapters.push({
    slug: "fivesim",
    adapter: createFiveSimAdapter(fiveSimApiKey),
  });
}

const textVerifiedEmail = process.env.TEXTVERIFIED_EMAIL?.trim();
const textVerifiedApiKey = process.env.TEXTVERIFIED_API_KEY?.trim();

if (textVerifiedEmail && textVerifiedApiKey) {
  configuredAdapters.push({
    slug: "textverified",
    adapter: createTextVerifiedAdapter({
      email: textVerifiedEmail,
      apiKey: textVerifiedApiKey,
    }),
  });
}

export function getConfiguredSupplierAdapters() {
  return configuredAdapters;
}

export function getConfiguredSupplierAdapterCount() {
  return configuredAdapters.length;
}
