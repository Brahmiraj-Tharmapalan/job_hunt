"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type Variant = "primary" | "secondary";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-contrast shadow-sm hover:bg-accent-strong focus-visible:outline-accent",
  secondary:
    "bg-surface text-foreground border border-border hover:bg-surface-muted focus-visible:outline-accent",
};

/**
 * Tactile CTA. A thin Framer Motion client boundary so server components can
 * drop in an animated button without becoming client components themselves.
 */
export function CtaButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`inline-flex ${className}`}
    >
      <Link
        href={href}
        className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${styles[variant]}`}
      >
        {children}
      </Link>
    </motion.div>
  );
}
