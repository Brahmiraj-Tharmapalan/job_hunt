import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getJobSettings } from "@/lib/settings";
import { getDecryptedKey } from "@/lib/keys";
import { fetchApifyCredit, type ApifyCredit } from "@/lib/apify";
import {
  JobsView,
  type JobRow,
  type FiltersSummary,
} from "@/app/dashboard/jobs/jobs-view";

export const metadata: Metadata = {
  title: "Your shortlist",
};

// The `runSort` server action invoked from this route runs the whole pipeline
// inline (scrape → score → store) and can take minutes. Server Actions inherit
// the maxDuration of the page that calls them, so request the most a serverless
// function allows (Vercel Pro: 300s). NOTE: this is a ceiling, not a guarantee —
// Vercel HOBBY silently clamps it to 60s. The real safeguard is the soft time
// budget in lib/sort-budget (default 55s): the sort stops and saves a partial
// before the host kills it, so a Hobby deploy returns a result instead of a 504.
// On Pro, raise SORT_BUDGET_MS to use more of this 300s.
export const maxDuration = 300;

export default async function JobsPage() {
  let jobs: JobRow[] = [];
  let filters: FiltersSummary | null = null;
  let credit: ApifyCredit | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "external_id, title, company, location, country, apply_url, summary, skill_match, status, skip_reason, scored, triaged_at, posted_at",
        )
        .eq("user_id", user.id)
        // Highest scores first; skipped/unscored (null) sink to the bottom.
        .order("skill_match", { ascending: false, nullsFirst: false });
      // Surface (don't swallow) query errors — e.g. a column that exists in the
      // code but not yet in the DB would otherwise make all jobs silently vanish.
      if (error) console.error("Failed to load jobs:", error.message);
      jobs = (data as JobRow[] | null) ?? [];

      // Best-effort credit badge; never let a slow/failed Apify call block the page.
      const apifyKey = await getDecryptedKey("apify");
      if (apifyKey) credit = await fetchApifyCredit(apifyKey);

      const settings = await getJobSettings();
      if (settings) {
        filters = {
          search_keywords: settings.search_keywords,
          countries: settings.countries,
          blocked_words: settings.blocked_words,
          min_experience_years: settings.min_experience_years,
          max_experience_years: settings.max_experience_years,
          published_within_days: settings.published_within_days,
          max_items: settings.max_items,
        };
      }
    }
  }

  return (
    <div className="w-full">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to dashboard
      </Link>

      <div className="mb-8 mt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Your shortlist
          </h1>
          <ApifyCreditBadge credit={credit} />
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Run a sort to scrape live jobs from LinkedIn, Indeed, and other boards
          for your titles and countries, drop the obvious misses for free, and
          have Gemini score the rest against your skills.
        </p>
      </div>

      <JobsView initialJobs={jobs} filters={filters} />
    </div>
  );
}

/** Compact "Apify credit left this month" pill. Hidden when we couldn't read it
 * (no key, or the API call failed). Turns amber once the credit runs low — that's
 * the moment that silently breaks syncs, so it's the bit worth flagging. */
function ApifyCreditBadge({ credit }: { credit: ApifyCredit | null }) {
  if (!credit) return null;
  const low = credit.remainingUsd < credit.limitUsd * 0.2;

  return (
    <span
      title={`$${credit.usedUsd.toFixed(2)} used of $${credit.limitUsd.toFixed(2)} this month`}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${low ? "bg-warn" : "bg-success"}`}
        aria-hidden="true"
      />
      <span className="text-muted-foreground">
        Apify credit{" "}
        <span className={`font-semibold ${low ? "text-warn" : "text-foreground"}`}>
          ${credit.remainingUsd.toFixed(2)}
        </span>{" "}
        left
        <span className="text-muted-foreground/70"> of ${credit.limitUsd.toFixed(2)}/mo</span>
      </span>
    </span>
  );
}
