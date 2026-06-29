import type { Metadata } from "next";
import Link from "next/link";
import { getKeyStatus } from "@/lib/keys";
import { getSetupStatus } from "@/lib/setup";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isEncryptionConfigured } from "@/lib/crypto";
import { KeysForm } from "@/app/dashboard/keys/keys-form";
import { SetupStepper } from "@/components/dashboard/setup-stepper";
import { StepNext } from "@/components/dashboard/step-next";

export const metadata: Metadata = {
  title: "API keys",
};

export default async function KeysPage() {
  const [status, setup] = await Promise.all([getKeyStatus(), getSetupStatus()]);
  const configured = isSupabaseConfigured && isEncryptionConfigured();

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
          Your API keys
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring your own Gemini + Apify keys. This is what keeps OpenJobHunt free.
          The work runs on your quota, encrypted and private.
        </p>
      </div>

      <SetupStepper current="keys" status={setup} />

      <KeysForm status={status} configured={configured} />

      <div className="mt-8 flex justify-end border-t border-border pt-6">
        <StepNext
          done={setup.keys}
          href="/dashboard/cv"
          label="Next: Upload CV"
          lockedHint="Save both your Gemini and Apify keys to continue."
        />
      </div>
    </div>
  );
}
