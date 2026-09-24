import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

const SUPPLIER_ALIASES: Record<string, string> = {
  usa: "US",
  us: "US",
  unitedstates: "US",
  "united states": "US",
  "united states of america": "US",
  "bosnia and herzegovina": "BA",
  "republic of the congo": "CG",
  "republic of the gambia": "GM",
  "united republic of tanzania": "TZ",
  "taiwan, province of china": "TW",
  "the republic of north macedonia": "MK",
  "lao people's democratic republic": "LA",
  "moldova, republic of": "MD",
  england: "GB",
  uk: "GB",
  gb: "GB",
  "united kingdom": "GB",
  russia: "RU",
  vietnam: "VN",
  southkorea: "KR",
  "south korea": "KR",
  "uae": "AE",
  "united arab emirates": "AE",
  "south africa": "ZA",
  "saudi arabia": "SA",
  "hong kong": "HK",
  "czech republic": "CZ",
  "ivory coast": "CI",
  "cote d'ivoire": "CI",
  antiguaandbarbuda: "AG",
  bhutane: "BT",
  burkinafaso: "BF",
  capeverde: "CV",
  costarica: "CR",
  czech: "CZ",
  dominicana: "DO",
  easttimor: "TL",
  equatorialguinea: "GQ",
  frenchguiana: "GF",
  guineabissau: "GW",
  hongkong: "HK",
  ivorycoast: "CI",
  laos: "LA",
  macau: "MO",
  moldova: "MD",
  newcaledonia: "NC",
  northmacedonia: "MK",
  papuanewguinea: "PG",
  puertorico: "PR",
  saintkittsandnevis: "KN",
  saintlucia: "LC",
  saintvincentandgrenadines: "VC",
  salvador: "SV",
  saudiarabia: "SA",
  sierraleone: "SL",
  solomonislands: "SB",
  southafrica: "ZA",
  srilanka: "LK",
  swaziland: "SZ",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

export type ResolvedCountry = {
  iso2: string;
  name: string;
  supplierCountry: string;
};

export function resolveCountry(
  value: string,
): ResolvedCountry | null {
  const normalized = normalizeKey(value);

  if (!normalized) {
    return null;
  }

  const compact = normalized.replace(/\s+/g, "");

  const alias =
    SUPPLIER_ALIASES[normalized] ??
    SUPPLIER_ALIASES[compact];

  let iso2: string | null = alias ?? null;

  if (
    !iso2 &&
    /^[A-Z]{2}$/.test(normalized.toUpperCase()) &&
    countries.isValid(normalized.toUpperCase())
  ) {
    iso2 = normalized.toUpperCase();
  }

  if (!iso2) {
    iso2 =
      countries.getAlpha2Code(
        normalized,
        "en",
      ) ?? null;
  }

  if (!iso2) {
    return null;
  }

  const name =
    countries.getName(iso2, "en") ??
    value.trim();

  return {
    iso2,
    name,
    supplierCountry: normalized,
  };
}

export function getCountryName(
  iso2: string,
): string | null {
  const normalized = iso2.trim().toUpperCase();

  if (!countries.isValid(normalized)) {
    return null;
  }

  return countries.getName(normalized, "en") ?? null;
}
