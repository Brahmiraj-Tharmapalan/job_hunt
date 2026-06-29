import { ParallaxHero } from "@/components/landing/parallax-hero";
import { CtaButton } from "@/components/ui/cta-button";
import { Reveal } from "@/components/motion/reveal";

/** Hero section. Server-rendered copy sits above the client parallax art. */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Decorative parallax scene (client island, aria-hidden). */}
      <ParallaxHero />

      {/* Dissolve the decorative glow into solid ivory so the seam with the
          next section is clean, not blotchy. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-24 max-sm:py-40 text-center sm:pt-10 gap-8">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-accent backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Free forever, bring your own keys
          </span>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            The job hunt that respects{" "}
            <span className="text-accent">your privacy</span> and your wallet.
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">
            Upload your CV, let AI extract your skills, pick your sources, and
            hit Sync. Get a deduplicated, AI-scored job list you actually triage,
            with no spam, no auto-apply, and no per-user cost.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div
            id="get-started"
            className="mt-9 flex scroll-mt-24 flex-col items-center gap-8 sm:flex-row"
          >
            <CtaButton href="/login">Start hunting, it&apos;s free</CtaButton>
            <CtaButton href="#how-it-works" variant="secondary">
              See how it works
            </CtaButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
