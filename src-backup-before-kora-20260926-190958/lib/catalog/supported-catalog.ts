export type SupportedCatalogCountry = {
  code: string;
  name: string;
  flagEmoji: string;
  supplierCountry: string;
  sortOrder: number;
};

export type SupportedCatalogService = {
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
};

export const SUPPORTED_CATALOG_COUNTRIES: SupportedCatalogCountry[] = [
  { code: "US", name: "United States", flagEmoji: "🇺🇸", supplierCountry: "usa", sortOrder: 10 },
  { code: "GB", name: "United Kingdom", flagEmoji: "🇬🇧", supplierCountry: "england", sortOrder: 20 },
  { code: "CA", name: "Canada", flagEmoji: "🇨🇦", supplierCountry: "canada", sortOrder: 30 },
  { code: "DE", name: "Germany", flagEmoji: "🇩🇪", supplierCountry: "germany", sortOrder: 40 },
  { code: "NG", name: "Nigeria", flagEmoji: "🇳🇬", supplierCountry: "nigeria", sortOrder: 50 },
  { code: "IN", name: "India", flagEmoji: "🇮🇳", supplierCountry: "india", sortOrder: 60 },
  { code: "AU", name: "Australia", flagEmoji: "🇦🇺", supplierCountry: "australia", sortOrder: 70 },
  { code: "FR", name: "France", flagEmoji: "🇫🇷", supplierCountry: "france", sortOrder: 80 },
  { code: "ZA", name: "South Africa", flagEmoji: "🇿🇦", supplierCountry: "southafrica", sortOrder: 90 },
  { code: "GH", name: "Ghana", flagEmoji: "🇬🇭", supplierCountry: "ghana", sortOrder: 100 },
  { code: "KE", name: "Kenya", flagEmoji: "🇰🇪", supplierCountry: "kenya", sortOrder: 110 },
  { code: "AE", name: "United Arab Emirates", flagEmoji: "🇦🇪", supplierCountry: "uae", sortOrder: 120 },
  { code: "SA", name: "Saudi Arabia", flagEmoji: "🇸🇦", supplierCountry: "saudiarabia", sortOrder: 130 },
  { code: "BR", name: "Brazil", flagEmoji: "🇧🇷", supplierCountry: "brazil", sortOrder: 140 },
  { code: "MX", name: "Mexico", flagEmoji: "🇲🇽", supplierCountry: "mexico", sortOrder: 150 },
  { code: "ES", name: "Spain", flagEmoji: "🇪🇸", supplierCountry: "spain", sortOrder: 160 },
  { code: "IT", name: "Italy", flagEmoji: "🇮🇹", supplierCountry: "italy", sortOrder: 170 },
  { code: "NL", name: "Netherlands", flagEmoji: "🇳🇱", supplierCountry: "netherlands", sortOrder: 180 },
  { code: "PL", name: "Poland", flagEmoji: "🇵🇱", supplierCountry: "poland", sortOrder: 190 },
  { code: "JP", name: "Japan", flagEmoji: "🇯🇵", supplierCountry: "japan", sortOrder: 200 },
  { code: "ID", name: "Indonesia", flagEmoji: "🇮🇩", supplierCountry: "indonesia", sortOrder: 210 },
  { code: "PH", name: "Philippines", flagEmoji: "🇵🇭", supplierCountry: "philippines", sortOrder: 220 },
  { code: "TH", name: "Thailand", flagEmoji: "🇹🇭", supplierCountry: "thailand", sortOrder: 230 },
  { code: "VN", name: "Vietnam", flagEmoji: "🇻🇳", supplierCountry: "vietnam", sortOrder: 240 },
];

export const SUPPORTED_CATALOG_SERVICES: SupportedCatalogService[] = [
  { slug: "whatsapp", name: "WhatsApp", icon: "MessageCircle", sortOrder: 10 },
  { slug: "telegram", name: "Telegram", icon: "Send", sortOrder: 20 },
  { slug: "facebook", name: "Facebook", icon: "Facebook", sortOrder: 30 },
  { slug: "instagram", name: "Instagram", icon: "Instagram", sortOrder: 40 },
  { slug: "tiktok", name: "TikTok", icon: "Music2", sortOrder: 50 },
  { slug: "twitter", name: "X / Twitter", icon: "Twitter", sortOrder: 60 },
  { slug: "signal", name: "Signal", icon: "ShieldCheck", sortOrder: 70 },
  { slug: "discord", name: "Discord", icon: "Gamepad2", sortOrder: 80 },
  { slug: "snapchat", name: "Snapchat", icon: "Ghost", sortOrder: 90 },
  { slug: "linkedin", name: "LinkedIn", icon: "Linkedin", sortOrder: 100 },
  { slug: "google", name: "Google", icon: "Search", sortOrder: 110 },
  { slug: "microsoft", name: "Microsoft", icon: "Monitor", sortOrder: 120 },
  { slug: "apple", name: "Apple", icon: "Apple", sortOrder: 130 },
  { slug: "amazon", name: "Amazon", icon: "ShoppingBag", sortOrder: 140 },
  { slug: "ebay", name: "eBay", icon: "ShoppingCart", sortOrder: 150 },
];

export function getSupportedCountry(code: string) {
  const normalized = code.trim().toUpperCase();

  return SUPPORTED_CATALOG_COUNTRIES.find(
    (country) => country.code === normalized,
  );
}

export function getSupplierCountry(code: string) {
  return getSupportedCountry(code)?.supplierCountry ?? code.trim().toLowerCase();
}

export function getSupportedService(slug: string) {
  const normalized = slug.trim().toLowerCase();

  return SUPPORTED_CATALOG_SERVICES.find(
    (service) => service.slug === normalized,
  );
}
