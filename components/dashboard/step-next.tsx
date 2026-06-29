import Link from "next/link";

/**
 * "Next step" control for the setup wizard. Enabled (a link) only once the
 * current step is complete; otherwise a disabled button with a hint telling the
 * user what to finish first.
 */
export function StepNext({
  done,
  href,
  label,
  lockedHint,
}: {
  done: boolean;
  href: string;
  label: string;
  lockedHint: string;
}) {
  if (done) {
    return (
      <Link
        href={href}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-accent px-6 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong"
      >
        {label}
        <Arrow />
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-accent px-6 text-sm font-semibold text-accent-contrast opacity-40"
      >
        {label}
        <Arrow />
      </button>
      <p className="text-xs text-muted-foreground">{lockedHint}</p>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
