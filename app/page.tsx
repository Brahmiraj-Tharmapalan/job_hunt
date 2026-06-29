import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/landing/hero";
import { Stats } from "@/components/landing/stats";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Privacy } from "@/components/landing/privacy";
import { Reviews } from "@/components/landing/reviews";
import { FinalCta } from "@/components/landing/final-cta";

/**
 * Landing page.
 *
 * Prerendered to static HTML, then revalidated hourly (ISR) so the live stats
 * band stays fresh without a redeploy and without hitting the DB per request.
 * The client islands (parallax hero, scroll reveals, CTA buttons) hydrate on
 * top of the prerendered shell.
 */
export const revalidate = 3600;

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <Privacy />
        <Reviews />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
