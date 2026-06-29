"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isEncryptionConfigured } from "@/lib/crypto";
import { getDecryptedKey } from "@/lib/keys";
import { getJobSettings } from "@/lib/settings";
import { preFilter } from "@/lib/job-filter";
import {
  scoreJobsWithGemini,
  type JobScore,
  type ScoreableJob,
} from "@/lib/gemini";
import { fetchJobsFromSources } from "@/lib/sources";
import { fetchApifyCredit } from "@/lib/apify";
import { SORT_BUDGET_MS, SORT_SAVE_RESERVE_MS } from "@/lib/sort-budget";

export type SyncSummary = {
  fetched: number;
  alreadySeen: number;
  prefiltered: number;
  /** Newly scraped jobs Gemini scored this run. */
  scored: number;
  /** Previously-unscored backlog jobs Gemini caught up on this run. */
  rescored: number;
  skipped: number;
};

/** Stored row we upsert into the jobs table. */
type Row = {
  user_id: string;
  external_id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  url: string;
  apply_url: string;
  summary: string | null;
  description: string;
  skill_match: number | null;
  status: "new" | "skipped";
  skip_reason: string | null;
  scored: boolean;
  posted_at: string | null;
};

/** Fields the row builder needs from a job, whether freshly scraped or reloaded
 * from the backlog. */
type RowSource = {
  external_id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  url: string;
  apply_url: string;
  description: string;
  posted_at: string | null;
};

/**
 * Fold a job + its (optional) Gemini score into a stored row. Survivors become
 * scored 'new' rows unless Gemini judged them outside the experience band or
 * disqualified; an absent score lands the job unscored (still 'new').
 */
function buildScoredRow(
  userId: string,
  job: RowSource,
  s: JobScore | undefined,
): Row {
  const outOfBand = s ? !s.experience_fit : false;
  const disqualified = s?.disqualified ?? false;
  return {
    user_id: userId,
    external_id: job.external_id,
    title: job.title,
    company: job.company,
    location: job.location,
    country: job.country,
    url: job.url,
    apply_url: job.apply_url,
    summary: s?.reason ?? null,
    description: job.description,
    skill_match: s ? Math.round(s.score) : null,
    status: outOfBand || disqualified ? "skipped" : "new",
    // A blocked requirement (e.g. a language) takes priority in the reason;
    // otherwise fall back to the experience-band explanation.
    skip_reason: disqualified
      ? `Requires ${s?.disqualifier ?? "a blocked requirement"}`
      : outOfBand
        ? `Needs ${s?.required_years ?? "?"} yrs — outside your range`
        : null,
    scored: Boolean(s),
    posted_at: job.posted_at,
  };
}

export type RunSortState = {
  ok?: boolean;
  error?: string;
  /** Soft, non-fatal notice (e.g. Gemini was rate-limited so jobs landed unscored). */
  warning?: string;
  summary?: SyncSummary;
};

/**
 * Real sync: scrape jobs from Apify with the user's filters, pre-filter cheaply,
 * score the survivors with the user's Gemini key, then upsert the triaged
 * results into the jobs table. The filter → score → store flow is unchanged from
 * the earlier mock version; only the source (Apify) is new.
 */
