"use client";

import { useActionState, useState } from "react";
import { StarRating } from "@/components/ui/star-rating";
import { submitFeedback, type FeedbackState } from "@/lib/actions/feedback";

/** Public landing-page review form — anyone (signed in or not) can leave a star
 * rating + note. New reviews aren't shown until an admin features them. */
export function LandingFeedbackForm() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState<FeedbackState, FormData>(
    submitFeedback,
    {},
  );

  // Reset on a fresh success (adjust-during-render pattern, no effect).
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.ok) {
      setRating(0);
      setComment("");
      setName("");
    }
  }

  return (
    <form
      action={action}
      className="mx-auto mt-12 max-w-xl space-y-4 rounded-2xl border border-border bg-surface p-6 text-left shadow-sm"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">Used it? Leave a review</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell other hunters what you think. Reviews are read before they go public.
        </p>
      </div>

      <StarRating value={rating} onChange={setRating} name="rating" disabled={pending} />

      <input
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        disabled={pending}
        placeholder="Your name (optional)"
        className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-accent/50 disabled:opacity-60"
      />

      <textarea
        name="comment"
        rows={3}
        maxLength={2000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={pending}
        placeholder="What did you like? What would you change?"
        className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-accent/50 disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || rating === 0}
          className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {pending ? "Sending…" : "Submit review"}
        </button>
        {state.error && <span className="text-sm text-accent">{state.error}</span>}
        {state.ok && state.message && (
          <span className="text-sm text-success">{state.message}</span>
        )}
      </div>
    </form>
  );
}
