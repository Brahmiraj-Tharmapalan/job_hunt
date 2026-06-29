import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/crypto";

/** Loose validation: providers change formats, so just guard obvious junk. */
export const keysInputSchema = z.object({
  gemini: z.string().trim().optional(),
  apify: z.string().trim().optional(),
});

export type ProviderStatus = { set: boolean; last4: string | null };
export type KeyStatus = { gemini: ProviderStatus; apify: ProviderStatus };

const EMPTY: KeyStatus = {
  gemini: { set: false, last4: null },
  apify: { set: false, last4: null },
};

/**
 * Masked key status for the current user; only the last4 hint ever leaves the
 * database. Never selects or returns the ciphertext to callers.
 */
export async function getKeyStatus(): Promise<KeyStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const { data } = await supabase
    .from("user_keys")
    .select("gemini_last4, apify_last4")
    .eq("user_id", user.id) // manual scope in addition to RLS
    .maybeSingle();

  return {
    gemini: { set: Boolean(data?.gemini_last4), last4: data?.gemini_last4 ?? null },
    apify: { set: Boolean(data?.apify_last4), last4: data?.apify_last4 ?? null },
  };
}

/**
 * Decrypt and return the current user's plaintext key for a provider, or null.
 * Server-only: the result must never be returned to the browser or logged.
 */
export async function getDecryptedKey(
  provider: "gemini" | "apify",
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_keys")
    .select(`${provider}_key_enc, ${provider}_key_iv, ${provider}_key_tag`)
    .eq("user_id", user.id)
    .maybeSingle();

  const row = data as Record<string, string | null> | null;
  const enc = row?.[`${provider}_key_enc`];
  const iv = row?.[`${provider}_key_iv`];
  const tag = row?.[`${provider}_key_tag`];
  if (!enc || !iv || !tag) return null;

  return decryptSecret({ enc, iv, tag });
}
