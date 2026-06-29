import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Stars } from "@/components/ui/stars";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = {
  title: "Feedback",
};

type Entry = { id: string; rating: number; comment: string | null; created_at: string };

export default async function FeedbackPage() {
  let past: Entry[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("feedback")
        .select("id, rating, comment, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      past = (data as Entry[] | null) ?? [];
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to dashboard
      </Link>

      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Send feedback
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rate your experience and tell us what to improve. We read every note.
        </p>
      </div>

      <FeedbackForm />

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your past feedback
          </h2>
          <ul className="mt-3 space-y-3">
            {past.map((e) => (
              <li
                key={e.id}
                className="rounded-2xl border border-border bg-surface-muted/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <Stars rating={e.rating} />
                  <time className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleDateString()}
                  </time>
                </div>
                {e.comment && (
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {e.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
