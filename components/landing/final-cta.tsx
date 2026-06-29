import { Reveal } from "@/components/motion/reveal";
import { CtaButton } from "@/components/ui/cta-button";

export function FinalCta() {
  return (
    <section className="py-8">
      <div className="mx-auto w-full max-w-6xl px-6">
        <Reveal>
          <div className="ojh-grid relative overflow-hidden rounded-2xl border border-border bg-surface px-8 py-8 text-center sm:px-16">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blush-strong/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />

            <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Stop paying to search. Start hunting on your terms.
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
              Free, private, and yours. Bring your keys and have your first
              scored shortlist in minutes.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <CtaButton href="/login">Get started free</CtaButton>
              <CtaButton href="#how-it-works" variant="secondary">
                How it works
              </CtaButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
