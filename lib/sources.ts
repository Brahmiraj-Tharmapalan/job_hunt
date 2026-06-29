import "server-only";
import {
  runActor,
  parsePostedAt,
  publishedAtParam,
  type ApifyJob,
} from "@/lib/apify";
import {
  BAYT_COUNTRIES,
  MONSTER_COUNTRIES,
  NAUKRIGULF_COUNTRIES,
  SEEK_COUNTRIES,
  JOBSTREET_COUNTRIES,
  type SourceId,
} from "@/lib/sources-meta";

export { SOURCE_META, type SourceId } from "@/lib/sources-meta";

/**
 * Job-source registry. Each source is an Apify actor plus two pure functions:
 * `buildRuns` maps the user's saved filters onto one-or-more actor inputs, and
 * `normalize` maps a raw dataset row onto our source-agnostic `ApifyJob`. The
 * orchestrator (`fetchJobsFromSources`) runs every enabled source in parallel,
 * is best-effort per run (one source failing never kills the others), and
 * de-duplicates across sources so the same role posted on two boards lands once.
 *
 * Cost control: the user's `max_items` is a TOTAL budget split evenly across the
 * enabled sources, so turning on a second source widens coverage at roughly the
 * same spend rather than multiplying it.
 */

/** Cap on per-country Indeed runs so a 30-country list can't fan out to 30 runs. */
const MAX_INDEED_COUNTRIES = 8;

/** Countries the Indeed actor serves (its fixed dropdown); others fall through. */
const INDEED_COUNTRIES = new Set(
  [
    "united states", "angola", "argentina", "australia", "austria", "bahrain",
    "belgium", "brazil", "canada", "chile", "china", "colombia", "costa rica",
    "czech republic", "denmark", "ecuador", "egypt", "finland", "france",
    "germany", "greece", "hong kong", "hungary", "india", "indonesia", "ireland",
    "italy", "japan", "kuwait", "luxembourg", "mexico", "morocco", "netherlands",
    "new zealand", "nigeria", "norway", "oman", "pakistan", "panama", "peru",
    "philippines", "poland", "portugal", "romania", "saudi arabia", "singapore",
    "south africa", "south korea", "spain", "sweden", "switzerland", "taiwan",
    "thailand", "turkey", "ukraine", "united arab emirates", "united kingdom",
    "uruguay", "venezuela", "vietnam",
  ],
);

/** Map our look-back days to Seek's date-range codes (1/3/7/14/31). */
function seekDateRange(days: number): string {
  if (days <= 1) return "1";
  if (days <= 3) return "3";
  if (days <= 7) return "7";
  if (days <= 14) return "14";
  return "31";
}

export type SourceSearch = {
  search_keywords: string[];
  countries: string[];
  blocked_words: string[];
  published_within_days: number;
};

type RunSpec = { input: Record<string, unknown>; cap: number };

