"use client";

import { useState } from "react";

const LABELS = ["Terrible", "Poor", "Okay", "Good", "Love it"];

/**
 * Controlled 1-5 star picker. Hovering previews a rating without committing it;
 * clicking (or arrow keys / 1-5) commits. Renders as a radiogroup so it's
 * keyboard- and screen-reader-navigable. `value` of 0 means "nothing picked yet".
 */
export function StarRating({
  value,
  onChange,
  name,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  /** When set, mirrors the value into a hidden input for plain <form> posts. */
  name?: string;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Star rating"
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= shown;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? "s" : ""} — ${LABELS[star - 1]}`}
              disabled={disabled}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  onChange(Math.min(5, (value || 0) + 1));
                } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  onChange(Math.max(1, (value || 1) - 1));
                }
              }}
              className="rounded-md p-0.5 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-8 w-8 transition-colors ${
                  active ? "text-accent" : "text-border"
                }`}
                fill={active ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.55l-5.9 3.1 1.13-6.57L2.45 9.44l6.6-.96L12 2.5z" />
              </svg>
            </button>
          );
        })}
      </div>
      <span className="min-w-[5rem] text-sm font-medium text-muted-foreground">
        {shown ? LABELS[shown - 1] : "Tap to rate"}
      </span>
      {name && <input type="hidden" name={name} value={value || ""} />}
    </div>
  );
}
