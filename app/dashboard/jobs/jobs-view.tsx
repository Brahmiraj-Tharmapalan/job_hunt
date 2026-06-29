"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearJobs,
  runSort,
  triageJob,
  type RunSortState,
  type TriageStatus,
} from "@/app/dashboard/jobs/actions";
import { COUNTRY_GROUPS, expandCountry } from "@/lib/countries";

export type JobRow = {
  external_id: string;
  title: string;
  company: string | null;
  location: string | null;
  country: string | null;
  apply_url: string | null;
  summary: string | null;
  status: TriageStatus;
  skill_match: number | null;
  skip_reason: string | null;
  scored: boolean;
  triaged_at: string | null;
  posted_at: string | null;
};

/** The saved filters a sort will run with, shown for review before scraping. */
export type FiltersSummary = {
  search_keywords: string[];
  countries: string[];
  blocked_words: string[];
  min_experience_years: number | null;
  max_experience_years: number | null;
  published_within_days: number;
  max_items: number;
};

/**
 * What the country selector is currently filtering by: everything, a whole
 * continent/region, or a single country.
 */
type CountrySel =
  | { kind: "all" }
  | { kind: "region"; region: string }
  | { kind: "country"; country: string };

// Map any country name OR alias (lowercased) to the region it belongs to, so a
// job labelled "Dubai" still resolves to "Middle East". Built once at module load.
const REGION_BY_TERM = new Map<string, string>();
for (const g of COUNTRY_GROUPS) {
  for (const c of g.countries) {
    for (const term of expandCountry(c)) REGION_BY_TERM.set(term.toLowerCase(), g.region);
  }
}
const REGION_ORDER = COUNTRY_GROUPS.map((g) => g.region);

/** Region a job's country falls under; countries off the supported list go last. */
function regionOf(country: string | null): string {
  if (!country) return "Other";
  return REGION_BY_TERM.get(country.toLowerCase()) ?? "Other";
}

const byScore = (a: JobRow, b: JobRow) =>
  (b.skill_match ?? -1) - (a.skill_match ?? -1);

// Order by when the user acted: earliest first, most recent last. ISO strings
// sort chronologically as plain text. Untouched rows fall back to insertion order.
const byTriagedAt = (a: JobRow, b: JobRow) =>
  (a.triaged_at ?? "").localeCompare(b.triaged_at ?? "");

/** "Posted 8 days ago" style label from an ISO timestamp; null if unknown. */
function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `Posted ${w} week${w > 1 ? "s" : ""} ago`;
  }
  const m = Math.floor(days / 30);
  return `Posted ${m} month${m > 1 ? "s" : ""} ago`;
}

