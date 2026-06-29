import type { Metadata } from "next";
import Link from "next/link";
import { getJobSettings } from "@/lib/settings";
import { getKeyStatus } from "@/lib/keys";
import { getSetupStatus } from "@/lib/setup";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isEncryptionConfigured } from "@/lib/crypto";
import { CvUpload } from "@/app/dashboard/cv/cv-upload";
import { SetupStepper } from "@/components/dashboard/setup-stepper";
import { StepNext } from "@/components/dashboard/step-next";

export const metadata: Metadata = {
  title: "Upload CV",
};

export default async function CvPage() {
  const [settings, keys, setup] = await Promise.all([
    getJobSettings(),
    getKeyStatus(),
    getSetupStatus(),
  ]);
  const geminiReady =
    isSupabaseConfigured && isEncryptionConfigured() && keys.gemini.set;

  const initial = {
    required_skills: settings?.required_skills ?? [],
    secondary_skills: settings?.secondary_skills ?? [],
    countries: settings?.countries ?? [],
  };

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to dashboard
      </Link>

      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Upload your CV
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gemini reads your PDF and extracts your skills and target countries,
          then prefills your search. Your CV stays in a private bucket only you
          can access.
        </p>
      </div>

      <SetupStepper current="cv" status={setup} />

      <CvUpload
        initial={initial}
        hasCv={Boolean(settings?.cv_path)}
        geminiReady={geminiReady}
      />

      <div className="mt-8 flex justify-end border-t border-border pt-6">
        <StepNext
          done={setup.cv}
          href="/dashboard/settings"
          label="Next: Tune filters"
          lockedHint="Upload and parse your CV to continue."
        />
      </div>
    </div>
  );
}
