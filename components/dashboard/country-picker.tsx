"use client";

import { useMemo, useState } from "react";
import { COUNTRY_GROUPS } from "@/lib/countries";

/**
 * Region-grouped country picker. Replaces the free-text chip input for the
 * Countries filter: users tick countries from a curated list, search to narrow
 * it, and use per-region or global "Select all" to bulk-add. Selected values
 * not in the list (e.g. saved from an older free-text entry) still show as
 * removable chips so nothing is silently dropped.
 *
 * Controlled: the parent owns the array of selected country names.
 */
export function CountryPicker({
  items = [],
  onChange,
  max = 60,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const [query, setQuery] = useState("");

  // Case-insensitive membership for quick toggles/lookups.
  const selected = useMemo(
    () => new Set(items.map((c) => c.toLowerCase())),
    [items],
  );

  const q = query.trim().toLowerCase();

  // Each region narrowed to the countries matching the search. Empty regions
  // drop out so the list collapses to just what you typed.
  const filteredGroups = useMemo(
    () =>
      COUNTRY_GROUPS.map((g) => ({
        region: g.region,
        countries: q
          ? g.countries.filter((c) => c.toLowerCase().includes(q))
          : g.countries,
      })).filter((g) => g.countries.length > 0),
    [q],
  );

  const atMax = items.length >= max;

  function toggle(country: string) {
    if (selected.has(country.toLowerCase())) {
      onChange(items.filter((c) => c.toLowerCase() !== country.toLowerCase()));
    } else {
      if (atMax) return;
      onChange([...items, country]);
    }
  }

  function remove(country: string) {
    onChange(items.filter((c) => c !== country));
  }

  /** Add every (currently visible) country in a list, respecting the max cap. */
  function addMany(countries: string[]) {
    const next = [...items];
    const have = new Set(next.map((c) => c.toLowerCase()));
    for (const c of countries) {
      if (next.length >= max) break;
      if (have.has(c.toLowerCase())) continue;
      next.push(c);
      have.add(c.toLowerCase());
    }
    onChange(next);
  }

  /** Remove every (currently visible) country in a list. */
  function removeMany(countries: string[]) {
    const drop = new Set(countries.map((c) => c.toLowerCase()));
    onChange(items.filter((c) => !drop.has(c.toLowerCase())));
  }

  // What "Select all" (top, across every visible region) should do: if every
  // visible country is already selected, the action clears them instead.
  const visible = filteredGroups.flatMap((g) => g.countries);
  const allVisibleSelected =
    visible.length > 0 && visible.every((c) => selected.has(c.toLowerCase()));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Countries
        </label>
        <span className="text-[11px] text-muted-foreground">
          {items.length}
          {max ? `/${max}` : ""}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {/* Selected chips */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-border p-2">
            {items.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-md bg-blush px-2 py-1 text-xs font-medium text-accent"
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
          </div>
        )}

        {/* Search + global select-all */}
        <div className="flex items-center gap-2 border-b border-border p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries..."
            className="min-w-0 flex-1 bg-transparent px-1.5 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <button
            type="button"
            disabled={visible.length === 0}
            onClick={() =>
              allVisibleSelected ? removeMany(visible) : addMany(visible)
            }
            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-blush disabled:opacity-40"
          >
            {allVisibleSelected ? "Clear all" : "Select all"}
          </button>
        </div>

        {/* Region sections */}
        <div className="max-h-72 space-y-4 overflow-y-auto p-3">
          {filteredGroups.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No countries match “{query.trim()}”.
            </p>
          )}

          {filteredGroups.map((group) => {
            const allSelected = group.countries.every((c) =>
              selected.has(c.toLowerCase()),
            );
            return (
              <div key={group.region}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.region}
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      allSelected
                        ? removeMany(group.countries)
                        : addMany(group.countries)
                    }
                    className="rounded-lg px-2 py-0.5 text-[11px] font-semibold text-accent transition-colors hover:bg-blush"
                  >
                    {allSelected ? "Clear" : "Select all"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.countries.map((country) => {
                    const isSelected = selected.has(country.toLowerCase());
                    return (
                      <button
                        key={country}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggle(country)}
                        disabled={!isSelected && atMax}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          isSelected
                            ? "bg-accent text-accent-contrast"
                            : "border border-border bg-surface text-foreground hover:bg-surface-muted"
                        }`}
                      >
                        {country}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        Where we search for roles. Pick a whole region with its “Select all”, or
        add countries one at a time.
      </p>
    </div>
  );
}
