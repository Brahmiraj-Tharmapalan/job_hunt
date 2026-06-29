"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseCvAndPrefill } from "@/app/dashboard/cv/actions";
import type { CvExtraction } from "@/lib/gemini";

type Status = "idle" | "uploading" | "uploaded" | "parsing" | "done" | "error";

export function CvUpload({
  initial,
  hasCv,
  geminiReady,
}: {
  initial: CvExtraction;
  hasCv: boolean;
  geminiReady: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CvExtraction>(initial);
  const [fileName, setFileName] = useState<string | null>(null);
  // True once a CV exists in storage (already had one, or just uploaded).
  const [uploaded, setUploaded] = useState(hasCv);

  async function handleFile(file: File) {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("That PDF is over 15 MB. Please upload a smaller file.");
      return;
    }

    setFileName(file.name);
    setStatus("uploading");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("error");
      setError("You're not signed in.");
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from("cvs")
      .upload(`${user.id}/cv.pdf`, file, {
        upsert: true,
        contentType: "application/pdf",
      });
    if (uploadError) {
      setStatus("error");
      setError(uploadError.message);
      return;
    }

    // Upload and parse are separate steps; the user clicks Parse next.
    setUploaded(true);
    setStatus("uploaded");
  }

  /** Re-run parsing on the already-uploaded CV (e.g. after a quota error). */
  async function runParse() {
    setError(null);
    setStatus("parsing");
    const res = await parseCvAndPrefill();
    if (res.error || !res.data) {
      setStatus("error");
      setError(res.error ?? "Parsing failed.");
      return;
    }
    setResult(res.data);
    setStatus("done");
    router.refresh();
  }

  const busy = status === "uploading" || status === "parsing";
  const hasResults =
    result.required_skills.length > 0 ||
    result.secondary_skills.length > 0 ||
    result.countries.length > 0;
  // Only surface skills once they actually come from a CV, not the seeded
  // defaults shown before the first upload.
  const showResults = (hasCv || status === "done") && hasResults;

  return (
    <div className="space-y-6">
      {!geminiReady && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          Add your Gemini key first so we can read your CV.{" "}
          <Link href="/dashboard/keys" className="font-semibold underline">
            Add keys →
          </Link>
        </div>
      )}

      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface px-6 py-10 text-center transition-colors hover:border-accent/50 hover:bg-surface-muted/50 ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={busy || !geminiReady}
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Clear the value so re-selecting the SAME file fires onChange again.
            e.target.value = "";
            if (file) handleFile(file);
          }}
        />
        <UploadIcon />
        <p className="text-sm font-semibold text-foreground">
          {hasCv ? "Replace your CV" : "Upload your CV (PDF)"}
        </p>
        <p className="text-xs text-muted-foreground">
          {fileName ?? "Click to choose a file (max 15 MB)"}
        </p>
      </label>

      {status === "uploading" && (
        <p className="text-sm text-muted-foreground">Uploading...</p>
      )}
      {status === "uploaded" && (
        <p className="text-sm text-success">
          CV uploaded. Now parse it to extract your skills and countries.
        </p>
      )}
      {status === "parsing" && (
        <p className="text-sm text-accent">
          Reading your CV with Gemini. This takes a few seconds...
        </p>
      )}
      {status === "done" && (
        <p className="text-sm text-success">
          Done. Saved to your settings. You can fine-tune these next.
        </p>
      )}
      {error && <p className="text-sm text-accent">{error}</p>}

      {/* Parse / re-parse: available whenever a CV exists in storage. */}
      {uploaded && status !== "parsing" && (
        <button
          type="button"
          onClick={runParse}
          disabled={!geminiReady}
          className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60"
        >
          {status === "done"
            ? "Re-parse CV"
            : status === "error"
              ? "Try parsing again"
              : "Parse CV with Gemini"}
        </button>
      )}

      {showResults && (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium text-muted-foreground">
            Extracted from your CV, saved to your settings
          </p>
          <ChipRow label="Primary skills" items={result.required_skills} tone="accent" />
          <ChipRow label="Secondary skills" items={result.secondary_skills} tone="muted" />
          <ChipRow label="Countries" items={result.countries} tone="muted" />
        </div>
      )}
    </div>
  );
}

function ChipRow({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "accent" | "muted";
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None detected</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                tone === "accent"
                  ? "bg-accent text-accent-contrast"
                  : "bg-blush text-accent"
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
      aria-hidden="true"
    >
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}
