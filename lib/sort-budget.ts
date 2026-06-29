import "server-only";

/**
 * Wall-clock budget for one inline "Run sort".
 *
 * The whole pipeline (scrape → score → store) runs inside a SINGLE serverless
 * invocation, so it must finish before the host kills the function. Vercel's
 * HOBBY plan caps functions at 60s (and silently clamps `maxDuration` to it), so
 * a sort that waits longer gets terminated mid-run and the browser sees a 504
 * instead of a result.
 *
 * Rather than chase that ceiling, we give the sort a soft deadline a few seconds
 * UNDER it. The Apify wait and the Gemini scoring loop both stop at this deadline
 * and return what they have; anything not scored is saved unscored (backlog) and
 * picked up first on the next sort. The result is a clean partial every time
 * instead of a hard timeout.
 *
 * On Pro (300s functions) raise SORT_BUDGET_MS so each sort can scrape/score more
 * per run; bump the page's `maxDuration` to match.
 */
export const SORT_BUDGET_MS = Number(process.env.SORT_BUDGET_MS) || 55_000;

/**
 * Slice of the budget held back for the final DB upsert + revalidate + response.
 * Scraping and scoring stop this far before SORT_BUDGET_MS so the run can still
 * SAVE what it gathered (a sort that times out without saving wasted the scrape).
 */
export const SORT_SAVE_RESERVE_MS = 6_000;
