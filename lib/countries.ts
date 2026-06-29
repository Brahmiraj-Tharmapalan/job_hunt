/**
 * Curated list of job markets we support, grouped by region. Used by the
 * settings country picker (the only place a user chooses countries) and by the
 * landing-page stat, so the "N countries supported" headline always matches the
 * list a user can actually pick from.
 *
 * Country names are the full English names the scrapers expect, and double as
 * the values stored in `job_settings.countries`.
 */
export type CountryGroup = {
  /** Region label shown as the section header. */
  region: string;
  countries: string[];
};

export const COUNTRY_GROUPS: CountryGroup[] = [
  {
    region: "Asia",
    countries: [
      "Singapore",
      "Japan",
      "South Korea",
      "Hong Kong",
      "Malaysia",
      "India",
      "Sri Lanka",
    ],
  },
  {
    region: "Middle East",
    countries: ["United Arab Emirates", "Qatar", "Saudi Arabia"],
  },
  {
    region: "Europe",
    countries: [
      "Switzerland",
      "Luxembourg",
      "Netherlands",
      "Denmark",
      "Norway",
      "Sweden",
      "Finland",
      "Germany",
      "Ireland",
      "Austria",
      "Belgium",
      "Poland",
      "United Kingdom",
      "France",
      "Spain",
      "Portugal",
    ],
  },
  {
    region: "North America",
    countries: ["United States", "Canada"],
  },
  {
    region: "Oceania",
    countries: ["Australia", "New Zealand"],
  },
];

/** Flat list of every supported country, in region order. */
export const ALL_COUNTRIES: string[] = COUNTRY_GROUPS.flatMap((g) => g.countries);

/** How many distinct countries the wired sources support. Drives the landing stat. */
export const COUNTRIES_SUPPORTED = ALL_COUNTRIES.length;

/**
 * Extra search terms that should roll up to a country. Job boards often label
 * roles by city or short name (e.g. "Dubai", "London", "USA") rather than the
 * full country name, so selecting the country should still catch them. Keyed by
 * the canonical country name above; only countries that need aliases appear.
 *
 * Consumed by `expandCountry` so the (eventual) matcher can compare a job's
 * location against the full set of terms for each selected country.
 */
export const COUNTRY_ALIASES: Record<string, string[]> = {
  "United Arab Emirates": ["UAE", "Dubai", "Abu Dhabi", "Sharjah"],
  "Saudi Arabia": ["KSA", "Riyadh", "Jeddah"],
  Qatar: ["Doha"],
  "United Kingdom": ["UK", "U.K.", "England", "Scotland", "Wales", "London"],
  "United States": ["USA", "U.S.", "U.S.A.", "US", "America"],
  "Hong Kong": ["HK"],
  "South Korea": ["Korea", "Republic of Korea"],
  Singapore: ["SG"],
  Netherlands: ["Holland", "The Netherlands"],
};

/**
 * All terms that should match a given country: the canonical name plus any
 * aliases. Returns just the name itself for countries without aliases. Use this
 * wherever a job's location is compared against a user's selected countries so
 * city- or short-name-labelled roles aren't missed.
 */
export function expandCountry(country: string): string[] {
  return [country, ...(COUNTRY_ALIASES[country] ?? [])];
}
