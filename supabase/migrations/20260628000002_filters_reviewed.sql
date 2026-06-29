-- Setup-wizard completion signal for the "Tune your filters" step.
--
-- job_settings is seeded with defaults on signup, so we can't infer "the user
-- reviewed their filters" from the data alone. This explicit flag flips to true
-- the first time they save the settings form, which unlocks the next step.

alter table public.job_settings
  add column if not exists filters_reviewed boolean not null default false;
