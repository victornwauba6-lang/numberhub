const FIVESIM_ALLOWED_COUNTRIES = new Set(["US", "CA", "GB"]);

export function isFiveSimAllowedCountry(
  countryCode: string | null | undefined,
): boolean {
  return FIVESIM_ALLOWED_COUNTRIES.has(
    (countryCode ?? "").trim().toUpperCase(),
  );
}
