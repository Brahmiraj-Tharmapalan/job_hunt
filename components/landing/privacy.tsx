import { Reveal } from "@/components/motion/reveal";

const POINTS = [
  {
    title: "Your keys, encrypted",
    body: "Gemini & Apify keys are sealed with AES-256-GCM. The master key lives in an env var, never the database, and plaintext never touches the browser or logs.",
  },
  {
    title: "Isolated by design",
    body: "Every table is protected by Supabase Row-Level Security scoped to your account, and every query is also manually scoped to your user id. Defense in depth.",
  },
  {
    title: "Your CV stays yours",
    body: "Uploads live in a private bucket keyed to your user folder. It's read once to parse skills, and it's never shared or used to train anything.",
  },
];

export function Privacy() {
  return (
    <section
      id="privacy"
      className="scroll-mt-20 bg-accent text-accent-contrast"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-blush">
            Privacy-first
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Built so we never see what matters.
          </h2>
          <p className="mt-5 max-w-md text-pretty leading-7 text-blush/90">
            Competitors gate worldwide search and good features behind paywalls
            and harvest your data. We flipped it: you bring the keys, you own the
            data, and we keep almost nothing.
          </p>
        </Reveal>

        <div className="grid gap-4">
          {POINTS.map((point, i) => (
            <Reveal key={point.title} delay={i * 0.08}>
              <div className="rounded-2xl border border-blush/20 bg-accent-strong/40 p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-blush/85">
                  {point.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
