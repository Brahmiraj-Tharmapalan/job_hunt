/**
 * Central Supabase env handling.
 *
 * Until real keys are added, `isSupabaseConfigured` is false and the rest of the
 * app degrades gracefully (no auth, a "configure me" notice) instead of crashing
 * the build. The fallback URL/key only exist to satisfy the client constructors,
 * which validate the URL shape; they never reach a real backend.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const SUPABASE_URL = url || "https://placeholder.supabase.co";
export const SUPABASE_ANON_KEY = anonKey || "placeholder-anon-key";
