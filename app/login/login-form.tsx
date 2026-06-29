"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "forgot";

/** Only allow same-origin relative redirects to avoid open-redirect abuse. */
function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : undefined;

  // The sliding pill only tracks the two real tabs; "forgot" is a sub-state of
  // signing in, so it keeps the Sign-in tab highlighted.
  const activeTab: "signin" | "signup" = mode === "signup" ? "signup" : "signin";

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    const supabase = createClient();

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`
              : undefined,
        });
        if (error) throw error;
        // Always show a generic confirmation regardless of whether the email
        // exists, to avoid leaking which addresses are registered.
        setNotice(
          "If an account exists for that email, a password reset link is on its way. Check your inbox.",
        );
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;

        // Supabase hides "email already registered" behind a fake success to
        // prevent email enumeration: it returns a user with an EMPTY identities
        // array, no session, and sends no confirmation email. Detect that and
        // send the user to sign in (the existing account may be Google-only, so
        // hint at that) instead of telling them to check an inbox that will
        // never receive anything.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setMode("signin");
          setError(
            "That email is already registered. Sign in below — if you first signed up with Google, use “Continue with Google”.",
          );
        } else if (data.user && !data.session) {
          // Genuinely new account; email confirmation is required.
          setNotice("Check your inbox to confirm your email, then sign in.");
        } else {
          router.push(next);
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setPending(false);
    }
    // On success the browser is redirected to Google.
  }

  return (
    <div className="w-full">
      {!configured && (
        <div className="mb-5 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          Supabase isn&apos;t configured yet. Add{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          to <code className="font-mono text-xs">.env.local</code>, then restart.
        </div>
      )}

      {/* Mode toggle */}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            className="relative isolate rounded-lg py-2 text-sm font-semibold text-muted-foreground transition-colors data-[active=true]:text-accent-contrast"
            data-active={activeTab === m}
          >
            {activeTab === m && (
              <motion.span
                layoutId="login-tab"
                className="absolute inset-0 rounded-lg bg-accent"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">
              {m === "signin" ? "Sign in" : "Sign up"}
            </span>
          </button>
        ))}
      </div>

      {mode !== "forgot" && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={pending || !configured}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={handleEmailSubmit} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/40"
            placeholder="you@example.com"
          />
        </div>
        {mode !== "forgot" && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError(null);
                    setNotice(null);
                  }}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/40"
              placeholder={
                mode === "signup" ? "At least 8 characters" : "••••••••"
              }
            />
          </div>
        )}

        {mode === "forgot" && (
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your
            password.
          </p>
        )}

        {error && <p className="text-sm text-accent">{error}</p>}
        {notice && <p className="text-sm text-success">{notice}</p>}

        <button
          type="submit"
          disabled={pending || !configured}
          className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {pending
            ? "Please wait..."
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"}
        </button>

        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setNotice(null);
            }}
            className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to sign in
          </button>
        )}
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
