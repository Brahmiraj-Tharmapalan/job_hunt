"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Editable subset of job_settings. The sync-only fields aren't touched here.
 * Note: which job boards run is derived automatically from `countries` at sync
 * time (see lib/sources-meta.ts), so it isn't a saved field. */
export type SettingsInput = {
  required_skills: string[];
  secondary_skills: string[];
  countries: string[];
  /** Experience band in years; null on either side means no bound. */
  min_experience_years: number | null;
  max_experience_years: number | null;
  search_keywords: string[];
  blocked_words: string[];
  published_within_days: number;
  max_items: number;
};

export type SaveSettingsState = {
  ok?: boolean;
  error?: string;
  /** The tidied values that were persisted; the client adopts these as its
   * new "saved" baseline so the form knows it's no longer dirty. */
  saved?: SettingsInput;
};

const list = z.array(z.string()).max(60);

const schema = z.object({
  required_skills: list,
  secondary_skills: list,
  countries: list,
  min_experience_years: z.number().int().min(0).max(60).nullable(),
  max_experience_years: z.number().int().min(0).max(60).nullable(),
  search_keywords: list,
  blocked_words: list,
  published_within_days: z.coerce.number().int().min(1).max(30),
  max_items: z.coerce.number().int().min(1).max(1000),
});

/** Trim, drop empties, de-dupe case-insensitively, cap length. */
function tidy(items: string[], max = 60): string[] {
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

/**
 * Persist the user's editable filters to their job_settings row. RLS scopes
 * writes to the owner, and we ALSO pin `.eq("user_id", ...)` so the admin path
 * could never touch another row. Returns a small status for the client form.
 */
export async function saveSettings(
  _prev: SaveSettingsState,
  input: SettingsInput,
): Promise<SaveSettingsState> {
  if (!isSupabaseConfigured) return { error: "Supabase isn't configured." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: "Some values look off. Check the numbers and try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  const v = parsed.data;
  const required_skills = tidy(v.required_skills);
  const secondary_skills = tidy(v.secondary_skills);

  // Safety rail: never let a skill the user actually wants end up in the block
  // list (it would silently filter out their own matches).
  const ownSkills = new Set(
    [...required_skills, ...secondary_skills].map((s) => s.toLowerCase()),
  );
  const blocked_words = tidy(v.blocked_words).filter(
    (w) => !ownSkills.has(w.toLowerCase()),
  );

  // Keep the range coherent: if both ends are set but inverted, swap them.
  let minYears = v.min_experience_years;
  let maxYears = v.max_experience_years;
  if (minYears != null && maxYears != null && minYears > maxYears) {
    [minYears, maxYears] = [maxYears, minYears];
  }

  const saved: SettingsInput = {
    required_skills,
    secondary_skills,
    countries: tidy(v.countries),
    min_experience_years: minYears,
    max_experience_years: maxYears,
    search_keywords: tidy(v.search_keywords),
    blocked_words,
    published_within_days: v.published_within_days,
    max_items: v.max_items,
  };

  const { error } = await supabase
    .from("job_settings")
    .update({
      ...saved,
      filters_reviewed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true, saved };
}
