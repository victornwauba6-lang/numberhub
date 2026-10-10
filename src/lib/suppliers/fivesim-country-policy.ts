export function isFiveSimAllowedOption(
  countryCode: string | null | undefined,
  serviceSlug: string | null | undefined,
): boolean {
  return (
    (countryCode ?? "").trim().toUpperCase() === "US" &&
    (serviceSlug ?? "").trim().toLowerCase() === "whatsapp"
  );
}
