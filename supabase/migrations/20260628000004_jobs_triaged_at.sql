-- When the user last triaged a job (saved ★ / applied / skipped). NULL means
-- untouched (still in the review queue). The shortlist orders the Saved,
-- Applied, and Skipped lists by this so they read in the order the user acted —
-- earliest first, most recent at the bottom — rather than by score.
alter table public.jobs
  add column if not exists triaged_at timestamptz;