type Adapter = {
  id: SourceId;
  actor: string;
  buildRuns: (s: SourceSearch, budget: number) => RunSpec[];
  normalize: (row: Record<string, unknown>) => ApifyJob | null;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Map our look-back days to Indeed's fixed buckets (1/3/7/14/30). */
function indeedDatePosted(days: number): string {
  if (days <= 1) return "1";
  if (days <= 3) return "3";
  if (days <= 7) return "7";
  if (days <= 14) return "14";
  return "30";
}

/** Map our look-back days to Monster's fixed date-posted enum. */
function monsterDatePosted(days: number): string {
  if (days <= 1) return "TODAY";
  if (days <= 2) return "LAST_2_DAYS";
  if (days <= 7) return "LAST_WEEK";
  if (days <= 14) return "LAST_2_WEEKS";
  return "LAST_MONTH";
}

const linkedin: Adapter = {
  id: "linkedin",
  actor: "cheap_scraper~linkedin-job-scraper",
  buildRuns: (s, budget) => [
    {
      input: {
        keyword: s.search_keywords,
        locations: s.countries,
        publishedAt: publishedAtParam(s.published_within_days),
        // Actor excludes these whole-word from titles before we're billed.
        jobTitleExclude: s.blocked_words,
        // Actor enforces a 150-result floor; we slice down to the cap after.
        maxItems: Math.max(150, budget),
        saveOnlyUniqueItems: true,
      },
      cap: budget,
    },
  ],
  normalize: (row) => {
    const jobId = str(row.jobId);
    const title = str(row.jobTitle);
    if (!jobId || !title) return null;
    const url = str(row.jobUrl);
    return {
      external_id: `linkedin:${jobId}`,
      title,
      company: str(row.companyName),
      location: str(row.location),
      country: str(row.location),
      url,
      apply_url: str(row.applyUrl) || url,
      description: str(row.jobDescription),
      posted_at: parsePostedAt(str(row.publishedAt), str(row.postedTime)),
    };
  },
};

const indeed: Adapter = {
  id: "indeed",
  actor: "cheap_scraper~indeed-job-scraper",
  buildRuns: (s, budget) => {
    const countries = s.countries
      .filter((c) => INDEED_COUNTRIES.has(c.toLowerCase().trim()))
      .slice(0, MAX_INDEED_COUNTRIES);
    if (countries.length === 0) return [];
    const perCountry = Math.max(10, Math.ceil(budget / countries.length));
    const datePosted = indeedDatePosted(s.published_within_days);
    return countries.map((country) => ({
      input: {
        keywords: s.search_keywords,
        country,
        // The actor needs a location string; the country name searches it wide.
        location: country,
        datePosted,
        maxItems: perCountry,
        saveOnlyUniqueItems: true,
      },
      cap: perCountry,
    }));
  },
  normalize: (row) => {
    const key = str(row.key);
    const title = str(row.title);
    if (!key || !title) return null;
    const company = (row.company ?? {}) as Record<string, unknown>;
    const loc = (row.location ?? {}) as Record<string, unknown>;
    const where =
      [str(loc.city), str(loc.state)].filter(Boolean).join(", ") ||
      str(loc.country);
    const url = str(row.jobUrl);
    return {
      external_id: `indeed:${key}`,
      title,
      company: str(company.companyName),
      location: where,
      country: str(loc.country),
      url,
      apply_url: str(row.applyUrl) || url,
      description: str(row.description_text),
      posted_at: parsePostedAt(str(row.datePublished)),
    };
  },
};

// Monster — a major US/UK/Europe board. Single market per run from a fixed
// country dropdown (one run per selected market it serves), with one search
// term per run since its `query` is a single string, not a list.
const monster: Adapter = {
  id: "monster",
  actor: "blackfalcondata~monster-scraper",
  buildRuns: (s, budget) => {
    const codes = [
      ...new Set(
        s.countries
          .map((c) => MONSTER_COUNTRIES[c.toLowerCase().trim()])
          .filter(Boolean),
      ),
    ];
    if (codes.length === 0) return [];
    const keywords = s.search_keywords.length
      ? s.search_keywords
      : ["software engineer"];
    // Country × keyword, capped so a long list can't fan out to dozens of runs.
    const pairs = codes
      .flatMap((country) => keywords.map((query) => ({ country, query })))
      .slice(0, MAX_INDEED_COUNTRIES);
    const perRun = Math.max(10, Math.ceil(budget / pairs.length));
    const datePosted = monsterDatePosted(s.published_within_days);
    return pairs.map(({ country, query }) => ({
      input: { query, country, maxResults: perRun, datePosted },
      cap: perRun,
    }));
  },
  normalize: (row) => {
    const jobId = str(row.jobId);
    const title = str(row.title);
    if (!jobId || !title) return null;
    const where =
      [str(row.city), str(row.state)].filter(Boolean).join(", ") ||
      str(row.location);
    const url = str(row.url) || str(row.portalUrl);
    return {
      external_id: `monster:${jobId}`,
      title,
      company: str(row.company),
      location: where,
      country: str(row.country),
      url,
      apply_url: str(row.applyUrl) || url,
      description: str(row.description),
      posted_at: parsePostedAt(str(row.postedDate)),
    };
  },
};

const naukri: Adapter = {
  id: "naukri",
  actor: "thirdwatch~naukri-jobs-scraper",
  buildRuns: (s, budget) => {
    // Naukri is India-only; skip entirely unless India is a target country.
    if (!s.countries.some((c) => c.toLowerCase().trim() === "india")) return [];
    const keywords = s.search_keywords.length
      ? s.search_keywords
      : ["software engineer"];
    const perQuery = Math.max(5, Math.ceil(budget / keywords.length));
    return [
      {
        input: {
          queries: keywords,
          maxResultsPerQuery: perQuery,
          scrapeMode: "full", // full = includes the description we score on
        },
        cap: budget,
      },
    ];
  },
  normalize: (row) => {
    const title = str(row.title);
    const applyUrl = str(row.apply_url);
    if (!title || !applyUrl) return null;
    const exp = str(row.experience);
    const desc = str(row.description);
    return {
      external_id: `naukri:${applyUrl}`,
      title,
      company: str(row.company_name),
      location: str(row.location) || "India",
      country: "India",
      url: applyUrl,
      apply_url: applyUrl,
      // Naukri keeps the years requirement in a separate field; fold it into the
      // description so the Gemini experience/language gate can see it.
      description: exp ? `${desc}\n\nExperience required: ${exp}` : desc,
      posted_at: parsePostedAt(str(row.posted_at) || str(row.posted_date)),
    };
  },
};

// Naukrigulf — the Gulf arm of Naukri (UAE, Saudi, Qatar, Kuwait, Bahrain,
// Oman). blackfalcondata input family (same as Monster/Seek); one run per
// selected Gulf country, with `location` set to that country's search term and
// the keywords folded into the comma-separated `query` the actor expects.
const naukrigulf: Adapter = {
  id: "naukrigulf",
  actor: "blackfalcondata~naukrigulf-scraper",
  buildRuns: (s, budget) => {
    const locations = [
      ...new Set(
        s.countries
          .map((c) => NAUKRIGULF_COUNTRIES[c.toLowerCase().trim()])
          .filter(Boolean),
      ),
    ];
    if (locations.length === 0) return [];
    const perCountry = Math.max(10, Math.ceil(budget / locations.length));
    const query = (
      s.search_keywords.length ? s.search_keywords : ["software engineer"]
    ).join(", ");
    return locations.map((location) => ({
      input: {
        mode: "search",
        query,
        location,
        maxResults: perCountry,
        includeDetails: true, // pulls the full description we score on
      },
      cap: perCountry,
    }));
  },
  normalize: (row) => {
    const jobId = str(row.jobId);
    const title = str(row.title);
    if (!jobId || !title) return null;
    const url = str(row.url) || str(row.portalUrl);
    return {
      external_id: `naukrigulf:${jobId}`,
      title,
      company: str(row.company),
      location: str(row.location),
      country: str(row.jobCountry) || str(row.location),
      url,
      apply_url: url,
      description: str(row.description) || str(row.summary),
      posted_at: parsePostedAt(str(row.postedAt)),
    };
  },
};

// Glassdoor — same cheap_scraper input family as Indeed (keywords[] + country +
// location), but the dataset row keeps location as flat fields.
const glassdoor: Adapter = {
  id: "glassdoor",
  actor: "cheap_scraper~glassdoor-jobs-scraper-remove-duplicate-jobs",
  buildRuns: (s, budget) => {
    const countries = s.countries
      .filter((c) => INDEED_COUNTRIES.has(c.toLowerCase().trim()))
      .slice(0, MAX_INDEED_COUNTRIES);
    if (countries.length === 0) return [];
    const perCountry = Math.max(10, Math.ceil(budget / countries.length));
    const datePosted = indeedDatePosted(s.published_within_days);
    return countries.map((country) => ({
      input: {
        keywords: s.search_keywords,
        country,
        location: country,
        datePosted,
        maxItems: perCountry,
        saveOnlyUniqueItems: true,
      },
      cap: perCountry,
    }));
  },
  normalize: (row) => {
    const key = str(row.key);
    const title = str(row.title);
    if (!key || !title) return null;
    const company = (row.company ?? {}) as Record<string, unknown>;
    const where =
      [str(row.location_city), str(row.location_state)]
        .filter(Boolean)
        .join(", ") || str(row.location_country);
    const url = str(row.jobUrl);
    return {
      external_id: `glassdoor:${key}`,
      title,
      company: str(company.companyName),
      location: where,
      country: str(row.location_country),
      url,
      apply_url: str(row.applyUrl) || url,
      description: str(row.description_text),
      posted_at: parsePostedAt(str(row.datePublished)),
    };
  },
};

// Bayt — the Middle East / Gulf standard. Its rows carry only a short summary
// (no full body), which is enough for the skills score but thinner for the
// experience/language gate.
const bayt: Adapter = {
  id: "bayt",
  actor: "makework36~bayt-jobs-scraper",
  buildRuns: (s, budget) => {
    const codes = [
      ...new Set(
        s.countries
          .map((c) => BAYT_COUNTRIES[c.toLowerCase().trim()])
          .filter(Boolean),
      ),
    ].slice(0, MAX_INDEED_COUNTRIES);
    if (codes.length === 0) return [];
    const perCountry = Math.max(10, Math.ceil(budget / codes.length));
    return codes.map((country) => ({
      input: {
        mode: "keywords",
        keywords: s.search_keywords,
        country,
        maxJobs: perCountry,
      },
      cap: perCountry,
    }));
  },
  normalize: (row) => {
    const jobId = str(row.jobId);
    const title = str(row.title);
    if (!jobId || !title) return null;
    const url = str(row.jobUrl);
    return {
      external_id: `bayt:${jobId}`,
      title,
      company: str(row.company),
      location: str(row.location),
      country: str(row.location),
      url,
      apply_url: url,
      description: str(row.summary),
      posted_at: parsePostedAt(str(row.postedDate)),
    };
  },
};

// Seek (AU/NZ) and JobStreet (SE Asia) are the same blackfalcondata SEEK-platform
// scraper with the same I/O, differing only in actor + which country codes apply.
function seekFamilyRuns(
  countryMap: Record<string, string>,
  s: SourceSearch,
  budget: number,
): RunSpec[] {
  const codes = [
    ...new Set(
      s.countries.map((c) => countryMap[c.toLowerCase().trim()]).filter(Boolean),
    ),
  ];
  if (codes.length === 0) return [];
  const perCountry = Math.max(10, Math.ceil(budget / codes.length));
  // `query` accepts a JSON-array string for OR across multiple terms.
  const query = JSON.stringify(
    s.search_keywords.length ? s.search_keywords : ["software engineer"],
  );
  const dateRange = seekDateRange(s.published_within_days);
  return codes.map((country) => ({
    input: {
      query,
      country,
      maxResults: perCountry,
      dateRange,
      includeDetails: true,
      excludeKeywords: s.blocked_words,
    },
    cap: perCountry,
  }));
}

function normalizeSeekFamily(
  prefix: string,
  row: Record<string, unknown>,
): ApifyJob | null {
  const jobId = str(row.jobId);
  const title = str(row.title);
  if (!jobId || !title) return null;
  const url =
    str(row.canonicalUrl) || str(row.sourceUrl) || str(row.applyUrl);
  return {
    external_id: `${prefix}:${jobId}`,
    title,
    company: str(row.company),
    location: str(row.location),
    country: str(row.locationCountry),
    url,
    apply_url: str(row.applyUrl) || url,
    description: str(row.description),
    posted_at: parsePostedAt(str(row.postedDate)),
  };
}

const seek: Adapter = {
  id: "seek",
  actor: "blackfalcondata~seek-scraper",
  buildRuns: (s, budget) => seekFamilyRuns(SEEK_COUNTRIES, s, budget),
  normalize: (row) => normalizeSeekFamily("seek", row),
};

const jobstreet: Adapter = {
  id: "jobstreet",
  actor: "blackfalcondata~jobstreet-scraper",
  buildRuns: (s, budget) => seekFamilyRuns(JOBSTREET_COUNTRIES, s, budget),
  normalize: (row) => normalizeSeekFamily("jobstreet", row),
};

const ADAPTERS: Record<SourceId, Adapter> = {
  linkedin,
  indeed,
  glassdoor,
  monster,
  naukri,
  naukrigulf,
  bayt,
  jobstreet,
  seek,
};

/** Drop cross-source duplicates: same posting id, or same title+company. */
function dedupe(jobs: ApifyJob[]): ApifyJob[] {
  const seenId = new Set<string>();
  const seenKey = new Set<string>();
  const out: ApifyJob[] = [];
  for (const j of jobs) {
    if (seenId.has(j.external_id)) continue;
    const key = `${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}`;
    if (j.company && seenKey.has(key)) continue;
    seenId.add(j.external_id);
    if (j.company) seenKey.add(key);
    out.push(j);
  }
  return out;
}

/**
 * Scrape every enabled source in parallel and return merged, de-duplicated jobs.
 * Best-effort: a single source/run failing is skipped, not fatal — we only throw
 * if EVERY run failed (so the caller's error path still fires on a total bust).
 */
export async function fetchJobsFromSources(
  apiKey: string,
  search: SourceSearch & { max_items: number },
  deadline?: number,
): Promise<ApifyJob[]> {
  // Every board self-filters by country (its buildRuns returns [] when none of
  // the selected countries apply), so we run them ALL and keep the ones that
  // actually produce runs — no manual source selection needed.
  const active = Object.values(ADAPTERS).filter(
    (a) => a.buildRuns(search, 1).length > 0,
  );
  if (active.length === 0) return [];

  // Split the total item budget evenly across the active boards, so widening
  // coverage costs ~the same total scrape rather than multiplying it.
  const budget = Math.max(20, Math.ceil(search.max_items / active.length));

  const runs = active.flatMap((a) =>
    a.buildRuns(search, budget).map((spec) => ({ adapter: a, spec })),
  );
  if (runs.length === 0) return [];

  const settled = await Promise.allSettled(
    runs.map((r) => runActor(apiKey, r.adapter.actor, r.spec.input, deadline)),
  );

  const out: ApifyJob[] = [];
  let anyOk = false;
  let firstError = "";
  settled.forEach((res, i) => {
    if (res.status === "fulfilled") {
      anyOk = true;
      const { adapter, spec } = runs[i];
      const jobs = res.value
        .map(adapter.normalize)
        .filter((j): j is ApifyJob => j !== null)
        .slice(0, spec.cap);
      out.push(...jobs);
    } else if (!firstError) {
      firstError =
        res.reason instanceof Error ? res.reason.message : String(res.reason);
    }
  });

  if (!anyOk) throw new Error(firstError || "All job sources failed.");
  return dedupe(out);
}
