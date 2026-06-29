"use client";

import { useActionState, useState } from "react";
import { StarRating } from "@/components/ui/star-rating";
import { submitFeedback, type FeedbackState } from "@/lib/actions/feedback";

export function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [state, action, pending] = useActionState<FeedbackState, FormData>(
    submitFeedback,
    {},
  );

  // On a fresh successful send, clear the form so it's ready for another note.
  // Adjusting state during render (vs. in an effect) avoids a cascading render
  // and matches the pattern used elsewhere (see jobs-view).
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.ok) {
      setRating(0);
      setComment("");
    }
  }

  return (
    <form
      action={action}
      className="space-y-5 rounded-2xl border border-border bg-surface p-6"
    >
      <div>
        <label className="text-sm font-medium text-foreground">
          How is OpenJobHunt working for you?
        </label>
        <p className="mt-1 text-sm text-muted-foreground">
          Your rating helps us decide what to build next.
        </p>
        <div className="mt-3">
          <StarRating
            value={rating}
            onChange={setRating}
            name="rating"
            disabled={pending}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="comment"
          className="text-sm font-medium text-foreground"
        >
          Anything else? <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={4}
          maxLength={2000}
          disabled={pending}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What worked, what didn't, what you wish it did…"
          className="mt-2 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-accent/50 disabled:opacity-60"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || rating === 0}
          className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send feedback"}
        </button>
        {state.error && <span className="text-sm text-accent">{state.error}</span>}
        {state.ok && state.message && (
          <span className="text-sm text-success">{state.message}</span>
        )}
      </div>
    </form>
  );
}
