"use client";

import { useId } from "react";

// Discrete year stops for the dropdowns. Numeric and role-agnostic, so the same
// band works for any track (dev, QA, DevOps, data...).
const MIN_YEARS = [1, 2, 3, 4, 5, 6, 8, 10];
const MAX_YEARS = [1, 2, 3, 4, 5, 6, 8, 10, 15];

const yr = (n: number) => `${n} ${n === 1 ? "year" : "years"}`;

/**
 * Experience filter as a min–max years range. `null` on either side means no
 * bound. The selects keep `max >= min` automatically. The chosen band is what
 * the Gemini scoring pass will compare each job's required experience against.
 *
 * Controlled: the parent owns `{ min, max }`.
 */
export function ExperienceRange({
  min,
  max,
  onChange,
}: {
  min: number | null;
  max: number | null;
  onChange: (next: { min: number | null; max: number | null }) => void;
}) {
  const minId = useId();
  const maxId = useId();

  function setMin(value: number | null) {
    // Don't let the minimum climb above a set maximum.
    const nextMax = value != null && max != null && max < value ? value : max;
    onChange({ min: value, max: nextMax });
  }

  function setMax(value: number | null) {
    const nextMin = value != null && min != null && min > value ? value : min;
    onChange({ min: nextMin, max: value });
  }

  const summary =
    min == null && max == null
      ? "Any experience — no roles filtered out by years."
      : min != null && max != null
        ? `Targeting roles that need ${min}–${max} years.`
        : min != null
          ? `Targeting roles that need ${min}+ years.`
          : `Targeting roles that need up to ${max} years.`;

  const selectClass =
    "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent/50";

  return (
    <div>
      <div className="mb-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Experience level
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={minId}
            className="mb-1.5 block text-xs text-muted-foreground"
          >
            Minimum
          </label>
          <select
            id={minId}
            value={min ?? ""}
            onChange={(e) =>
              setMin(e.target.value === "" ? null : Number(e.target.value))
            }
            className={selectClass}
          >
            <option value="">No minimum</option>
            {MIN_YEARS.map((y) => (
              <option key={y} value={y}>
                {yr(y)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={maxId}
            className="mb-1.5 block text-xs text-muted-foreground"
          >
            Maximum
          </label>
          <select
            id={maxId}
            value={max ?? ""}
            onChange={(e) =>
              setMax(e.target.value === "" ? null : Number(e.target.value))
            }
            className={selectClass}
          >
            <option value="">No maximum</option>
            {MAX_YEARS.map((y) => (
              <option key={y} value={y}>
                {yr(y)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        {summary} Applies to any track (dev, QA, DevOps…). When a sync runs,
        Gemini reads each job&apos;s required experience and skips ones outside
        this range; jobs that don&apos;t state experience are kept.
      </p>
    </div>
  );
}