export function JobsView({
  initialJobs,
  filters,
}: {
  initialJobs: JobRow[];
  filters: FiltersSummary | null;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs);
  // Re-seed from the server whenever a sort/refresh brings new data. Resetting
  // during render (vs. in an effect) avoids a wasted extra render pass.
  const [seenInitial, setSeenInitial] = useState(initialJobs);
  if (seenInitial !== initialJobs) {
    setSeenInitial(initialJobs);
    setJobs(initialJobs);
  }

  // Run sort first asks the user to review the filters it will scrape with.
  const [confirming, setConfirming] = useState(false);

  const [state, run, pending] = useActionState<RunSortState, void>(
    () => runSort(),
    {},
  );
  // On a successful sort, pull the freshly-stored rows from the server. The
  // review panel is already dismissed at confirm time (see onConfirm below).
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  const [skipWithoutReason, setSkipWithoutReason] = useState(false);
  const [countrySel, setCountrySel] = useState<CountrySel>({ kind: "all" });
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Which card is currently asking for a skip reason, and the draft text.
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [skipDraft, setSkipDraft] = useState("");
  // "Clear list" is destructive, so it asks for confirmation first.
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearPending, setClearPending] = useState(false);

  // Countries present in the data, grouped under their continent/region for the
  // selector; regions follow the canonical order, "Other" (off-list) last.
  const regionGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of jobs.map((j) => j.country).filter(Boolean) as string[]) {
      const r = regionOf(c);
      const list = map.get(r);
      if (list) {
        if (!list.includes(c)) list.push(c);
      } else {
        map.set(r, [c]);
      }
    }
    return [...REGION_ORDER, "Other"]
      .filter((r) => map.has(r))
      .map((r) => ({ region: r, countries: map.get(r)!.sort() }));
  }, [jobs]);

  function passesFilter(j: JobRow): boolean {
    if (countrySel.kind === "country" && j.country !== countrySel.country) return false;
    if (countrySel.kind === "region" && regionOf(j.country) !== countrySel.region)
      return false;
    if (q) {
      const hay = `${j.title} ${j.company ?? ""} ${j.location ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }

  const visible = jobs.filter(passesFilter);
  // Review queue is ranked by score; the triaged lists read in action order.
  const news = visible.filter((j) => j.status === "new").sort(byScore);
  const saved = visible.filter((j) => j.status === "shortlisted").sort(byTriagedAt);
  const applied = visible.filter((j) => j.status === "applied").sort(byTriagedAt);
  const skipped = visible.filter((j) => j.status === "skipped").sort(byTriagedAt);

  function triage(externalId: string, status: TriageStatus, reason?: string) {
    setError(null);
    setSkippingId(null);
    setSkipDraft("");
    // Optimistic: move the card immediately, then persist in the background.
    setJobs((prev) =>
      prev.map((j) =>
        j.external_id === externalId
          ? {
              ...j,
              status,
              skip_reason: status === "skipped" ? reason ?? null : null,
              triaged_at: status === "new" ? null : new Date().toISOString(),
            }
          : j,
      ),
    );
    startTransition(async () => {
      const res = await triageJob(externalId, status, reason);
      if (res?.error) {
        setError(res.error);
        router.refresh();
      }
    });
  }

  function onSkip(externalId: string) {
    if (skipWithoutReason) {
      triage(externalId, "skipped");
    } else {
      setSkippingId(externalId);
      setSkipDraft("");
    }
  }

  function handleClear() {
    setError(null);
    setClearPending(true);
    startTransition(async () => {
      const res = await clearJobs();
      setClearPending(false);
      setConfirmingClear(false);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="relative">
      <div
        className={`space-y-6 transition-[filter,opacity] duration-300 ${
          pending ? "pointer-events-none select-none blur-[2px] opacity-80" : ""
        }`}
        aria-hidden={pending || undefined}
      >
      {/* Controls */}
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {pending
              ? "Sorting… scraping, then scoring with Gemini."
              : error || state.error
                ? <span className="text-accent">{error ?? state.error}</span>
                : state.warning
                  ? <span className="text-warn">{state.warning}</span>
                  : state.summary
                    ? `Pulled ${state.summary.fetched} · ${state.summary.alreadySeen} already seen · scored ${state.summary.scored} new${state.summary.rescored ? ` · re-scored ${state.summary.rescored} from backlog` : ""}.`
                    : `${news.length} to review · ${saved.length} saved · ${applied.length} applied`}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {jobs.length > 0 && (
              <button
                type="button"
                disabled={pending || clearPending}
                onClick={() => setConfirmingClear((c) => !c)}
                className="h-11 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-accent disabled:opacity-50"
              >
                Clear list
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming((c) => !c)}
              className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              {pending ? "Sorting…" : "Run sort"}
            </button>
          </div>
        </div>

        {confirmingClear && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-blush/40 p-3 text-sm">
            <span className="text-foreground">
              Delete all {jobs.length} jobs and start fresh? This also clears your
              saved, applied, and skipped history — it can&apos;t be undone.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={clearPending}
                onClick={handleClear}
                className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                {clearPending ? "Clearing…" : "Yes, clear"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {confirming && (
          <FilterReview
            filters={filters}
            pending={pending}
            onConfirm={() => {
              setConfirming(false);
              startTransition(() => run());
            }}
            onCancel={() => setConfirming(false)}
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <CountryFilter
            groups={regionGroups}
            selection={countrySel}
            onChange={setCountrySel}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by title, company…"
            className="h-9 min-w-[12rem] flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-accent/50"
          />
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={skipWithoutReason}
              onChange={(e) => setSkipWithoutReason(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent,currentColor)]"
            />
            Skip without asking a reason
          </label>
        </div>
      </div>

      {jobs.length === 0 && (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
          No jobs yet. Run a sort to build your shortlist.
        </p>
      )}

      {/* To review */}
      {news.length > 0 && (
        <Section label={`To review (${news.length})`} grid>
          {news.map((job) => (
            <ReviewCard
              key={job.external_id}
              job={job}
              asking={skippingId === job.external_id}
              skipDraft={skipDraft}
              onSkipDraft={setSkipDraft}
              onSave={() => triage(job.external_id, "shortlisted")}
              onApplied={() => triage(job.external_id, "applied")}
              onSkip={() => onSkip(job.external_id)}
              onConfirmSkip={() =>
                triage(job.external_id, "skipped", skipDraft)
              }
              onCancelSkip={() => {
                setSkippingId(null);
                setSkipDraft("");
              }}
            />
          ))}
        </Section>
      )}

      {/* Saved */}
      {saved.length > 0 && (
        <Section label={`★ Saved (${saved.length})`} grid>
          {saved.map((job) => (
            <MiniCard key={job.external_id} job={job}>
              <Pill onClick={() => triage(job.external_id, "applied")}>Applied</Pill>
              <Pill onClick={() => onSkip(job.external_id)}>Skip</Pill>
              <Pill subtle onClick={() => triage(job.external_id, "new")}>
                ↩ Review
              </Pill>
            </MiniCard>
          ))}
        </Section>
      )}

      {/* Applied */}
      {applied.length > 0 && (
        <Section label={`Applied (${applied.length})`} grid>
          {applied.map((job) => (
            <MiniCard key={job.external_id} job={job}>
              <Pill subtle onClick={() => triage(job.external_id, "new")}>
                ↩ Review
              </Pill>
            </MiniCard>
          ))}
        </Section>
      )}

      {/* Skipped */}
      {skipped.length > 0 && (
        <Section label={`Skipped (${skipped.length})`} grid>
          {skipped.map((job) => (
            <MiniCard key={job.external_id} job={job} reason={job.skip_reason}>
              <Pill subtle onClick={() => triage(job.external_id, "new")}>
                ↩ Restore
              </Pill>
            </MiniCard>
          ))}
        </Section>
      )}
      </div>

      <AnimatePresence>{pending && <SortingOverlay />}</AnimatePresence>
    </div>
  );
}

// Friendly stage messages cycled while a sort runs. We can't read the real
// server-side phase, so these just reassure the user that work is happening in
// the rough order the pipeline actually runs (scrape → filter → score → rank).
const SORT_STAGES = [
  "Scraping live job boards…",
  "Dropping the obvious misses…",
  "Scoring matches with Gemini…",
  "Ranking your shortlist…",
];

/**
 * Full-cover loading state shown over the job lists while a sort runs. The list
 * behind it is blurred and made non-interactive (see JobsView); this overlay
 * adds a dimming wash plus a pinned card so the status stays in view even on a
 * long, scrolled list.
 */
function SortingOverlay() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setStage((n) => (n + 1) % SORT_STAGES.length),
      3200,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-30 flex justify-center bg-background/30"
      aria-live="polite"
      aria-busy="true"
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="sticky top-28 flex h-fit max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-surface/95 px-8 py-7 text-center shadow-xl shadow-foreground/10"
      >
        <Spinner />
        <div>
          <p className="text-base font-semibold text-foreground">
            Sorting your shortlist
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={stage}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="mt-1 text-sm text-muted-foreground"
            >
              {SORT_STAGES[stage]}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="text-xs text-muted-foreground/80">
          This can take a few minutes. Keep this tab open.
        </p>
      </motion.div>
    </motion.div>
  );
}

/** Burgundy ring spinner: a faint track with a spinning accent arc. */
function Spinner() {
  return (
    <span className="relative flex h-10 w-10" aria-hidden="true">
      <span className="absolute inset-0 rounded-full border-2 border-accent/20" />
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
      />
    </span>
  );
}

/**
 * Minimal popover country selector for the jobs top bar. Replaces a flat native
 * dropdown: countries are grouped under their continent, and tapping a region
 * header filters to that whole continent at once. Collapses to "All countries".
 */
function CountryFilter({
  groups,
  selection,
  onChange,
}: {
  groups: { region: string; countries: string[] }[];
  selection: CountrySel;
  onChange: (s: CountrySel) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape while the panel is open.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label =
    selection.kind === "all"
      ? "All countries"
      : selection.kind === "region"
        ? selection.region
        : selection.country;
  const active = selection.kind !== "all";

  function choose(s: CountrySel) {
    onChange(s);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium outline-none transition-colors ${
          active
            ? "border-accent/40 bg-blush text-accent"
            : "border-border bg-surface text-foreground hover:bg-surface-muted focus:border-accent/50"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4 opacity-70"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
        </svg>
        <span className="max-w-[10rem] truncate">{label}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute left-0 top-full z-20 mt-2 max-h-80 w-64 origin-top-left overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg shadow-foreground/5"
          >
            <SelRow
              label="All countries"
              active={selection.kind === "all"}
              onClick={() => choose({ kind: "all" })}
            />
            {groups.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                No countries in your jobs yet.
              </p>
            )}
            {groups.map((g) => (
              <div key={g.region} className="mt-1">
                <button
                  type="button"
                  onClick={() => choose({ kind: "region", region: g.region })}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    selection.kind === "region" && selection.region === g.region
                      ? "bg-blush text-accent"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <span>{g.region}</span>
                  <span className="font-normal normal-case opacity-70">
                    {g.countries.length}
                  </span>
                </button>
                {g.countries.map((c) => (
                  <SelRow
                    key={c}
                    label={c}
                    indent
                    active={selection.kind === "country" && selection.country === c}
                    onClick={() => choose({ kind: "country", country: c })}
                  />
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SelRow({
  label,
  active,
  indent = false,
  onClick,
}: {
  label: string;
  active: boolean;
  /** Nudge right to sit under a region header. */
  indent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-md py-1.5 text-sm transition-colors ${
        indent ? "pl-5 pr-2.5" : "px-2.5"
      } ${
        active
          ? "bg-accent text-accent-contrast"
          : "text-foreground hover:bg-surface-muted"
      }`}
    >
      <span className="truncate">{label}</span>
      {active && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        >
          <path d="m5 13 4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function bandLabel(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Any";
  if (min != null && max != null) return `${min}–${max} yrs`;
  if (min != null) return `${min}+ yrs`;
  return `≤ ${max} yrs`;
}

/** Pre-flight panel: shows the filters a sort will scrape with, so the user can
 * confirm or edit before spending an Apify run. */
function FilterReview({
  filters,
  pending,
  onConfirm,
  onCancel,
}: {
  filters: FiltersSummary | null;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ready =
    filters != null &&
    filters.countries.length > 0 &&
    filters.search_keywords.length > 0;

  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 p-4">
      <p className="text-sm font-medium text-foreground">
        Check your filters before sorting
      </p>

      {!ready ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Add at least one job title and one country first — a sort needs both.
        </p>
      ) : (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Job titles" value={filters.search_keywords.join(", ")} />
          <Row label="Countries" value={filters.countries.join(", ")} />
          <Row
            label="Experience"
            value={bandLabel(
              filters.min_experience_years,
              filters.max_experience_years,
            )}
          />
          <Row
            label="Blocked words"
            value={
              filters.blocked_words.length
                ? `${filters.blocked_words.length} set`
                : "None"
            }
          />
          <Row
            label="Look-back"
            value={`Last ${filters.published_within_days} days`}
          />
          <Row label="Max results" value={String(filters.max_items)} />
        </dl>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ready && (
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            {pending ? "Sorting…" : "Start sort"}
          </button>
        )}
        <Link
          href="/dashboard/settings"
          className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          Edit filters
        </Link>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className="min-w-0 truncate text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}

function Section({
  label,
  grid = false,
  children,
}: {
  label: string;
  /** Lay children out as cards: 1 per row on mobile, 3 per row on desktop. */
  grid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      {grid ? (
        // items-start so a card expanding (e.g. the skip-reason input) grows on
        // its own instead of stretching its whole row to match.
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
          {children}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}

function scoreTone(score: number): string {
  if (score >= 70) return "bg-success/10 text-success";
  if (score >= 40) return "bg-blush text-accent";
  return "bg-surface-muted text-muted-foreground";
}

function ReviewCard({
  job,
  asking,
  skipDraft,
  onSkipDraft,
  onSave,
  onApplied,
  onSkip,
  onConfirmSkip,
  onCancelSkip,
}: {
  job: JobRow;
  asking: boolean;
  skipDraft: string;
  onSkipDraft: (v: string) => void;
  onSave: () => void;
  onApplied: () => void;
  onSkip: () => void;
  onConfirmSkip: () => void;
  onCancelSkip: () => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug text-foreground">
            {job.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {[job.company, job.location].filter(Boolean).join(" · ")}
          </p>
          {timeAgo(job.posted_at) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {timeAgo(job.posted_at)}
            </p>
          )}
        </div>
        {job.skill_match != null ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold ${scoreTone(job.skill_match)}`}
          >
            {job.skill_match}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Not scored
          </span>
        )}
      </div>

      {job.summary && (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{job.summary}</p>
      )}

      {/* Actions pinned to the bottom so cards in a row stay aligned. */}
      <div className="mt-auto pt-5">
        <div className="grid grid-cols-3 gap-2">
          <Pill block onClick={onSave} aria-label="Save to favourites">
            ★ Save
          </Pill>
          <Pill block onClick={onApplied}>
            Applied
          </Pill>
          <Pill block onClick={onSkip}>
            Skip
          </Pill>
        </div>

        {job.apply_url && (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg border border-accent text-sm font-semibold text-accent transition-colors hover:bg-blush"
          >
            View &amp; apply
          </a>
        )}

        {asking && (
          <div className="mt-3 space-y-2 rounded-xl bg-surface-muted/50 p-3">
            <input
              autoFocus
              value={skipDraft}
              onChange={(e) => onSkipDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirmSkip();
                if (e.key === "Escape") onCancelSkip();
              }}
              placeholder="Why skip? e.g. “senior”"
              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-accent/50"
            />
            <p className="text-xs text-muted-foreground">
              Saved as a blocked-word suggestion. Tap it in your filters to skip
              jobs whose <span className="font-medium">title</span> contains it
              next time.
            </p>
            <div className="flex items-center gap-2">
              <Pill onClick={onConfirmSkip}>Skip</Pill>
              <Pill subtle onClick={onCancelSkip}>
                Cancel
              </Pill>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniCard({
  job,
  reason,
  children,
}: {
  job: JobRow;
  reason?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface-muted/40 p-4">
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-foreground">{job.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {[job.company, job.location].filter(Boolean).join(" · ")}
        </p>
        {timeAgo(job.posted_at) && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {timeAgo(job.posted_at)}
          </p>
        )}
        {reason && <p className="mt-1 text-xs text-warn">{reason}</p>}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
        {children}
      </div>
    </div>
  );
}

function Pill({
  children,
  onClick,
  subtle = false,
  block = false,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  subtle?: boolean;
  /** Stretch to fill its container (e.g. a grid cell) and centre the label. */
  block?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
        block ? "flex w-full justify-center" : "inline-flex"
      } ${
        subtle
          ? "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          : "border border-border text-foreground hover:bg-blush hover:text-accent"
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}
