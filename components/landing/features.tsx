import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const FEATURES = [
  {
    title: "AI scoring, not AI invention",
    body: "The model only scores and parses. Every listing is a real job from Apify and legal feed APIs, never hallucinated.",
    icon: (
      <path d="M12 3l2.5 5.2L20 9l-4 4 1 6-5-2.8L7 19l1-6-4-4 5.5-.8L12 3z" />
    ),
  },
  {
    title: "Smart deduplication",
    body: "Re-syncs upsert on a stable key, so you never re-triage a role, and your applied / skipped status always survives.",
    icon: <path d="M8 7h11M8 12h11M8 17h11M3.5 7h.01M3.5 12h.01M3.5 17h.01" />,
  },
  {
    title: "A precision-recall dial",
    body: "Broad keywords plus a skill gate that accepts your whole stack catches generic-titled roles without drowning in noise.",
    icon: <path d="M4 12h16M4 12a4 4 0 108 0 4 4 0 10-8 0zm8 0a4 4 0 108 0" />,
  },
  {
    title: "Guardrails baked in",
    body: "Your own required skills can never end up on the blocked list. Hard disqualifiers only, so relevant jobs never vanish silently.",
    icon: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />,
  },
  {
    title: "Everything's adjustable",
    body: "Keywords, look-back window (1 to 30 days), max items, and sources all live in Settings, so adjust them for thin or busy markets.",
    icon: <path d="M4 6h10M4 12h16M10 18h10M14 4v4M8 10v4M18 16v4" />,
  },
  {
    title: "Costs you (almost) nothing",
    body: "BYO keys means scrape + scoring runs on your quota. We dedupe, prune old jobs, and only score what's new to keep it tiny.",
    icon: <path d="M12 3v18M7 7h7a3 3 0 010 6H7m0 4h8" />,
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 pb-8">
      <div className="mx-auto w-full max-w-6xl px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Why OpenJobHunt
          </p>
          <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            The polish of a paid tool, with none of the paywalls.
          </h2>
        </Reveal>

        <RevealGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <RevealItem
              key={feature.title}
              className="group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-blush-strong"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blush text-accent">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {feature.icon}
                </svg>
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {feature.body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
