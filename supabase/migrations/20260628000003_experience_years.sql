-- Experience filter as a numeric years range.
--
-- The original `experience_levels text[]` label picker was replaced by an
-- explicit min/max years band so the (upcoming) Gemini scoring pass can compare
-- a job's required experience against a number rather than fuzzy labels. NULL on
-- either side means "no bound" (no minimum / no maximum). The old
-- `experience_levels` column is left in place but unused.
alter table public.job_settings
  add column if not exists min_experience_years int
    check (min_experience_years is null or min_experience_years between 0 and 60),
  add column if not exists max_experience_years int
    check (max_experience_years is null or max_experience_years between 0 and 60);
