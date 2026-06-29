-- Open feedback to the public landing page:
--  * allow anonymous (logged-out visitor) submissions, and
--  * allow a PUBLIC read of *featured* reviews for the landing testimonials.
-- Non-featured feedback stays private to its author. Featuring is curated by an
-- admin (service-role key / SQL editor) — visitors can't self-feature, so only
-- vetted "nice" reviews ever appear publicly.
--
-- Run in Supabase → SQL Editor, or `supabase db push` if using the CLI.

-- Anonymous submissions have no auth user, and we capture an optional display
-- name for the testimonial.
alter table public.feedback alter column user_id drop not null;
alter table public.feedback add column if not exists name text;
alter table public.feedback add column if not exists featured boolean not null default false;

create index if not exists feedback_featured_idx
  on public.feedback (featured, created_at desc);

-- Replace the author-only insert with a public one. `with check (featured = false)`
-- stops anyone inserting a row that's already marked featured.
drop policy if exists "feedback: insert own" on public.feedback;
drop policy if exists "feedback: public insert" on public.feedback;
create policy "feedback: public insert" on public.feedback
  for insert with check (featured = false);

-- Public read of featured reviews only (landing testimonials). Authors still see
-- their own rows via the existing "select own" policy — multiple SELECT policies
-- are OR'd together.
drop policy if exists "feedback: read featured" on public.feedback;
create policy "feedback: read featured" on public.feedback
  for select using (featured = true);
