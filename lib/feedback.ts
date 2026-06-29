import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "@/lib/supabase/config";

export type Testimonial = {
  id: string;
  rating: number;
  comment: string;
  name: string | null;
  created_at: string;
};

export type FeaturedFeedback = {
  reviews: Testimonial[];
  /** Average rating across featured reviews, rounded to 1 dp; 0 when none. */
  average: number;
  count: number;
};

/**
 * Featured reviews for the public landing testimonials. Reads only rows an admin
 * has marked `featured = true` (public-read RLS), via a cookieless anon client so
 * the landing page stays statically prerenderable (ISR) — same seam as getStats.
 * Returns an empty set (so the section degrades gracefully) when Supabase isn't
 * configured, nothing is featured, or the query fails.
 */
export async function getFeaturedFeedback(limit = 6): Promise<FeaturedFeedback> {
  const empty: FeaturedFeedback = { reviews: [], average: 0, count: 0 };
  if (!isSupabaseConfigured) return empty;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase
      .from("feedback")
      .select("id, rating, comment, name, created_at")
      .eq("featured", true)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) return empty;

    const reviews = data as Testimonial[];
    const average =
      Math.round(
        (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10,
      ) / 10;
    return { reviews, average, count: reviews.length };
  } catch {
    return empty;
  }
}
