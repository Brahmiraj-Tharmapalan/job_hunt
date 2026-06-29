import "server-only";
import { getKeyStatus } from "@/lib/keys";
import { getJobSettings } from "@/lib/settings";

/** Per-step completion for the setup wizard. `sync` ships later (Step 4). */
export type SetupStatus = {
  keys: boolean;
  cv: boolean;
  filters: boolean;
};

/**
 * Single source of truth for "which setup steps are done", used by the stepper,
 * the per-step Next buttons, and the dashboard checklist so they never disagree.
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  const [keys, settings] = await Promise.all([getKeyStatus(), getJobSettings()]);
  return {
    keys: keys.gemini.set && keys.apify.set,
    cv: Boolean(settings?.cv_path),
    filters: Boolean(settings?.filters_reviewed),
  };
}
