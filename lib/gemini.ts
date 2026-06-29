import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Gemini Flash: multimodal, reads PDFs natively. Cheap/free-tier friendly.
// 2.5-flash has broad free-tier availability; the older 2.0-flash often returns
// 429 on fresh keys. Override with GEMINI_MODEL if your key differs.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export const cvExtractionSchema = z.object({
  required_skills: z
    .array(z.string())
    .describe(
      "The candidate's strongest, primary technical skills/stack. Canonical short names (e.g. 'React', 'Next.js', 'TypeScript').",
    ),
  secondary_skills: z
    .array(z.string())
    .describe("Tools/skills they know but are secondary. Canonical short names."),
  countries: z
    .array(z.string())
    .describe(
      "Countries the candidate can or wants to work in. Infer from stated location, citizenship, or work eligibility. Full country names.",
    ),
});

export type CvExtraction = z.infer<typeof cvExtractionSchema>;

const PROMPT = `You are parsing a candidate's CV/resume to set up a job search.
Extract:
- required_skills: their strongest, primary technical skills (the stack they'd be hired for).
- secondary_skills: tools/skills they know but are not core.
- countries: countries they can or want to work in (infer from location, citizenship, visa/work-eligibility notes; if none stated, return an empty array).
Use concise canonical names. Do not invent skills that aren't supported by the CV.`;

/** Extract structured skills/countries from a CV PDF using the user's Gemini key. */
export async function parseCvWithGemini(
  apiKey: string,
  pdf: Uint8Array,
): Promise<CvExtraction> {
  const google = createGoogleGenerativeAI({ apiKey });

  const { object } = await generateObject({
    model: google(GEMINI_MODEL),
    schema: cvExtractionSchema,
    // Fail fast on quota/rate errors instead of hammering the free tier.
    maxRetries: 1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          {
            type: "file",
            data: pdf,
            mediaType: "application/pdf",
            filename: "cv.pdf",
          },
        ],
      },
    ],
  });

  return {
    required_skills: tidy(object.required_skills),
    secondary_skills: tidy(object.secondary_skills),
    countries: tidy(object.countries),
  };
}

/*
 * Job scoring pass. Designed around the observed free-tier limits for a typical
 * user key (Gemini 2.5 Flash): ~5 requests/min, ~250K tokens/min, ~20
 * requests/DAY. The daily request count is the binding constraint, so the rule
 * is "few calls, each packed full of jobs":
 *   1. Pre-filter with cheap, non-LLM rules first (lib/job-filter) so only
 *      plausible jobs reach Gemini. Spend calls on survivors, not rejects.
 *   2. Batch many jobs per call (BATCH_SIZE below) — TPM is generous, RPD is not.
 *   3. Send only title + a trimmed description snippet, never the whole posting.
 *   4. Space batches out to stay under RPM.
 * With ~50 jobs/batch and 20 calls/day this covers ~1000 jobs/day — matching the
 * `max_items` cap. Run as one scheduled sync per user per day, not on demand.
 */

/** Jobs per Gemini call. Tuned so output stays reliable while keeping calls
 * (RPD) low; raise toward ~50 once outputs prove stable on real data. */
const BATCH_SIZE = 25;
/** Pause between batches to respect ~5 requests/min on the free tier. */
const BATCH_DELAY_MS = 13_000;
/** Rough cost of one scoring call, used only to decide whether the next batch
 * can still finish before a caller's wall-clock deadline. Generous on purpose —
 * better to defer a batch to the backlog than to start one we can't finish. */
const EST_BATCH_MS = 9_000;

export const jobScoreSchema = z.object({
  scores: z.array(
    z.object({
      external_id: z.string().describe("Echo back the job's external_id exactly."),
      required_years: z
        .number()
        .nullable()
        .describe(
          "MINIMUM years of experience the posting demands. For a range like '6-10 years' use the lower bound (6); for '5+ years' use 5. null ONLY if the posting states no experience requirement at all.",
        ),
      experience_fit: z
        .boolean()
        .describe(
          "False when the role wants someone more senior than the candidate — i.e. required_years exceeds the candidate's MAXIMUM target years. True when required_years is within the target band or is null. A role demanding more experience than the candidate has is NOT a fit even if the skills match.",
        ),
      disqualified: z
        .boolean()
        .describe(
          "True only if the posting HARD-REQUIRES something on the candidate's block list — judged from the FULL description, not just the title. The main case is a spoken language the candidate didn't list (e.g. the role requires fluency in French). A mere mention or 'nice to have' does NOT disqualify.",
        ),
      disqualifier: z
        .string()
        .nullable()
        .describe(
          "Which blocked term made it a hard requirement (e.g. 'French'), or null if not disqualified.",
        ),
      score: z
        .number()
        .min(0)
        .max(100)
        .describe(
          "0-100 relevance of the role to the candidate's PRIMARY skills and target titles. Secondary skills nudge it up.",
        ),
      reason: z
        .string()
        .describe("One short sentence: why this score (skills matched/missing)."),
    }),
  ),
});

export type JobScore = z.infer<typeof jobScoreSchema>["scores"][number];

/** Minimal job shape we send to Gemini — title + a trimmed description. */
export type ScoreableJob = {
  external_id: string;
  title: string;
  description: string;
};

