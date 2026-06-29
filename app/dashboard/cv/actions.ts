"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isEncryptionConfigured } from "@/lib/crypto";
import { getDecryptedKey } from "@/lib/keys";
import { parseCvWithGemini, type CvExtraction } from "@/lib/gemini";

export type ParseCvState = {
  ok?: boolean;
  error?: string;
  data?: CvExtraction;
};

/**
 * Download the user's uploaded CV, parse it with their Gemini key, and prefill
 * their job_settings (required/secondary skills + countries). Returns the parsed
 * result for immediate display; never returns the API key.
 */
export async function parseCvAndPrefill(): Promise<ParseCvState> {
  if (!isSupabaseConfigured) return { error: "Supabase isn't configured." };
  if (!isEncryptionConfigured()) {
    return { error: "ENCRYPTION_MASTER_KEY isn't set on the server." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  const geminiKey = await getDecryptedKey("gemini");
  if (!geminiKey) {
    return { error: "Add your Gemini API key first (step 1)." };
  }

  const path = `${user.id}/cv.pdf`;
  const { data: blob, error: dlError } = await supabase.storage
    .from("cvs")
    .download(path);
  if (dlError || !blob) {
    return { error: "Couldn't find your uploaded CV. Try uploading again." };
  }

  const pdf = new Uint8Array(await blob.arrayBuffer());

  let parsed: CvExtraction;
  try {
    parsed = await parseCvWithGemini(geminiKey, pdf);
  } catch (err) {
    // Log the full error server-side for debugging; surface a trimmed, safe
    // message (Gemini errors describe the model/request, not the key).
    console.error("CV parse failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    if (/quota|rate limit|429|exceeded/i.test(detail)) {
      return {
        error:
          "Your Gemini key hit its rate/quota limit. Wait about a minute and try once more, or check your usage in Google AI Studio.",
      };
    }
    const safe = detail.replace(geminiKey, "***").slice(0, 220);
    return {
      error: `Gemini couldn't parse this CV: ${safe || "unknown error"}`,
    };
  }

  const { error: updateError } = await supabase
    .from("job_settings")
    .update({
      required_skills: parsed.required_skills,
      secondary_skills: parsed.secondary_skills,
      countries: parsed.countries,
      cv_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/dashboard/cv");
  revalidatePath("/dashboard");
  return { ok: true, data: parsed };
}
