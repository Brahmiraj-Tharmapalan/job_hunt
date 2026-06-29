import Link from "next/link";
import { Brand } from "@/components/brand";
import { CtaButton } from "@/components/ui/cta-button";
import { MobileNav } from "@/components/mobile-nav";

const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#privacy", label: "Privacy" },
  { href: "#reviews", label: "Reviews" },
];

/** Sticky marketing header. Server component. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Brand />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            Sign in
          </Link>
          <CtaButton href="#get-started">Get started free</CtaButton>
        </div>

        {/* Mobile menu (nav + Sign in + CTA) */}
        <MobileNav items={NAV} />
      </div>
    </header>
  );
}
