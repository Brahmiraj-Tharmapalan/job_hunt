-- When the job posting itself went live (from the scraper), so the shortlist
-- can show "posted 8 days ago". Distinct from created_at (when we captured it)
-- and triaged_at (when the user acted on it). NULL when the source omits a date.
alter table public.jobs
  add column if not exists posted_at timestamptz;
