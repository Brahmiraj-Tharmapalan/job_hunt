"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Status = "checking" | "ready" | "invalid" | "done";

export function ResetPasswordForm() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recovery link lands here only after /auth/callback has exchanged the
  // code for a session, so a valid session means the reset link was genuine.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "ready" : "invalid");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (error) {
      setError(error.message);
      return;
    }

    setStatus("done");
    // Give the success message a beat to read, then send them in.
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  if (status === "checking") {
    return <div className="h-48 animate-pulse rounded-xl bg-surface-muted" />;
  }

  if (status === "invalid") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-accent">
          This reset link is invalid or has expired.
        </p>
        <p className="text-muted-foreground">
          Reset links are single-use and time-limited. Request a fresh one from
          the sign-in page.
        </p>
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <p className="text-sm text-success">
        Password updated. Signing you in…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/40"
          placeholder="At least 8 characters"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/40"
          placeholder="Re-enter your password"
        />
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
