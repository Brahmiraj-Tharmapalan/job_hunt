"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CtaButton } from "@/components/ui/cta-button";

type NavItem = { href: string; label: string };

/**
 * Mobile navigation. Shows a hamburger below `md` and reveals an animated sheet
 * with the nav links, Sign in, and the primary CTA, so nothing is unreachable
 * on small screens. Hidden entirely on desktop, where the inline nav is shown.
 */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="grid h-10 w-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-surface-muted"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <motion.path
            d="M4 7h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            animate={open ? { d: "M6 6l12 12" } : { d: "M4 7h16" }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          />
          <motion.path
            d="M4 12h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            animate={open ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
          />
          <motion.path
            d="M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            animate={open ? { d: "M6 18l12 -12" } : { d: "M4 17h16" }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-x-0 bottom-0 top-16 z-40 bg-foreground/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              id="mobile-menu"
              className="fixed inset-x-0 top-16 z-50 border-b border-border bg-background px-6 pb-6 pt-2 shadow-lg"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <nav className="flex flex-col" aria-label="Mobile">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-border/60 py-3.5 text-base font-medium text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold text-foreground"
                >
                  Sign in
                </Link>
                <div onClick={() => setOpen(false)}>
                  <CtaButton href="#get-started" className="w-full">
                    Get started free
                  </CtaButton>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
