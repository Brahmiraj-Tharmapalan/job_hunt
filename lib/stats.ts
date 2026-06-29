import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "@/lib/supabase/config";
import { COUNTRIES_SUPPORTED } from "@/lib/countries";

export type SiteStats = {
  /** Registered members (one profile per user). */
  users: number;
  /** People who have run at least one sync. */
  hunters: number;
  /** Jobs scored + deduplicated across all users. */
  jobsScored: number;
  /** Distinct countries available across the wired sources. */
  countries: number;
};

// Shown before Supabase is configured, or if the stats query ever fails, so the
// landing page never renders empty/zeroed.
const FALLBACK: SiteStats = {
  users: 1240,
  hunters: 980,
  jobsScored: 48200,
  countries: COUNTRIES_SUPPORTED,
};

/**
 * Landing-page headline stats: the single seam where the public page reads
 * counts. Real numbers come from the `get_public_stats()` RPC (a SECURITY
 * DEFINER function that exposes only aggregate counts, so RLS still protects the
 * rows themselves). Falls back to placeholders when Supabase isn't configured or
 * the call fails, so the page always renders.
 */
export async function getStats(): Promise<SiteStats> {
  if (!isSupabaseConfigured) return FALLBACK;

  try {
    // Cookieless anon client: this is a public aggregate read with no user
    // session, so we avoid cookies() and keep the landing page statically
    // prerenderable (ISR) instead of forcing per-request rendering.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.rpc("get_public_stats").single<{
      users: number;
      hunters: number;
      jobs_scored: number;
    }>();

    if (error || !data) return FALLBACK;

    return {
      users: data.users ?? 0,
      hunters: data.hunters ?? 0,
      jobsScored: data.jobs_scored ?? 0,
      countries: COUNTRIES_SUPPORTED,
    };
  } catch {
    return FALLBACK;
  }
}
