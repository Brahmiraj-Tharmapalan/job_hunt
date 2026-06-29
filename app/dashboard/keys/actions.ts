"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { encryptSecret, isEncryptionConfigured, last4 } from "@/lib/crypto";
import { keysInputSchema } from "@/lib/keys";

export type SaveKeysState = { ok?: boolean; message?: string; error?: string };

/**
 * Encrypt and store BYO keys. Only fields the user actually filled in are
 * updated, so they can rotate one key without re-entering the other. Plaintext
 * is encrypted in-memory and never returned, logged, or sent to the browser.
 */
export async function saveKeys(
  _prev: SaveKeysState,
  formData: FormData,
): Promise<SaveKeysState> {
  if (!isSupabaseConfigured) return { error: "Supabase isn't configured yet." };
  if (!isEncryptionConfigured()) {
    return { error: "ENCRYPTION_MASTER_KEY isn't set on the server." };
  }

  const parsed = keysInputSchema.safeParse({
    gemini: formData.get("gemini"),
    apify: formData.get("apify"),
  });
  if (!parsed.success) return { error: "Invalid input." };

  const gemini = parsed.data.gemini?.trim();
  const apify = parsed.data.apify?.trim();
  if (!gemini && !apify) return { error: "Enter at least one key to save." };
  if (gemini && gemini.length < 20) {
    return { error: "That Gemini key looks too short." };
  }
  if (apify && apify.length < 20) {
    return { error: "That Apify token looks too short." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  const row: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (gemini) {
    const e = encryptSecret(gemini);
    row.gemini_key_enc = e.enc;
    row.gemini_key_iv = e.iv;
    row.gemini_key_tag = e.tag;
    row.gemini_last4 = last4(gemini);
  }
  if (apify) {
    const e = encryptSecret(apify);
    row.apify_key_enc = e.enc;
    row.apify_key_iv = e.iv;
    row.apify_key_tag = e.tag;
    row.apify_last4 = last4(apify);
  }

  const { error } = await supabase
    .from("user_keys")
    .upsert(row, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/keys");
  revalidatePath("/dashboard");
  return { ok: true, message: "Keys saved securely." };
}

/** Clear a stored key (ciphertext + IV + tag + last4) for one provider. */
export async function removeKey(
  provider: "gemini" | "apify",
): Promise<SaveKeysState> {
  if (!isSupabaseConfigured) return { error: "Supabase isn't configured yet." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  const cleared =
    provider === "gemini"
      ? {
          gemini_key_enc: null,
          gemini_key_iv: null,
          gemini_key_tag: null,
          gemini_last4: null,
        }
      : {
          apify_key_enc: null,
          apify_key_iv: null,
          apify_key_tag: null,
          apify_last4: null,
        };

  const { error } = await supabase
    .from("user_keys")
    .update({ ...cleared, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/keys");
  revalidatePath("/dashboard");
  return { ok: true, message: "Key removed." };
}
