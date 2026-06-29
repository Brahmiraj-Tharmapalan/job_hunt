import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

const STEPS = [
  {
    n: "01",
    title: "Add your keys",
    body: "Paste your own Gemini + Apify keys. They're encrypted at rest (AES-256-GCM) and never reach the browser; the UI only shows ••••last4.",
  },
  {
    n: "02",
    title: "Upload your CV",
    body: "Gemini reads your PDF directly and extracts your skills and target countries, then prefills your search so you're set up in seconds.",
  },
  {
    n: "03",
    title: "Tune & Sync",
    body: "Pick sources, keywords, look-back window and filters. Hit Sync and we scrape, dedupe, and AI-score only the new roles in small batches.",
  },
  {
    n: "04",
    title: "Triage",
    body: "Work a clean, scored list: shortlist, mark applied, or skip-with-reason. Status survives every re-sync, so you never see the same job twice.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 py-24"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            How it works
          </p>
          <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From CV to a scored shortlist in four steps.
          </h2>
        </Reveal>

        <RevealGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <RevealItem
              key={step.n}
              className="relative rounded-2xl border border-border bg-surface p-6"
            >
              <span className="font-mono text-sm font-semibold text-accent">
                {step.n}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
