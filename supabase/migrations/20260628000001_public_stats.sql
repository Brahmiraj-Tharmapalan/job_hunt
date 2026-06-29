-- Public landing-page stats.
--
-- The landing page is public (unauthenticated), but every table is locked down
-- with "own rows" RLS, so an anon client would count 0 rows. We expose ONLY
-- aggregate counts (never any row data) through a SECURITY DEFINER function that
-- runs with the owner's privileges and is granted to anon.
--
-- This is safe: callers can learn how many members/jobs exist, nothing more.

create or replace function public.get_public_stats()
returns table (
  users       bigint, -- registered members (one profile per user)
  hunters     bigint, -- members who have synced at least one job
  jobs_scored bigint  -- total jobs scored + deduplicated across everyone
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from profiles)::bigint,
    (select count(distinct user_id) from jobs)::bigint,
    (select count(*) from jobs)::bigint;
$$;

-- Lock down, then grant execute to the public roles. Only the aggregate output
-- is reachable; the underlying tables stay protected by RLS for normal queries.
revoke all on function public.get_public_stats() from public;
grant execute on function public.get_public_stats() to anon, authenticated;
