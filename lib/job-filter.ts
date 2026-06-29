/**
 * Cheap, non-LLM pre-filter that runs before Gemini scoring. Its job is to throw
 * out obvious rejects for free, so we only spend a (rate-limited) Gemini call on
 * jobs that could plausibly match. See the sync spec in lib/gemini.ts: keeping
 * this filter aggressive is what keeps us inside the free-tier request budget.
 *
 * We deliberately do NOT try to judge experience years here — postings phrase it
 * too many ways to parse reliably with a regex, so that call is left to Gemini.
 */
import { expandCountry } from "@/lib/countries";

export type FilterableJob = {
  title: string;
  /** Full country name (may be a city/short-name that aliases resolve). */
  country: string;
  /** Free-text location line, also checked for country matches. */
  location: string;
};

export type Rejected<J> = { job: J; reason: string };

export type PreFilterResult<J> = {
  survivors: J[];
  rejected: Rejected<J>[];
};

/** Does `haystack` contain `term`? Short terms (UK, US, HK) need a word boundary
 * so "US" doesn't match inside an unrelated word; longer terms match anywhere. */
function contains(haystack: string, term: string): boolean {
  const h = haystack.toLowerCase();
  const t = term.toLowerCase().trim();
  if (!t) return false;
  if (t.length <= 3) {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(h);
  }
  return h.includes(t);
}

/**
 * Split jobs into those worth scoring and those rejected up front.
 *
 * - Blocked words: rejected if any appears in the TITLE (boards put seniority in
 *   the title, e.g. "Senior", "Lead"). Body text is left to Gemini.
 * - Countries: if the user selected any, the job's country/location must match
 *   one selected country or its aliases (so "Dubai" still matches "United Arab
 *   Emirates"). No countries selected = no location filter.
 */
export function preFilter<J extends FilterableJob>(
  jobs: J[],
  settings: { countries: string[]; blocked_words: string[] },
): PreFilterResult<J> {
  const blocked = settings.blocked_words
    .map((w) => w.trim())
    .filter(Boolean);

  // Every term (canonical + alias) for the user's selected countries, deduped.
  const allowedTerms = settings.countries.flatMap((c) => expandCountry(c));
  const filterByCountry = allowedTerms.length > 0;

  const survivors: J[] = [];
  const rejected: Rejected<J>[] = [];

  for (const job of jobs) {
    const hitWord = blocked.find((w) => contains(job.title, w));
    if (hitWord) {
      rejected.push({ job, reason: `Title contains blocked word “${hitWord}”` });
      continue;
    }

    if (filterByCountry) {
      const where = `${job.country} ${job.location}`;
      const matches = allowedTerms.some((term) => contains(where, term));
      if (!matches) {
        rejected.push({ job, reason: "Location isn’t in your selected countries" });
        continue;
      }
    }

    survivors.push(job);
  }

  return { survivors, rejected };
}
