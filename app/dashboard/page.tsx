import type { Metadata } from "next";
import Link from "next/link";
import { getSetupStatus } from "@/lib/setup";

export const metadata: Metadata = {
  title: "Dashboard",
};

type Step = {
  n: number;
  title: string;
  body: string;
  href?: string;
  done?: boolean;
};

export default async function DashboardPage() {
  const setup = await getSetupStatus();
  const { keys: keysDone, cv: cvDone, filters: filtersDone } = setup;

  const steps: Step[] = [
    {
      n: 1,
      title: "Add your API keys",
      body: keysDone
        ? "Gemini and Apify keys are saved and encrypted. You can rotate them anytime."
        : "Paste your Gemini + Apify keys. Stored encrypted (AES-256-GCM). We only ever show ••••last4.",
      href: "/dashboard/keys",
      done: keysDone,
    },
    {
      n: 2,
      title: "Upload your CV",
      body: cvDone
        ? "Your CV is parsed, so skills and countries are prefilled. Re-upload anytime to refresh."
        : "Gemini reads your PDF and extracts your skills + target countries to prefill your search.",
      href: "/dashboard/cv",
      done: cvDone,
    },
    {
      n: 3,
      title: "Tune your filters",
      body: filtersDone
        ? "Your skills, countries, job titles, and look-back window are set. Edit anytime."
        : "Edit your skills, countries, job-title keywords, and look-back window before your first sync.",
      href: "/dashboard/settings",
      done: filtersDone,
    },
    {
      n: 4,
      title: "Run your first sync",
      body: "Pull roles, drop the obvious misses, and AI-score the rest into a clean, sorted shortlist.",
      href: "/dashboard/jobs",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Setup checklist
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re signed in. Finish setup to start hunting.
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step) => {
          const card = <StepCard step={step} />;
          return (
            <li key={step.n}>
              {step.href ? (
                <Link
                  href={step.href}
                  className="block rounded-2xl transition-colors hover:bg-surface-muted/60"
                >
                  {card}
                </Link>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold ${
          step.done
            ? "bg-success text-white"
            : "bg-blush text-accent"
        }`}
      >
        {step.done ? "✓" : step.n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-foreground">{step.title}</h2>
          {step.done ? (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
              Done
            </span>
          ) : step.href ? (
            <span className="rounded-full bg-blush px-2 py-0.5 text-[11px] font-medium text-accent">
              Start
            </span>
          ) : (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Coming soon
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {step.body}
        </p>
      </div>
    </div>
  );
}
