-- OpenJobHunt: initial schema (Step 3)
-- Tables: profiles, user_keys, job_settings, jobs
-- + Row-Level Security on every table (scoped to auth.uid())
-- + on-signup trigger (creates profile + default job_settings)
-- + private CV storage bucket with folder-scoped policies
--
-- Safe to re-run: policies are dropped before being (re)created.
-- Run in Supabase → SQL Editor, or `supabase db push` if using the CLI.

-- =====================================================================
-- profiles
-- =====================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- Inserts are done by the signup trigger (security definer); no public insert.

-- =====================================================================
-- user_keys  (BYO API keys, encrypted with AES-256-GCM, added in Step 4)
-- *_enc/_iv/_tag hold the ciphertext; *_last4 is the masked UI hint only.
-- =====================================================================
create table if not exists public.user_keys (
  user_id        uuid primary key references auth.users on delete cascade,
  gemini_key_enc bytea,
  gemini_key_iv  bytea,
  gemini_key_tag bytea,
  gemini_last4   text,
  apify_key_enc  bytea,
  apify_key_iv   bytea,
  apify_key_tag  bytea,
  apify_last4    text,
  updated_at     timestamptz not null default now()
);

alter table public.user_keys enable row level security;

drop policy if exists "user_keys: all own" on public.user_keys;
create policy "user_keys: all own" on public.user_keys
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- job_settings  (one row per user; trigger seeds defaults on signup)
-- =====================================================================
create table if not exists public.job_settings (
  user_id           uuid primary key references auth.users on delete cascade,
  required_skills   text[] not null default '{"React","Next.js","TypeScript","Node.js","JavaScript"}',
  secondary_skills  text[] not null default '{}',
  countries         text[] not null default '{}',
  sources           text[] not null default '{}',
  experience_levels text[] not null default '{}',
  blocked_words     text[] not null default '{}',
  skip_rules        text[] not null default '{}',
  search_keywords   text[] not null default '{"Software Engineer","Full Stack Developer","Frontend Developer","React Developer","Next.js Developer"}',
  published_within_days int not null default 7  check (published_within_days between 1 and 30),
  max_items         int  not null default 200  check (max_items between 1 and 1000),
  cv_path           text,
  last_sync_at      timestamptz,
  updated_at        timestamptz not null default now()
);

alter table public.job_settings enable row level security;

drop policy if exists "job_settings: all own" on public.job_settings;
create policy "job_settings: all own" on public.job_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- jobs  (deduped per (user_id, external_id); status survives re-syncs)
-- =====================================================================
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  external_id text not null,
  title       text,
  company     text,
  location    text,
  country     text,
  url         text,
  apply_url   text,
  summary     text,
  description text,
  skill_match int,
  visa_signal text,
  status      text not null default 'new'
              check (status in ('new','shortlisted','applied','skipped')),
  skip_reason text,
  scored      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, external_id)
);

create index if not exists jobs_user_created_idx on public.jobs (user_id, created_at desc);
create index if not exists jobs_user_status_idx  on public.jobs (user_id, status);

alter table public.jobs enable row level security;

drop policy if exists "jobs: all own" on public.jobs;
create policy "jobs: all own" on public.jobs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- new-user trigger: seed profile + default job_settings
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;

  insert into public.job_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill rows for any users created before this trigger existed
-- (e.g. the account you just signed in with).
insert into public.profiles (id, email)
  select id, email from auth.users
  on conflict (id) do nothing;

insert into public.job_settings (user_id)
  select id from auth.users
  on conflict (user_id) do nothing;

-- =====================================================================
-- CV storage: private bucket, each user can only touch their own folder
-- (object path must start with "<auth.uid()>/...").
-- =====================================================================
insert into storage.buckets (id, name, public)
  values ('cvs', 'cvs', false)
  on conflict (id) do nothing;

drop policy if exists "cvs: read own" on storage.objects;
create policy "cvs: read own" on storage.objects
  for select using (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cvs: insert own" on storage.objects;
create policy "cvs: insert own" on storage.objects
  for insert with check (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cvs: update own" on storage.objects;
create policy "cvs: update own" on storage.objects
  for update using (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "cvs: delete own" on storage.objects;
create policy "cvs: delete own" on storage.objects
  for delete using (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );
