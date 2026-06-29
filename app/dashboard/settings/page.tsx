import type { Metadata } from "next";
import Link from "next/link";
import { getJobSettings } from "@/lib/settings";
import { getSetupStatus } from "@/lib/setup";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SettingsForm } from "@/app/dashboard/settings/settings-form";
import type { SettingsInput } from "@/app/dashboard/settings/actions";
import { SetupStepper } from "@/components/dashboard/setup-stepper";

export const metadata: Metadata = {
  title: "Tune your filters",
};

export default async function SettingsPage() {
  const [settings, setup] = await Promise.all([
    getJobSettings(),
    getSetupStatus(),
  ]);

  const initial: SettingsInput = {
    required_skills: settings?.required_skills ?? [],
    secondary_skills: settings?.secondary_skills ?? [],
    countries: settings?.countries ?? [],
    min_experience_years: settings?.min_experience_years ?? null,
    max_experience_years: settings?.max_experience_years ?? null,
    search_keywords: settings?.search_keywords ?? [],
    blocked_words: settings?.blocked_words ?? [],
    published_within_days: settings?.published_within_days ?? 7,
    max_items: settings?.max_items ?? 200,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to dashboard
      </Link>

      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Tune your filters
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These came from your CV. Edit them however you like. Add or remove
          skills, set your countries and job titles, and choose how far back to
          search. Saved to your account.
        </p>
      </div>

      <SetupStepper current="filters" status={setup} />

      <SettingsForm
        initial={initial}
        configured={isSupabaseConfigured}
        filtersDone={setup.filters}
        skipSuggestions={settings?.skip_rules ?? []}
      />
    </div>
  );
}
