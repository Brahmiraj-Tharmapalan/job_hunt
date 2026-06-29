import Link from "next/link";
import { Brand } from "@/components/brand";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#privacy", label: "Privacy" },
  { href: "/login", label: "Sign in" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Brand />
          <p className="max-w-sm text-sm text-muted-foreground">
            A free, privacy-first job-hunt dashboard. Your keys, your data. A
            portfolio project by{" "}
            <span className="text-foreground">OpenJobHunt</span>.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-border/70">
        <p className="mx-auto w-full max-w-6xl px-6 py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} OpenJobHunt. No spam, no auto-apply,
          no per-user cost.
        </p>
      </div>
    </footer>
  );
}
