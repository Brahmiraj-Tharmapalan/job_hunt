"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

/**
 * The hero "AI-generated" scene: layered vector art + glass product cards so
 * each depth can move at its own rate. Parallax is driven by Framer Motion:
 *   - useScroll() gives a scrollY MotionValue (depth-on-scroll)
 *   - a pointer MotionValue (smoothed with useSpring) gives depth-on-mouse
 * Both feed useTransform, so motion runs on the compositor and the React tree
 * never re-renders while scrolling. Fully static under prefers-reduced-motion.
 *
 * Swap in a raster AI image later by dropping <Image fill /> into any layer.
 */
export function ParallaxHero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();

  // Pointer position, normalised to ~[-1, 1] from the viewport centre.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 60, damping: 18, mass: 0.6 });
  const springY = useSpring(pointerY, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (event: PointerEvent) => {
      pointerX.set((event.clientX / window.innerWidth - 0.5) * 2);
      pointerY.set((event.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, pointerX, pointerY]);

  // Three depth layers. `f` = scroll factor, `p` = pointer travel in px.
  const layer0 = useLayer(scrollY, springX, springY, reduce ? 0 : 0.04, reduce ? 0 : 14);
  const layer1 = useLayer(scrollY, springX, springY, reduce ? 0 : 0.1, reduce ? 0 : 26);
  const layer2 = useLayer(scrollY, springX, springY, reduce ? 0 : 0.16, reduce ? 0 : 42);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Depth 0: soft gradient orbs (slowest). */}
      <motion.div className="absolute inset-0" style={layer0}>
        <div className="absolute -left-24 top-8 h-[26rem] w-[26rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute right-[-6rem] top-28 h-[22rem] w-[22rem] rounded-full bg-blush-strong/40 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-[20rem] w-[20rem] rounded-full bg-accent/10 blur-3xl" />
      </motion.div>

      {/* Depth 1: constellation grid + sync radar. */}
      <motion.div className="absolute inset-0" style={layer1}>
        <Constellation />
      </motion.div>

      {/* Depth 2: floating glass product cards (fastest, most pointer-reactive).
          Hidden on mobile, where they'd collide with the headline. */}
      <motion.div className="absolute inset-0 hidden md:block" style={layer2}>
        <JobCard
          className="left-[5%] top-[18%] w-60 rotate-[-4deg]"
          index={0}
          score={94}
          title="Senior Frontend Engineer"
          company="Northwind, Remote (EU)"
          tags={["React", "Next.js", "TypeScript"]}
          tone="accent"
        />
        <JobCard
          className="right-[6%] top-[10%] w-56 rotate-[5deg]"
          index={1}
          score={88}
          title="Full-Stack Developer"
          company="Lumen Labs, Berlin"
          tags={["Node.js", "Postgres"]}
          tone="muted"
        />
        <JobCard
          className="right-[8%] bottom-[30%] w-52 rotate-[-3deg]"
          index={2}
          score={71}
          title="Platform Engineer"
          company="Vela, Hybrid"
          tags={["TypeScript", "AWS"]}
          tone="muted"
        />
      </motion.div>
    </div>
  );
}

/** Blend a scroll MotionValue with a pointer MotionValue into x/y transforms. */
function useLayer(
  scrollY: MotionValue<number>,
  springX: MotionValue<number>,
  springY: MotionValue<number>,
  scrollFactor: number,
  pointerPx: number,
) {
  const x = useTransform(springX, (v) => v * pointerPx);
  const y = useTransform(
    [scrollY, springY] as [MotionValue<number>, MotionValue<number>],
    ([s, py]: number[]) => s * scrollFactor + py * pointerPx,
  );
  return { x, y };
}

function Constellation() {
  return (
    <svg
      className="absolute inset-0 h-full w-full text-accent"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <radialGradient id="ojh-radar" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="70%" stopColor="currentColor" stopOpacity="0.05" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sync "radar": the product's heartbeat. */}
      <g transform="translate(600 300)">
        <circle r="240" fill="url(#ojh-radar)" />
        {[120, 200, 280].map((r, i) => (
          <motion.circle
            key={r}
            r={r}
            stroke="currentColor"
            strokeOpacity={0.1}
            initial={{ scale: 0.85, opacity: 0.4 }}
            animate={{ scale: [0.85, 1.3], opacity: [0.4, 0] }}
            transition={{
              duration: 5,
              delay: i * 1.4,
              repeat: Infinity,
              ease: "easeOut",
            }}
            style={{ transformOrigin: "center" }}
          />
        ))}
      </g>
    </svg>
  );
}

function JobCard({
  className,
  score,
  title,
  company,
  tags,
  tone,
  index,
}: {
  className?: string;
  score: number;
  title: string;
  company: string;
  tags: string[];
  tone: "accent" | "muted";
  index: number;
}) {
  return (
    <motion.div
      className={`absolute rounded-2xl border border-border bg-surface/85 p-4 shadow-xl shadow-accent/5 backdrop-blur-md ${className ?? ""}`}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: [0, -9, 0],
        scale: 1,
      }}
      transition={{
        opacity: { duration: 0.6, delay: 0.2 + index * 0.15 },
        scale: { duration: 0.6, delay: 0.2 + index * 0.15 },
        y: {
          duration: 6,
          delay: 0.8 + index * 0.8,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {title}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {company}
          </p>
        </div>
        <div
          className={`flex shrink-0 flex-col items-center rounded-lg px-2 py-1 ${
            tone === "accent"
              ? "bg-accent text-accent-contrast"
              : "bg-blush text-accent"
          }`}
        >
          <span className="font-mono text-base font-bold leading-none">
            {score}
          </span>
          <span className="text-[9px] uppercase tracking-wide opacity-80">
            match
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
