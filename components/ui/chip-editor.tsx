"use client";

import { useState } from "react";

/**
 * Editable tag/chip input. Type a value and press Enter or comma to add it;
 * click ✕ (or Backspace on an empty input) to remove. De-dupes case-insensitively
 * and trims whitespace. Controlled: the parent owns the array.
 */
export function ChipEditor({
  label,
  items,
  onChange,
  placeholder = "Type and press Enter...",
  tone = "accent",
  hint,
  max = 60,
  suggestions,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  tone?: "accent" | "muted";
  hint?: string;
  max?: number;
  /** Optional tap-to-add words shown below the field; ones already added hide. */
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const value = raw.trim().replace(/,$/, "").trim();
    if (!value) return;
    if (items.length >= max) return;
    const exists = items.some((i) => i.toLowerCase() === value.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...items, value]);
    setDraft("");
  }

  function addMany(values: string[]) {
    const next = [...items];
    const have = new Set(next.map((i) => i.toLowerCase()));
    for (const raw of values) {
      if (next.length >= max) break;
      const value = raw.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (have.has(key)) continue;
      next.push(value);
      have.add(key);
    }
    onChange(next);
  }

  function remove(item: string) {
    onChange(items.filter((i) => i !== item));
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        <span className="text-[11px] text-muted-foreground">
          {items.length}
          {max ? `/${max}` : ""}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface p-2 focus-within:border-accent/50">
        {items.map((item) => (
          <span
            key={item}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
              tone === "accent"
                ? "bg-accent text-accent-contrast"
                : "bg-blush text-accent"
            }`}
          >
            {item}
            <button
              type="button"
              onClick={() => remove(item)}
              aria-label={`Remove ${item}`}
              className="grid h-3.5 w-3.5 place-items-center rounded-sm opacity-70 transition-opacity hover:opacity-100"
            >
              <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
                <path
                  d="M1 1l8 8M9 1l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        ))}

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && items.length) {
              remove(items[items.length - 1]);
            }
          }}
          onBlur={() => add(draft)}
          placeholder={items.length >= max ? "Limit reached" : placeholder}
          disabled={items.length >= max}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
        />
      </div>

      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}

      {suggestions && suggestions.length > 0 && (() => {
        const open = suggestions.filter(
          (s) => !items.some((i) => i.toLowerCase() === s.toLowerCase()),
        );
        const allAdded = open.length === 0;
        return (
          <div className="mt-2">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">Suggestions</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={allAdded || items.length >= max}
                  onClick={() => addMany(suggestions)}
                  className="rounded-lg px-2 py-0.5 text-[11px] font-semibold text-accent transition-colors hover:bg-blush disabled:opacity-40"
                >
                  Select all
                </button>
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => onChange([])}
                  className="rounded-lg px-2 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
            </div>
            {!allAdded && items.length < max && (
              <div className="flex flex-wrap gap-1.5">
                {open.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => add(s)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    <span aria-hidden="true" className="text-accent">+</span>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
