import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ResetPasswordForm } from "@/app/reset-password/reset-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your account.",
};

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Brand />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Set a new password
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a strong password you don&apos;t use anywhere else.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <Suspense fallback={<div className="h-48" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
