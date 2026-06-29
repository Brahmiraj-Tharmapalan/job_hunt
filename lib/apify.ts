import "server-only";

/**
 * Low-level Apify transport. Job *sources* (which actor, how to map our filters
 * onto its input, how to read its rows) live in `lib/sources.ts`; this file only
 * knows how to run an actor and read its dataset, plus the account credit badge.
 *
 * We run actors ASYNC (start → poll → fetch dataset) rather than via the
 * run-sync-get-dataset-items endpoint, which Apify caps at 300s (docs) — a large
 * many-search-pair scrape easily exceeds that, while the run itself has no such
 * ceiling. Auth is always the user's own token via the Bearer header, never in
 * the URL.
 */

const API = "https://api.apify.com/v2";
const POLL_INTERVAL_MS = 4_000;
// Ceiling on how long we wait for one Apify run. The sort runs inline in a
// server action, so this must stay UNDER the host's serverless function limit
// (Vercel Pro caps at 300s) or the function dies mid-scrape. Default 240s leaves
// headroom for Gemini scoring + the DB write inside a 300s `maxDuration`. Raise
// it with APIFY_RUN_MAX_WAIT_MS on a host with a longer (or no) function limit.
const RUN_MAX_WAIT_MS = Number(process.env.APIFY_RUN_MAX_WAIT_MS) || 240_000;
const REQ_TIMEOUT_MS = 30_000; // per individual HTTP call

/** Normalized job shape the rest of the pipeline consumes (source-agnostic). */
export type ApifyJob = {
  external_id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  url: string;
  apply_url: string;
  description: string;
  /** When the job was posted, ISO timestamp; null if the source didn't give one. */
  posted_at: string | null;
};

/**
 * Run an actor to completion and return its dataset rows. `actor` is the API
 * path form "username~name". Throws on HTTP/timeout/abort so callers can decide
 * whether a given run is fatal or best-effort.
 */
export async function runActor(
  apiKey: string,
  actor: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const auth = { Authorization: `Bearer ${apiKey}` };

  // 1. Start the run (async — no 300s ceiling, unlike run-sync-get-dataset-items).
  const startRes = await fetch(`${API}/acts/${actor}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
  });
  if (!startRes.ok) {
    const detail = (await startRes.text().catch(() => "")).slice(0, 200);
    throw new Error(`Apify returned ${startRes.status}. ${detail}`);
  }
  const started = (await startRes.json()) as {
    data?: { id?: string; defaultDatasetId?: string };
  };
  const runId = started.data?.id;
  const datasetId = started.data?.defaultDatasetId;
  if (!runId || !datasetId) throw new Error("Apify didn't return a run id.");

  // 2. Poll until the run reaches a terminal state (or we hit the wait ceiling).
  const deadline = Date.now() + RUN_MAX_WAIT_MS;
  let status = "READY";
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const runRes = await fetch(`${API}/actor-runs/${runId}`, {
      headers: auth,
      signal: AbortSignal.timeout(REQ_TIMEOUT_MS),
    });
    if (!runRes.ok) continue; // transient — keep polling
    const body = (await runRes.json()) as { data?: { status?: string } };
    status = body.data?.status ?? status;
    if (status !== "READY" && status !== "RUNNING") break; // terminal
  }
  if (status === "READY" || status === "RUNNING") {
    throw new Error(
      `Apify run timed out after ${Math.round(RUN_MAX_WAIT_MS / 1000)}s.`,
    );
  }
  if (status !== "SUCCEEDED") throw new Error(`Apify run ended as ${status}.`);

  // 3. Read the dataset the run produced.
  const itemsRes = await fetch(
    `${API}/datasets/${datasetId}/items?clean=true&format=json`,
    { headers: auth, signal: AbortSignal.timeout(REQ_TIMEOUT_MS) },
  );
  if (!itemsRes.ok) {
    const detail = (await itemsRes.text().catch(() => "")).slice(0, 200);
    throw new Error(`Apify dataset fetch returned ${itemsRes.status}. ${detail}`);
  }
  return (await itemsRes.json()) as Record<string, unknown>[];
}

/** Map our look-back days to LinkedIn's fixed `r<seconds>` buckets (1/7/30 days). */
export function publishedAtParam(days: number): string {
  if (days <= 1) return "r86400";
  if (days <= 7) return "r604800";
  return "r2592000";
}

const RELATIVE_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  year: 31_536_000_000,
};

/**
 * Best-effort posting timestamp. Prefer an absolute ISO date; if that's
 * missing/unparseable, convert a relative "3 days ago" string into an
 * approximate timestamp so the UI can still show "~3 days ago".
 */
export function parsePostedAt(absolute?: string | null, relative?: string | null): string | null {
  if (absolute) {
    const t = Date.parse(absolute);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  const rel = relative?.toLowerCase();
  const m = rel?.match(/(\d+)\s*(minute|hour|day|week|month|year)/);
  if (m) {
    return new Date(Date.now() - Number(m[1]) * RELATIVE_MS[m[2]]).toISOString();
  }
  return null;
}

/**
 * Remaining slice of the monthly platform credit, for the dashboard badge. The
 * free plan ships ~$5/mo and syncs silently stop once it's spent, so surfacing
 * this turns an invisible wall into something the user can see coming.
 *
 * Best-effort: returns null on any error or unexpected shape so the UI just
 * hides the badge instead of breaking the page. Uses the same Bearer token.
 */
export type ApifyCredit = { usedUsd: number; limitUsd: number; remainingUsd: number };

export async function fetchApifyCredit(apiKey: string): Promise<ApifyCredit | null> {
  try {
    const res = await fetch("https://api.apify.com/v2/users/me/limits", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      data?: {
        limits?: { maxMonthlyUsageUsd?: number };
        current?: { monthlyUsageUsd?: number };
      };
    };
    const limitUsd = body.data?.limits?.maxMonthlyUsageUsd;
    const usedUsd = body.data?.current?.monthlyUsageUsd;
    if (typeof limitUsd !== "number" || typeof usedUsd !== "number") return null;

    return { usedUsd, limitUsd, remainingUsd: Math.max(0, limitUsd - usedUsd) };
  } catch {
    return null;
  }
}
