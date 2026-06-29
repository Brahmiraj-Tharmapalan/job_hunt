import { getStats } from "@/lib/stats";
import { StatCounter } from "@/components/landing/stat-counter";
import { Reveal } from "@/components/motion/reveal";

/**
 * Headline stats band. Server component that reads counts from getStats() (the
 * single Supabase seam) and hands each number to the client StatCounter for the
 * count-up animation.
 */
export async function Stats() {
  const stats = await getStats();

  const items = [
    { value: stats.users, suffix: "+", label: "Members signed up" },
    { value: stats.jobsScored, suffix: "+", label: "Jobs scored & deduplicated" },
    { value: stats.hunters, suffix: "+", label: "Hunters using their own keys" },
    { value: stats.countries, suffix: "", label: "Countries supported" },
  ];

  return (
    <section aria-label="OpenJobHunt by the numbers">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-y-8 gap-x-6 px-6 py-4 sm:grid-cols-4 sm:gap-10 sm:py-6 sm:divide-x sm:divide-border/60">
        {items.map((item, i) => (
          <Reveal key={item.label} delay={i * 0.08} className="text-center">
            <div className="text-4xl font-bold tracking-tight text-accent sm:text-5xl">
              <StatCounter value={item.value} suffix={item.suffix} />
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {item.label}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
