import "server-only";
import { createClient } from "@/lib/supabase/server";

export type JobSettings = {
  required_skills: string[];
  secondary_skills: string[];
  countries: string[];
  sources: string[];
  /** Legacy label list, no longer edited; superseded by the years range below. */
  experience_levels: string[];
  min_experience_years: number | null;
  max_experience_years: number | null;
  blocked_words: string[];
  skip_rules: string[];
  search_keywords: string[];
  published_within_days: number;
  max_items: number;
  filters_reviewed: boolean;
  cv_path: string | null;
  last_sync_at: string | null;
};

/** The current user's job_settings row (created on signup by the trigger). */
export async function getJobSettings(): Promise<JobSettings | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("job_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as JobSettings | null) ?? null;
}
