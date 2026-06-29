-- App/product feedback: a star rating (1-5) plus an optional comment, one row
-- per submission. Users can read and write only their own rows; aggregate review
-- across all users is done with the service-role key (bypasses RLS) by an admin.
--
-- Run in Supabase → SQL Editor, or `supabase db push` if using the CLI.

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  rating     int  not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_created_idx
  on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "feedback: select own" on public.feedback;
create policy "feedback: select own" on public.feedback
  for select using (user_id = auth.uid());

drop policy if exists "feedback: insert own" on public.feedback;
create policy "feedback: insert own" on public.feedback
  for insert with check (user_id = auth.uid());

drop policy if exists "feedback: delete own" on public.feedback;
create policy "feedback: delete own" on public.feedback
  for delete using (user_id = auth.uid());
