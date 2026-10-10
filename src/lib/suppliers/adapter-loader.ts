import type { SupplierAdapter } from "@/lib/suppliers/supplier-adapter";
import { createFiveSimAdapter } from "@/lib/suppliers/adapters/fivesim-adapter";
import { createTextVerifiedAdapter } from "@/lib/suppliers/adapters/textverified-adapter";
import { createSmsPoolAdapter } from "@/lib/suppliers/adapters/smspool-adapter";
import { createSmsBulkAdapter } from "@/lib/suppliers/adapters/smsbulk-adapter";

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

const smsPoolApiKey = process.env.SMSPOOL_API_KEY?.trim();

if (smsPoolApiKey) {
  configuredAdapters.push({
    slug: "smspool",
    adapter: createSmsPoolAdapter(smsPoolApiKey),
  });
}

const smsBulkApiKey = process.env.SMSBULK_API_KEY?.trim();

if (smsBulkApiKey) {
  configuredAdapters.push({
    slug: "smsbulk",
    adapter: createSmsBulkAdapter(smsBulkApiKey),
  });
}

export function getConfiguredSupplierAdapters() {
  return configuredAdapters;
}

export function getConfiguredSupplierAdapterCount() {
  return configuredAdapters.length;
}