export type ScoreSettings = {
  required_skills: string[];
  secondary_skills: string[];
  min_experience_years: number | null;
  max_experience_years: number | null;
  /** Hard blockers (e.g. languages the candidate doesn't speak). Checked against
   * the full description, not just the title. */
  blocked_words: string[];
};

function band(settings: ScoreSettings): string {
  const { min_experience_years: lo, max_experience_years: hi } = settings;
  if (lo == null && hi == null) return "no specific experience range";
  if (lo != null && hi != null) return `${lo}-${hi} years`;
  if (lo != null) return `at least ${lo} years`;
  return `at most ${hi} years`;
}

/**
 * Score a batch of jobs against the user's filters with their Gemini key.
 * Chunks into BATCH_SIZE calls and spaces them out. Returns one JobScore per
 * job that Gemini returned (keyed by external_id by the caller).
 */
export async function scoreJobsWithGemini(
  apiKey: string,
  jobs: ScoreableJob[],
  settings: ScoreSettings,
  deadline?: number,
): Promise<JobScore[]> {
  if (jobs.length === 0) return [];
  const google = createGoogleGenerativeAI({ apiKey });

  const primary = settings.required_skills.join(", ") || "(none given)";
  const secondary = settings.secondary_skills.join(", ") || "(none given)";
  // Only languages make sense as a body-checked hard blocker; seniority terms are
  // already handled by the title pre-filter + the experience gate, so we don't
  // re-block them from the description (that would skip jobs that merely mention
  // a "senior team", etc.). Pass the user's block list and let Gemini apply it.
  const blockers = settings.blocked_words.join(", ");
  const blockRule = blockers
    ? `Candidate's hard blockers (mainly languages they don't speak): ${blockers}. Set disqualified=true ONLY when the description makes one of these a genuine REQUIREMENT (e.g. "must be fluent in French" when French is blocked); a passing mention or "plus"/"nice to have" never disqualifies. Put the matched term in disqualifier.`
    : `No hard blockers — always return disqualified=false, disqualifier=null.`;
  const hi = settings.max_experience_years;
  const ceiling =
    hi != null
      ? `Treat ${hi} years as a HARD ceiling: any role requiring MORE than ${hi} years (e.g. "6-10 years", "8+ years", or a Senior/Lead/Principal title implying it) is NOT a fit — set experience_fit=false, even if every skill matches.`
      : "";
  const prompt = `You are screening developer/QA/DevOps job postings for one candidate.
Candidate's primary (core) skills: ${primary}.
Candidate's secondary (nice-to-have) skills: ${secondary}.
Candidate's target experience: ${band(settings)}.
${blockRule}

Read the WHOLE description for the experience requirement — it is usually near the
bottom under "Requirements"/"Qualifications" (e.g. "6-10 years", "5+ years",
"minimum 8 years"), not in the intro.

For EACH job return:
- required_years: the MINIMUM years the posting demands. For a range like
  "6-10 years" use the lower bound (6); for "5+ years" use 5. null ONLY if the
  posting truly states no experience requirement.
- experience_fit: true when required_years is within the target band or is null.
  ${ceiling}
- disqualified / disqualifier: per the hard-blockers rule above.
- score: 0-100 for how well the role matches the candidate's PRIMARY skills and
  likely titles (secondary skills nudge it up). Judge skills only here.
- reason: one short sentence (skills matched/missing; note if over-experienced).
Be strict on score: a role needing a stack the candidate doesn't have scores low.`;

  const out: JobScore[] = [];
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    // Respect a caller's wall-clock budget (the inline sort runs under a
    // serverless limit). A later batch costs an inter-batch delay too. If the
    // next batch can't finish in time, stop — the remaining jobs are saved
    // unscored and scored first on the next sort.
    if (deadline) {
      const cost = (i > 0 ? BATCH_DELAY_MS : 0) + EST_BATCH_MS;
      if (Date.now() + cost > deadline) break;
    }

    if (i > 0) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));

    try {
      const { object } = await generateObject({
        model: google(GEMINI_MODEL),
        schema: jobScoreSchema,
        maxRetries: 1,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "text",
                text: JSON.stringify(
                  batch.map((j) => ({
                    external_id: j.external_id,
                    title: j.title,
                    // Keep enough of the posting to reach the experience/
                    // requirements section (often near the bottom). 600 chars
                    // cut it off, so over-senior roles came back as "unstated"
                    // and slipped past the experience gate. 2000 still fits the
                    // token budget comfortably (25 jobs/batch, generous TPM).
                    description: j.description.slice(0, 2000),
                  })),
                ),
              },
            ],
          },
        ],
      });

      out.push(...object.scores);
    } catch (err) {
      // Partial-success: a mid-run failure (almost always the free-tier daily
      // request cap) stops scoring but KEEPS the batches already scored. The
      // caller saves the rest unscored rather than discarding everything — and
      // the scores we did get aren't thrown away with them.
      console.error(
        `Gemini scoring stopped after ${out.length}/${jobs.length} jobs:`,
        err,
      );
      break;
    }
  }

  return out;
}

/** Trim, drop empties, de-dupe case-insensitively, and cap list length. */
function tidy(items: string[], max = 40): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items ?? []) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}