export async function runSort(): Promise<RunSortState> {
  if (!isSupabaseConfigured) return { error: "Supabase isn't configured." };
  if (!isEncryptionConfigured()) {
    return { error: "ENCRYPTION_MASTER_KEY isn't set on the server." };
  }

  // Wall-clock budget for this whole inline run. Scraping and scoring stop at
  // `workDeadline` (leaving SORT_SAVE_RESERVE_MS to actually write the results)
  // so the function returns a clean partial before the host kills it. See
  // lib/sort-budget for why this exists (Vercel Hobby's 60s function cap).
  const workDeadline = Date.now() + SORT_BUDGET_MS - SORT_SAVE_RESERVE_MS;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  const geminiKey = await getDecryptedKey("gemini");
  if (!geminiKey) return { error: "Add your Gemini API key first (step 1)." };

  const apifyKey = await getDecryptedKey("apify");
  if (!apifyKey) return { error: "Add your Apify API key first (step 1)." };

  // Pre-flight: scraping with no Apify credit left returns nothing and silently
  // wastes the run. Catch it up front so the user tops up instead of staring at
  // an empty result. Best-effort — if the balance can't be read, proceed anyway.
  const credit = await fetchApifyCredit(apifyKey);
  if (credit && credit.remainingUsd <= 0.01) {
    return {
      error: `Your Apify credit is used up ($${credit.usedUsd.toFixed(2)} of $${credit.limitUsd.toFixed(2)} this month). Top up your Apify account or wait for the monthly reset before sorting.`,
    };
  }

  const settings = await getJobSettings();
  if (!settings) return { error: "Couldn't load your filters. Save them first." };

  if (settings.countries.length === 0 || settings.search_keywords.length === 0) {
    return { error: "Add at least one country and one job title in your filters." };
  }

  // Step 1: scrape real postings. Every board that serves one of the user's
  // countries runs automatically (global boards always; regional ones like Bayt/
  // Naukri/Seek when their region is selected), merged and de-duplicated.
  // Best-effort: one source failing doesn't sink the run.
  let fetched;
  try {
    fetched = await fetchJobsFromSources(
      apifyKey,
      {
        search_keywords: settings.search_keywords,
        countries: settings.countries,
        blocked_words: settings.blocked_words,
        published_within_days: settings.published_within_days,
        max_items: settings.max_items,
      },
      workDeadline,
    );
  } catch (err) {
    console.error("Apify fetch failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    if (/timeout|aborted/i.test(detail)) {
      return { error: "The scrape took too long to respond. Try a smaller look-back window, fewer countries, or fewer sources." };
    }
    if (/401|403|token/i.test(detail)) {
      return { error: "Apify rejected your key. Check it in step 1." };
    }
    const safe = detail.replace(apifyKey, "***").slice(0, 200);
    return { error: `Couldn't fetch jobs: ${safe || "unknown error"}` };
  }

  const scraped = fetched.length;

  // Dedup across syncs: drop postings we've already captured for this user.
  // This both PRESERVES their triage (a job you applied/skipped won't reappear
  // as "new") and SAVES Gemini quota (we never re-score a posting we've seen).
  const { data: existingRows } = await supabase
    .from("jobs")
    .select("external_id")
    .eq("user_id", user.id);
  const seen = new Set(
    (existingRows ?? []).map((r) => (r as { external_id: string }).external_id),
  );
  fetched = fetched.filter((j) => !seen.has(j.external_id));
  const alreadySeen = scraped - fetched.length;

  // Cap the NEW jobs to the user's max_items (the actor enforces a 150 min).
  fetched = fetched.slice(0, settings.max_items);

  // Step 2: cheap pre-filter. Apify already restricts to the searched
  // locations, so we DON'T re-filter by country (real locations are often
  // "City, State" without the country name) — just the blocked-word title net.
  const { survivors, rejected } = preFilter(fetched, {
    countries: [],
    blocked_words: settings.blocked_words,
  });

  // Re-score backlog: jobs from earlier syncs that landed unscored because Gemini
  // hit its daily cap that day. They already carry a stored description, so we
  // fold them into THIS run's scoring pass and put them FIRST — scarce daily
  // quota should clear the oldest unranked jobs before scoring brand-new ones.
  const { data: backlogData } = await supabase
    .from("jobs")
    .select(
      "external_id, title, company, location, country, url, apply_url, description, posted_at",
    )
    .eq("user_id", user.id)
    .eq("status", "new")
    .eq("scored", false);
  const backlog: RowSource[] = (backlogData ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const s = (v: unknown) => (typeof v === "string" ? v : "");
    return {
      external_id: s(row.external_id),
      title: s(row.title),
      company: s(row.company),
      location: s(row.location),
      country: s(row.country),
      url: s(row.url),
      apply_url: s(row.apply_url),
      description: s(row.description),
      posted_at: typeof row.posted_at === "string" ? row.posted_at : null,
    };
  });

  // Step 3: score with Gemini (batched, rate-aware) — backlog first, then this
  // run's new survivors. Scoring is BEST-EFFORT: if Gemini rate-limits or errors,
  // we still save the scraped jobs as unscored ('Not scored') instead of throwing
  // away an Apify scrape the user already paid for. They get scored on a later
  // sort that has quota. A scoring failure must never discard the run.
  const toScore: ScoreableJob[] = [...backlog, ...survivors].map((j) => ({
    external_id: j.external_id,
    title: j.title,
    description: j.description,
  }));

  let scores: JobScore[] = [];
  let scoringWarning: string | null = null;
  try {
    scores = await scoreJobsWithGemini(
      geminiKey,
      toScore,
      {
        required_skills: settings.required_skills,
        secondary_skills: settings.secondary_skills,
        min_experience_years: settings.min_experience_years,
        max_experience_years: settings.max_experience_years,
        blocked_words: settings.blocked_words,
      },
      workDeadline,
    );
  } catch (err) {
    // scoreJobsWithGemini is partial-success and shouldn't throw, but keep this
    // as a safety net: on a hard failure, save everything unscored.
    console.error("Job scoring failed (saving jobs unscored):", err);
    const detail = err instanceof Error ? err.message : String(err);
    scoringWarning = `Jobs saved unscored — Gemini couldn't score them: ${detail.replace(geminiKey, "***").slice(0, 160) || "unknown error"}`;
  }

  // Scoring stops early either because Gemini hit its free-tier daily cap
  // (~20 requests/day) or because we ran out of the run's time budget (the
  // common case on Vercel Hobby's 60s function limit). Either way the unscored
  // rows still land (as 'Not scored') and are scored first on the next sort.
  const unscored = toScore.length - scores.length;
  if (!scoringWarning && unscored > 0) {
    scoringWarning = `Scored ${scores.length} of ${toScore.length} jobs this run — the rest hit the run's time or Gemini's daily limit. The other ${unscored} were saved unscored and will be picked up first on your next sort.`;
  }

  const scoreById = new Map(scores.map((s) => [s.external_id, s]));

  // Step 4: build triaged rows. Newly scraped survivors are always written;
  // backlog jobs are only re-written when they actually got a score this run
  // (otherwise their existing 'Not scored' row is left untouched). Rejects are
  // stored as 'skipped' so the user can see WHY each one was dropped.
  const rows: Row[] = [];

  for (const job of survivors) {
    rows.push(buildScoredRow(user.id, job, scoreById.get(job.external_id)));
  }

  let rescored = 0;
  for (const job of backlog) {
    const s = scoreById.get(job.external_id);
    if (!s) continue; // still no quota for it — leave its existing row as-is
    rescored++;
    rows.push(buildScoredRow(user.id, job, s));
  }

  for (const { job, reason } of rejected) {
    rows.push({
      user_id: user.id,
      external_id: job.external_id,
      title: job.title,
      company: job.company,
      location: job.location,
      country: job.country,
      url: job.url,
      apply_url: job.apply_url,
      summary: null,
      description: job.description,
      skill_match: null,
      status: "skipped",
      skip_reason: reason,
      scored: false,
      posted_at: job.posted_at,
    });
  }

  const { error } = await supabase
    .from("jobs")
    .upsert(rows, { onConflict: "user_id,external_id" });
  if (error) return { error: error.message };

  await supabase
    .from("job_settings")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", user.id);

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard");

  const skipped = rows.filter((r) => r.status === "skipped").length;
  return {
    ok: true,
    warning: scoringWarning ?? undefined,
    summary: {
      fetched: scraped,
      alreadySeen,
      prefiltered: rejected.length,
      // scores covers both lists; rescored is the backlog share, so the rest are
      // the newly scraped jobs scored this run.
      scored: scores.length - rescored,
      rescored,
      skipped,
    },
  };
}

