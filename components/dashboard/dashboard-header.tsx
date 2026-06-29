import Link from "next/link";
import { Brand } from "@/components/brand";
import { signOut } from "@/lib/actions/auth";

export function DashboardHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-[7.5%]">
        <Brand />
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/feedback"
            className="hidden rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-accent sm:inline"
          >
            Feedback
          </Link>
          {email && (
            <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:inline">
              {email}
            </span>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
