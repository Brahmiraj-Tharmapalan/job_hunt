import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign-in error",
  robots: { index: false },
};

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          We couldn&apos;t finish signing you in
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The sign-in link may have expired or already been used. Please try
          again.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
