const BLOCKED_EXACT_SERVICES = new Set([
  "other",
  "forwarding",

  // Clearly malformed supplier catalog entries.
  "cokfiight",
  "pureplatfrom",
]);

const BLOCKED_KEYWORDS = [
  "casino",
  "bet",
  "betting",
  "sportsbook",
  "gambling",
  "poker",
  "lottery",
  "lotto",
  "slots",
  "jackpot",
  "rummy",
  "wager",
  "bookmaker",
  "parimatch",
  "bet365",
  "betfair",
  "888casino",
  "icecasino",
  "32red",
  "azino",
  "dream11",
  "789jackpotsagent",
  "11bet",
  "22bet",
  "1xbet",
  "betano",
  "betboom",
  "betway",
  "betwinner",
  "betmaster",
  "betgames",
  "betlive",
  "betpro",
  "bet9ja",
  "betika",
  "betking",
  "betlion",
  "betpawa",
  "betway",
  "betwinner",
  "bets10",
  "betsafe",
  "betsson",
  "betstars",
  "bettilt",
  "bwin",
  "casino777",
  "casumo",
  "coolbet",
  "fortunejack",
  "fiewin",
  "fortunask",
  "galaxywin",
  "iplwin",
  "jungleerummy",
  "khelraja",
  "megapari",
  "mrgreen",
  "paddypower",
  "pgbonus",
  "playerzpot",
  "probo",
  "royalwin",
  "zupee",
];

const INTERNAL_SERVICE_PATTERNS = [
  /^other$/i,
  /^forwarding$/i,
];

export type ServiceFilterResult = {
  allowed: boolean;
  reason:
    | "allowed"
    | "blocked_exact"
    | "blocked_keyword"
    | "internal"
    | "invalid";
};

function normalizeServiceName(service: string): string {
  return service.trim().toLowerCase();
}

export function filterSupplierService(service: string): ServiceFilterResult {
  const normalized = normalizeServiceName(service);

  if (!normalized) {
    return {
      allowed: false,
      reason: "invalid",
    };
  }

  if (BLOCKED_EXACT_SERVICES.has(normalized)) {
    return {
      allowed: false,
      reason: "blocked_exact",
    };
  }

  if (INTERNAL_SERVICE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      allowed: false,
      reason: "internal",
    };
  }

  if (
    BLOCKED_KEYWORDS.some((keyword) => {
      if (keyword === "bet") {
        return /(^|[^a-z0-9])bet([^a-z0-9]|$)/i.test(normalized);
      }
      return normalized.includes(keyword);
    })
  ) {
    return {
      allowed: false,
      reason: "blocked_keyword",
    };
  }

  return {
    allowed: true,
    reason: "allowed",
  };
}

export function isCustomerFacingService(service: string): boolean {
  return filterSupplierService(service).allowed;
}
