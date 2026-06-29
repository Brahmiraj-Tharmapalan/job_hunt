/**
 * Client-safe source metadata + country→board routing. Kept separate from
 * `lib/sources.ts` (which is `server-only` because it holds the Apify actor
 * logic) so the Settings form and the shared SettingsInput type can import it
 * without pulling server code into the browser.
 *
 * Sources are NOT chosen by hand: a sync automatically runs every board that
 * serves a country you selected. Global boards always run (they self-filter to
 * their supported countries inside the adapter); regional boards run only when a
 * country they serve is in your list. `relevantSources()` powers the read-only
 * "what we'll search" summary, and the maps below are the single source of truth
 * the server adapters route on.
 */

export type SourceId =
  | "linkedin"
  | "indeed"
  | "glassdoor"
  | "monster"
  | "naukri"
  | "naukrigulf"
  | "bayt"
  | "jobstreet"
  | "seek";

export const SOURCE_META: {
  id: SourceId;
  label: string;
  blurb: string;
}[] = [
  { id: "linkedin", label: "LinkedIn", blurb: "Global · all your countries" },
  { id: "indeed", label: "Indeed", blurb: "Global · 60 countries" },
  { id: "glassdoor", label: "Glassdoor", blurb: "Global · salaries & reviews" },
  { id: "monster", label: "Monster", blurb: "US, UK & Europe · 13 markets" },
  { id: "naukri", label: "Naukri", blurb: "India" },
  { id: "naukrigulf", label: "Naukri Gulf", blurb: "Gulf / Middle East" },
  { id: "bayt", label: "Bayt", blurb: "Gulf / Middle East" },
  { id: "jobstreet", label: "JobStreet", blurb: "SE Asia · Singapore, Malaysia" },
  { id: "seek", label: "Seek", blurb: "Australia & New Zealand" },
];

/** Boards that run for every search (they self-filter to supported countries). */
export const GLOBAL_SOURCES: SourceId[] = ["linkedin", "indeed", "glassdoor"];

// Regional boards: our full country name (lowercased) → that board's own code.
export const BAYT_COUNTRIES: Record<string, string> = {
  "united arab emirates": "uae",
  "saudi arabia": "saudi-arabia",
  qatar: "qatar",
  kuwait: "kuwait",
  bahrain: "bahrain",
  oman: "oman",
  egypt: "egypt",
  jordan: "jordan",
  lebanon: "lebanon",
  morocco: "morocco",
  pakistan: "pakistan",
};
// Monster runs one country per request from a fixed market dropdown; map our
// full names onto its ISO codes (Italy is offered too but isn't in our list).
export const MONSTER_COUNTRIES: Record<string, string> = {
  "united states": "US",
  "united kingdom": "GB",
  germany: "DE",
  canada: "CA",
  france: "FR",
  austria: "AT",
  netherlands: "NL",
  belgium: "BE",
  ireland: "IE",
  sweden: "SE",
  spain: "ES",
  switzerland: "CH",
  luxembourg: "LU",
};
// Naukrigulf takes a free-text location; map our full names onto its terms.
export const NAUKRIGULF_COUNTRIES: Record<string, string> = {
  "united arab emirates": "uae",
  "saudi arabia": "saudi arabia",
  qatar: "qatar",
  kuwait: "kuwait",
  bahrain: "bahrain",
  oman: "oman",
};
export const SEEK_COUNTRIES: Record<string, string> = {
  australia: "AU",
  "new zealand": "NZ",
};
export const JOBSTREET_COUNTRIES: Record<string, string> = {
  singapore: "SG",
  malaysia: "MY",
  indonesia: "ID",
  philippines: "PH",
};
export const NAUKRI_COUNTRIES = ["india"];

/** Countries each regional board serves (full names), for the routing summary. */
const REGIONAL_COUNTRIES: Partial<Record<SourceId, string[]>> = {
  monster: Object.keys(MONSTER_COUNTRIES),
  naukri: NAUKRI_COUNTRIES,
  naukrigulf: Object.keys(NAUKRIGULF_COUNTRIES),
  bayt: Object.keys(BAYT_COUNTRIES),
  jobstreet: Object.keys(JOBSTREET_COUNTRIES),
  seek: Object.keys(SEEK_COUNTRIES),
};

export type RelevantSource = { id: SourceId; label: string; matched: string[] };

/**
 * Which boards a sync will hit for the given country selection. Global boards
 * are always included (no matched-country list); a regional board appears only
 * if at least one country it serves is selected, with those countries listed.
 */
export function relevantSources(countries: string[]): RelevantSource[] {
  return SOURCE_META.flatMap((meta) => {
    if (GLOBAL_SOURCES.includes(meta.id)) {
      return [{ id: meta.id, label: meta.label, matched: [] }];
    }
    const serves = REGIONAL_COUNTRIES[meta.id] ?? [];
    const matched = countries.filter((c) =>
      serves.includes(c.toLowerCase().trim()),
    );
    return matched.length ? [{ id: meta.id, label: meta.label, matched }] : [];
  });
}
