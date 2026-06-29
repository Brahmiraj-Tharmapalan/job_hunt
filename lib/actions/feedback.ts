"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type FeedbackState = { ok?: boolean; message?: string; error?: string };

const feedbackSchema = z.object({
  // Coerce because the rating arrives as a string from the form field.
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  name: z.string().trim().max(80).optional(),
});

/**
 * Store one piece of app/product feedback (a 1-5 star rating + optional comment).
 * Works for BOTH a signed-in user (dashboard) and an anonymous landing-page
 * visitor (user_id null). New rows are never featured — an admin curates which
 * reviews appear publicly (see the feedback_public migration).
 */
export async function submitFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  if (!isSupabaseConfigured) return { error: "Supabase isn't configured yet." };

  const parsed = feedbackSchema.safeParse({
    rating: formData.get("rating"),
    comment: formData.get("comment"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: "Please pick a star rating from 1 to 5." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("feedback").insert({
    user_id: user?.id ?? null,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
    name: parsed.data.name || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/feedback");
  return { ok: true, message: "Thanks — your feedback was sent." };
}
