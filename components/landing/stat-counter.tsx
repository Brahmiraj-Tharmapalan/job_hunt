"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

/**
 * Animated odometer-style counter. Counts 0 → value when scrolled into view.
 * Renders the final value in the SSR/no-JS HTML, then animates on the client.
 * Static under prefers-reduced-motion.
 */
export function StatCounter({
  value,
  suffix = "",
  duration = 1.6,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;

    if (reduce) {
      node.textContent = fmt(value) + suffix;
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = fmt(Math.round(latest)) + suffix;
      },
    });
    return () => controls.stop();
  }, [inView, value, suffix, duration, reduce]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {fmt(value)}
      {suffix}
    </span>
  );
}
