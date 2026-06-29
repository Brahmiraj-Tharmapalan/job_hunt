-- Allow users to delete their own job rows.
--
-- The initial schema (20260627000001) intended a single "for all" policy on
-- public.jobs covering every command including DELETE. On the live database that
-- coverage is missing, so DELETE silently affected zero rows (RLS returns success
-- with nothing deleted) — the in-app "Clear list" and any account cleanup quietly
-- did nothing. This adds an explicit, idempotent DELETE policy scoped to the owner.
drop policy if exists "jobs: delete own" on public.jobs;
create policy "jobs: delete own" on public.jobs
  for delete using (user_id = auth.uid());
