import { getFeaturedFeedback } from "@/lib/feedback";
import { Stars } from "@/components/ui/stars";
import { Reveal } from "@/components/motion/reveal";
import { LandingFeedbackForm } from "@/components/landing/feedback-form";

/**
 * Social-proof band: featured reviews (curated by an admin via `featured = true`)
 * plus an open form so visitors can leave their own. Server component — reads
 * featured rows through the cookieless anon seam, so the landing page stays ISR.
 * When nothing is featured yet, the testimonial grid is simply omitted (we never
 * fabricate reviews) and only the "leave a review" form shows.
 */
export async function Reviews() {
  const { reviews, average, count } = await getFeaturedFeedback();

  return (
    <section id="reviews" aria-label="Reviews" className="py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-6">
        <Reveal className="text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Loved by job hunters
          </h2>
          {count > 0 ? (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Stars rating={Math.round(average)} className="h-5 w-5" />
              <span className="text-sm font-medium text-muted-foreground">
                {average.toFixed(1)} average · {count} review{count > 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
              Be one of the first to share how OpenJobHunt worked for you.
            </p>
          )}
        </Reveal>

        {reviews.length > 0 && (
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, i) => (
              <Reveal key={r.id} delay={i * 0.06}>
                <figure className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm">
                  <Stars rating={r.rating} />
                  <blockquote className="mt-3 flex-1 text-pretty text-sm leading-6 text-foreground">
                    “{r.comment}”
                  </blockquote>
                  <figcaption className="mt-4 text-sm font-medium text-muted-foreground">
                    {r.name?.trim() || "A job hunter"}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        )}

        <LandingFeedbackForm />
      </div>
    </section>
  );
}
