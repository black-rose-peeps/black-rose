-- Member → captain tournament registration requests.
-- Run in Supabase SQL Editor after deploying the app update.

create table if not exists public.tournament_registration_requests (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  roster_team_id uuid not null references public.teams (id) on delete cascade,
  requester_user_id uuid not null references public.members (id) on delete cascade,
  captain_user_id uuid not null references public.members (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'dismissed')),
  created_at timestamptz not null default now()
);

create unique index if not exists tournament_registration_requests_unique_pending
  on public.tournament_registration_requests (tournament_id, roster_team_id, requester_user_id)
  where status = 'pending';

create index if not exists tournament_registration_requests_captain_idx
  on public.tournament_registration_requests (captain_user_id, status, created_at desc);

alter table public.tournament_registration_requests enable row level security;

drop policy if exists "Allow all tournament registration requests" on public.tournament_registration_requests;

create policy "Allow all tournament registration requests"
  on public.tournament_registration_requests for all to anon, authenticated
  using (true)
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.tournament_registration_requests;
exception
  when duplicate_object then
    raise notice 'tournament_registration_requests already in supabase_realtime publication';
end $$;