/**
 * Delete every stored job for the signed-in user, so the next sort re-scrapes
 * and re-scores from scratch. Runs under the user's session, so RLS scopes the
 * delete to their own rows. Triage history (applied/skipped) is wiped too — this
 * is the "start fresh" escape hatch, guarded by a confirm in the UI.
 */
export async function clearJobs(): Promise<{ ok?: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { error: "Supabase isn't configured." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  const { error } = await supabase.from("jobs").delete().eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type TriageStatus = "new" | "shortlisted" | "applied" | "skipped";

/**
 * Move a single job between triage buckets (save ★ / applied / skipped / back to
 * new). When a skip carries a typed reason, the reason is also remembered in
 * `job_settings.skip_rules` so it can be offered as a blocked-word suggestion
 * the next time the user tunes their filters.
 */
export async function triageJob(
  externalId: string,
  status: TriageStatus,
  skipReason?: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { error: "Supabase isn't configured." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  const reason = status === "skipped" ? skipReason?.trim() || null : null;
  // Stamp the moment of triage so Saved/Applied/Skipped lists can be ordered by
  // when the user acted. Back-to-"new" clears it (it returns to the score-sorted
  // review queue).
  const triagedAt = status === "new" ? null : new Date().toISOString();

  const { error } = await supabase
    .from("jobs")
    .update({ status, skip_reason: reason, triaged_at: triagedAt })
    .eq("user_id", user.id)
    .eq("external_id", externalId);
  if (error) return { error: error.message };

  // Remember a typed skip reason as a reusable blocked-word suggestion.
  if (reason) {
    const { data } = await supabase
      .from("job_settings")
      .select("skip_rules")
      .eq("user_id", user.id)
      .maybeSingle();
    const existing: string[] = (data?.skip_rules as string[] | undefined) ?? [];
    const dupe = existing.some((r) => r.toLowerCase() === reason.toLowerCase());
    if (!dupe) {
      await supabase
        .from("job_settings")
        .update({ skip_rules: [...existing, reason].slice(0, 60) })
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/dashboard/jobs");
  return { ok: true };
}
