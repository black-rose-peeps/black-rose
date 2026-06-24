-- Dashboard count for registrations still awaiting review on active events.
-- Mirrors registrationNeedsReview(): Pending / Previously Competed on non-concluded tournaments.

create or replace function public.count_pending_registrations_needing_review()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.tournament_registrations tr
  inner join public.tournaments t on t.id = tr.tournament_id
  where tr.status in ('Pending', 'Previously Competed')
    and t.status not in ('Completed', 'Archived');
$$;

grant execute on function public.count_pending_registrations_needing_review() to anon, authenticated, service_role;
