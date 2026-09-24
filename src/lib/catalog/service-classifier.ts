import {
  filterSupplierService,
  type ServiceFilterResult,
} from "@/lib/catalog/service-filter";

export type ServiceClassification =
  | "approved"
  | "review"
  | "blocked";

export type ServiceClassificationResult = {
  service: string;
  classification: ServiceClassification;
  reason: string;
  filter: ServiceFilterResult;
};

const KNOWN_APPROVED_SERVICES = new Set([
  "whatsapp",
  "telegram",
  "facebook",
  "tiktok",
  "instagram",
  "google",
  "googlevoice",
  "apple",
  "amazon",
  "discord",
  "uber",
  "microsoft",
  "linkedin",
  "twitter",
  "snapchat",
  "tinder",
  "netflix",
  "spotify",
  "steam",
  "paypal",
  "airbnb",
  "ebay",
  "aliexpress",
  "alibaba",
  "openai",
  "claudeai",
  "proton",
  "protonmail",
  "signal",
  "viber",
  "wechat",
  "weibo",
  "line",
  "kakaotalk",
  "reddit",
  "twitch",
  "zoom",
  "zoominfo",
  "github",
  "gitlab",
  "fiverr",
  "upwork",
  "wise",
  "revolut",
  "binance",
  "coinbase",
  "kraken",
  "kucoin",
  "tradingview",
  "shopify",
  "shopee",
  "lazada",
  "temu",
  "mcdonalds",
  "dominos",
  "booking",
  "bookingcom",
  "indeed",
  "airtel",
  "truecaller",
  "yahoo",
  "hotmail",
  "outlook",
]);

const REVIEW_PATTERNS = [
  /^dominate\d*$/i,
  /^jeet\d*$/i,
  /^my\d*circle$/i,
  /^sportgully$/i,
  /^uploaded$/i,
  /^winzo$/i,
  /^fan2play$/i,
  /^game/i,
  /^play/i,
  /^gamer/i,
  /^gaming/i,
  /^casino/i,
  /^win/i,
  /^jackpot/i,
  /^lotto/i,
  /^lottery/i,
  /^rummy/i,
];

export function classifySupplierService(
  service: string,
): ServiceClassificationResult {
  const normalized = service.trim().toLowerCase();
  const filter = filterSupplierService(normalized);

  if (!filter.allowed) {
    return {
      service: normalized,
      classification: "blocked",
      reason: filter.reason,
      filter,
    };
  }

  if (!normalized) {
    return {
      service: normalized,
      classification: "blocked",
      reason: "empty_service_name",
      filter,
    };
  }

  if (KNOWN_APPROVED_SERVICES.has(normalized)) {
    return {
      service: normalized,
      classification: "approved",
      reason: "known legitimate customer-facing service",
      filter,
    };
  }

  if (REVIEW_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      service: normalized,
      classification: "review",
      reason: "service name requires manual catalog review",
      filter,
    };
  }

  return {
    service: normalized,
    classification: "review",
    reason: "supplier service has not yet been verified for customer publication",
    filter,
  };
}

export function isApprovedSupplierService(service: string): boolean {
  return classifySupplierService(service).classification === "approved";
}
