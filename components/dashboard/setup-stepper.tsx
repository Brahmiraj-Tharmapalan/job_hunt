"use client";

import Link from "next/link";
import type { SetupStatus } from "@/lib/setup";

export type StepKey = "keys" | "cv" | "filters" | "sync";

type StepDef = {
  key: StepKey;
  n: number;
  label: string;
  href: string | null; // null = no page yet (locked / coming soon)
  icon: React.ReactNode;
};

const STEPS: StepDef[] = [
  { key: "keys", n: 1, label: "API keys", href: "/dashboard/keys", icon: <KeyIcon /> },
  { key: "cv", n: 2, label: "Upload CV", href: "/dashboard/cv", icon: <DocIcon /> },
  {
    key: "filters",
    n: 3,
    label: "Filters",
    href: "/dashboard/settings",
    icon: <SlidersIcon />,
  },
  { key: "sync", n: 4, label: "Sync", href: null, icon: <SyncIcon /> },
];

/**
 * Setup progress bar. A step is:
 *  - completed → check icon, clickable (revisit anytime)
 *  - current   → highlighted
 *  - unlocked  → reachable because every earlier step is done (clickable)
 *  - locked    → an earlier step is incomplete (or no page yet), not clickable
 */
export function SetupStepper({
  current,
  status,
}: {
  current: StepKey;
  status: SetupStatus;
}) {
  const done: Record<StepKey, boolean> = { ...status, sync: false };

  return (
    <nav aria-label="Setup progress" className="mb-8">
      <ol className="flex items-center">
        {STEPS.map((step, i) => {
          const isDone = done[step.key];
          const isCurrent = step.key === current;
          // Reachable if every earlier step is complete.
          const unlocked = STEPS.slice(0, i).every((s) => done[s.key]);
          const clickable =
            Boolean(step.href) && !isCurrent && (isDone || unlocked);

          const circle = (
            <span
              className={[
                "grid h-10 w-10 place-items-center rounded-full border-2 transition-colors",
                isCurrent
                  ? "border-accent bg-accent text-accent-contrast shadow-sm"
                  : isDone
                    ? "border-accent/40 bg-blush text-accent"
                    : "border-border bg-surface text-muted-foreground",
                clickable ? "group-hover:border-accent/70" : "",
              ].join(" ")}
            >
              {isDone && !isCurrent ? <CheckIcon /> : step.icon}
            </span>
          );

          const label = (
            <span
              className={[
                "mt-2 hidden text-xs font-medium sm:block",
                isCurrent
                  ? "text-foreground"
                  : isDone
                    ? "text-accent"
                    : "text-muted-foreground",
              ].join(" ")}
            >
              {step.label}
            </span>
          );

          return (
            <li key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                {clickable ? (
                  <Link
                    href={step.href!}
                    aria-current={isCurrent ? "step" : undefined}
                    className="group flex flex-col items-center"
                  >
                    {circle}
                    {label}
                  </Link>
                ) : (
                  <div
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex flex-col items-center ${
                      step.href ? "" : "opacity-70"
                    }`}
                    title={
                      !step.href
                        ? "Coming soon"
                        : !clickable && !isCurrent
                          ? "Finish the earlier steps first"
                          : undefined
                    }
                  >
                    {circle}
                    {label}
                  </div>
                )}
              </div>

              {/* Connector line to the next step */}
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 rounded-full sm:mx-2 ${
                    done[step.key] ? "bg-accent/40" : "bg-border"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---- icons ---- */

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M11 11l8 8M16 16l2-2M18 18l2-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3h7l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 13h8M8 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2.2" fill="currentColor" />
      <circle cx="15" cy="12" r="2.2" fill="currentColor" />
      <circle cx="8" cy="17" r="2.2" fill="currentColor" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11a8 8 0 0114-5l2 2M20 13a8 8 0 01-14 5l-2-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 4v4h-4M4 20v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
