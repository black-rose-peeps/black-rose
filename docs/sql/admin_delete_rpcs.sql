-- Atomic admin delete helpers (run in Supabase SQL editor).
-- Requires permissive RLS or security definer as below.

create or replace function public.delete_team_and_members(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from tournament_registrations where roster_team_id = p_team_id
  ) then
    raise exception 'Remove this team from all tournaments before deleting.';
  end if;

  delete from team_members where team_id = p_team_id;
  delete from teams where id = p_team_id;
end;
$$;

create or replace function public.delete_tournament_if_empty(p_tournament_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  if exists (
    select 1 from tournament_registrations where tournament_id = p_tournament_id
  ) then
    return false;
  end if;

  delete from tournaments where id = p_tournament_id;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

grant execute on function public.delete_team_and_members(uuid) to anon, authenticated;
grant execute on function public.delete_tournament_if_empty(uuid) to anon, authenticated;
