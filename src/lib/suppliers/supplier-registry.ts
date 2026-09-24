import {
  createUnavailableSupplierAdapter,
  type SupplierAdapter,
} from "@/lib/suppliers/supplier-adapter";
import { getConfiguredSupplierAdapters } from "@/lib/suppliers/adapter-loader";

const SUPPLIER_ADAPTERS: Record<string, SupplierAdapter> = {};

let adaptersLoaded = false;

function normalizeSupplierSlug(supplierSlug: string) {
  const normalizedSlug = supplierSlug.trim().toLowerCase();

  if (!normalizedSlug) {
    throw new Error("Supplier slug is required");
  }

  return normalizedSlug;
}

function ensureAdaptersLoaded() {
  if (adaptersLoaded) {
    return;
  }

  adaptersLoaded = true;

  for (const entry of getConfiguredSupplierAdapters()) {
    registerSupplierAdapter(entry.slug, entry.adapter);
  }
}

export function registerSupplierAdapter(
  supplierSlug: string,
  adapter: SupplierAdapter,
) {
  const normalizedSlug = normalizeSupplierSlug(supplierSlug);

  SUPPLIER_ADAPTERS[normalizedSlug] = adapter;
}

export function getSupplierAdapter(
  supplierSlug: string,
  supplierName: string,
): SupplierAdapter {
  const normalizedSlug = normalizeSupplierSlug(supplierSlug);

  ensureAdaptersLoaded();

  return (
    SUPPLIER_ADAPTERS[normalizedSlug] ??
    createUnavailableSupplierAdapter(supplierName)
  );
}

export function isSupplierAdapterRegistered(
  supplierSlug: string,
): boolean {
  const normalizedSlug = normalizeSupplierSlug(supplierSlug);

  ensureAdaptersLoaded();

  return Boolean(SUPPLIER_ADAPTERS[normalizedSlug]);
}

export function listRegisteredSupplierAdapters(): string[] {
  ensureAdaptersLoaded();

  return Object.keys(SUPPLIER_ADAPTERS).sort();
}
