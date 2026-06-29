"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChipEditor } from "@/components/ui/chip-editor";
import { CountryPicker } from "@/components/dashboard/country-picker";
import { ExperienceRange } from "@/components/dashboard/experience-range";
import { SkillsDnd } from "@/components/dashboard/skills-dnd";
import {
  saveSettings,
  type SettingsInput,
  type SaveSettingsState,
} from "@/app/dashboard/settings/actions";
import { relevantSources } from "@/lib/sources-meta";

// 7 days + 200 results is the recommended balance: enough coverage to surface
// fresh roles without burning Gemini's free daily quota (each sync re-scores
// only NEW postings, so a tighter window = fewer tokens spent per run).
const WINDOW_OPTIONS = [
  { value: 1, label: "Last 24 hours" },
  { value: 3, label: "Last 3 days" },
  { value: 7, label: "Last week (recommended)" },
  { value: 14, label: "Last 2 weeks" },
  { value: 30, label: "Last 30 days" },
];

const MAX_OPTIONS = [50, 100, 200, 500, 1000];
const RECOMMENDED_MAX = 200;

// Common reasons to skip a role, offered as tap-to-add chips under Blocked
// words. Seniority/junior terms reliably appear in titles; the languages cover
// the non-English markets in our country list (add one only if you don't speak
// it). Matching is title-based, so language hits are best-effort.
const BLOCKED_WORD_SUGGESTIONS = [
  "Senior",
  "Lead",
  "Principal",
  "Staff",
  "Manager",
  "Director",
  "Head of",
  "Architect",
  "Intern",
  "Internship",
  "Trainee",
  "5 years of experience",
  "5+ years of experience",
  "7+ years of experience",
  "10+ years of experience",
  "French",
  "German",
  "Arabic",
  "Dutch",
  "Spanish",
  "Japanese",
  "Korean",
  "Mandarin",
  "Polish",
];


export function SettingsForm({
  initial,
  configured,
  filtersDone,
  skipSuggestions = [],
}: {
  initial: SettingsInput;
  configured: boolean;
  filtersDone: boolean;
  /** Reasons the user typed when skipping jobs, offered as blocked-word chips. */
  skipSuggestions?: string[];
}) {
  const router = useRouter();

  // Static seniority/language suggestions plus any skip reasons the user has
  // typed on the shortlist (deduped, theirs shown first).
  const blockedSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const w of [...skipSuggestions, ...BLOCKED_WORD_SUGGESTIONS]) {
      const key = w.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(w);
    }
    return out;
  }, [skipSuggestions]);
  const [form, setForm] = useState<SettingsInput>(initial);
  const [state, runSave, saving] = useActionState<SaveSettingsState, SettingsInput>(
    saveSettings,
    {},
  );

  // The saved baseline is whatever was last persisted (returned by the action),
  // or the initial server values before any save. Anything different is unsaved.
  const saved = state.saved ?? initial;
  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(saved),
    [form, saved],
  );

  // After a successful save, refresh server data (dashboard checklist, CV chips).
  // This is a side effect (navigation), not a setState, so it's effect-safe.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  // Step is complete once filters have been saved at least once, either on a
  // previous visit (server prop) or just now (action result).
  const completed = filtersDone || Boolean(state.ok);

  function set<K extends keyof SettingsInput>(key: K, value: SettingsInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-8">
      {!configured && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          Supabase isn&apos;t configured yet, so changes won&apos;t save.
        </div>
      )}

      <section className="space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <header>
          <h2 className="font-semibold text-foreground">Skills</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Put only the skills you&apos;re confident in under Primary. A role
            must match these to score well. Secondary skills are nice-to-haves
            that boost the score. In each list, drag to set priority: strongest
            at the top.
          </p>
        </header>

        <SkillsDnd
          required={form.required_skills}
          secondary={form.secondary_skills}
          onChange={({ required, secondary }) =>
            setForm((f) => ({
              ...f,
              required_skills: required,
              secondary_skills: secondary,
            }))
          }
        />
      </section>

      <section className="space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <header>
          <h2 className="font-semibold text-foreground">Search</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            What we search for, where, and what to exclude.
          </p>
        </header>

        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Job sources{" "}
            <span className="font-normal normal-case text-muted-foreground/70">
              · picked automatically from your countries
            </span>
          </span>
          <div className="flex flex-wrap gap-2">
            {relevantSources(form.countries).map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-blush/40 px-2.5 py-1.5 text-sm"
              >
                <span className="font-semibold text-foreground">{s.label}</span>
                {s.matched.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {s.matched.join(", ")}
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            We search the right boards for the countries you pick — global ones
            always, plus regional boards (Naukri for India, Bayt for the Gulf,
            JobStreet for SE Asia, Seek for Australia/NZ). Your max-results budget
            is split across them, so coverage widens without costing much more.
          </p>
        </div>

        <ChipEditor
          label="Job title keywords"
          tone="muted"
          items={form.search_keywords}
          onChange={(v) => set("search_keywords", v)}
          placeholder="Add a job title..."
          hint="Titles we search boards for, e.g. “Frontend Developer”."
        />
        <CountryPicker
          items={form.countries}
          onChange={(v) => set("countries", v)}
        />
        <ExperienceRange
          min={form.min_experience_years}
          max={form.max_experience_years}
          onChange={({ min, max }) =>
            setForm((f) => ({
              ...f,
              min_experience_years: min,
              max_experience_years: max,
            }))
          }
        />
        <ChipEditor
          label="Blocked words"
          tone="muted"
          items={form.blocked_words}
          onChange={(v) => set("blocked_words", v)}
          placeholder="Add a word to exclude..."
          hint="Title words like “senior”/“lead” are skipped up front. Languages (French, German…) go further — Gemini reads the description and skips roles that hard-require a language you list here. Your own skills are never blocked."
          suggestions={blockedSuggestions}
        />
      </section>

      <section className="grid gap-5 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <div>
          <label
            htmlFor="window"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Look-back window
          </label>
          <select
            id="window"
            value={form.published_within_days}
            onChange={(e) => set("published_within_days", Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent/50"
          >
            {WINDOW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Only fetch roles posted within this window.
          </p>
        </div>

        <div>
          <label
            htmlFor="max"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Max results per sync
          </label>
          <select
            id="max"
            value={form.max_items}
            onChange={(e) => set("max_items", Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent/50"
          >
            {MAX_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n === RECOMMENDED_MAX ? `${n} (recommended)` : n}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Caps how many jobs each sync scrapes (and your API usage).
          </p>
        </div>
      </section>

      {/* Save bar: sticks to the bottom of the viewport while scrolling. */}
      <div className="sticky bottom-4 z-10">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-sm text-muted-foreground">
            {state.error ? (
              <span className="text-accent">{state.error}</span>
            ) : saving ? (
              "Saving..."
            ) : dirty ? (
              "You have unsaved changes."
            ) : state.ok ? (
              <span className="text-success">All changes saved.</span>
            ) : (
              "Edit your filters, then save."
            )}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={() => setForm(saved)}
              className="h-11 rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
            >
              Reset
            </button>
            <button
              type="button"
              disabled={!configured || saving || !dirty}
              onClick={() => runSave(form)}
              className="h-11 rounded-xl border border-accent px-5 text-sm font-semibold text-accent transition-colors hover:bg-blush disabled:opacity-50"
            >
              {saving ? "Saving..." : dirty ? "Save changes" : "Saved"}
            </button>

            {completed && (
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong"
              >
                Finish setup
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
