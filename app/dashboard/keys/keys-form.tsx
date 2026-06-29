"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  removeKey,
  saveKeys,
  type SaveKeysState,
} from "@/app/dashboard/keys/actions";
import type { KeyStatus } from "@/lib/keys";

const initial: SaveKeysState = {};

export function KeysForm({
  status,
  configured,
}: {
  status: KeyStatus;
  configured: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveKeys, initial);
  const [removing, startRemoving] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);

  function handleRemove(provider: "gemini" | "apify", label: string) {
    if (!confirm(`Remove your ${label}? You'll need to paste it again to use it.`)) {
      return;
    }
    setRemoveError(null);
    startRemoving(async () => {
      const res = await removeKey(provider);
      if (res.error) setRemoveError(res.error);
      else router.refresh();
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      {!configured && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          Server isn&apos;t fully configured yet. Set{" "}
          <code className="font-mono text-xs">ENCRYPTION_MASTER_KEY</code> (and
          Supabase env) in <code className="font-mono text-xs">.env.local</code>,
          then restart.
        </div>
      )}

      <ProviderField
        name="gemini"
        label="Google Gemini API key"
        placeholder="AIza..."
        status={status.gemini}
        helpHref="https://aistudio.google.com/apikey"
        helpLabel="Get a Gemini key (AI Studio)"
        blurb="Reads your CV and scores jobs. Free tier is plenty."
        onRemove={() => handleRemove("gemini", "Gemini API key")}
        removing={removing}
      />

      <ProviderField
        name="apify"
        label="Apify API token"
        placeholder="apify_api_..."
        status={status.apify}
        helpHref="https://console.apify.com/settings/integrations"
        helpLabel="Get an Apify token"
        blurb="Scrapes job listings (LinkedIn + feeds). Free tier works."
        onRemove={() => handleRemove("apify", "Apify token")}
        removing={removing}
      />

      {(state.error || removeError) && (
        <p className="text-sm text-accent">{state.error ?? removeError}</p>
      )}
      {state.ok && state.message && (
        <p className="text-sm text-success">{state.message}</p>
      )}

      <SubmitButton disabled={!configured} />

      <p className="text-xs leading-5 text-muted-foreground">
        Stored encrypted with AES-256-GCM. We only ever display the last 4
        characters, and your keys never reach the browser or our logs. Leave a
        field blank to keep the existing key.
      </p>
    </form>
  );
}

function ProviderField({
  name,
  label,
  placeholder,
  status,
  helpHref,
  helpLabel,
  blurb,
  onRemove,
  removing,
}: {
  name: string;
  label: string;
  placeholder: string;
  status: { set: boolean; last4: string | null };
  helpHref: string;
  helpLabel: string;
  blurb: string;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={name} className="text-sm font-semibold text-foreground">
          {label}
        </label>
        {status.set ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Connected, ••••{status.last4}
          </span>
        ) : (
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Not set
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>

      <input
        id={name}
        name={name}
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder={status.set ? "Enter a new key to replace" : placeholder}
        className="mt-3 h-11 w-full rounded-xl border border-border bg-background px-3.5 font-mono text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/40"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <a
          href={helpHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-accent hover:underline"
        >
          {helpLabel} →
        </a>
        {status.set && (
          <button
            type="button"
            onClick={onRemove}
            disabled={removing}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-accent disabled:opacity-60"
          >
            {removing ? "Removing..." : "Remove"}
          </button>
        )}
      </div>
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save keys"}
    </button>
  );
}
