-- Tournament participation mode (team vs solo) and WWM competition style.
-- Run in Supabase SQL Editor after add_where_winds_meet_game.sql.

alter table public.tournaments
  add column if not exists participation_type text not null default 'team';

alter table public.tournaments
  add column if not exists wwm_mode text;

alter table public.tournaments
  drop constraint if exists tournaments_participation_type_check;

alter table public.tournaments
  add constraint tournaments_participation_type_check
  check (participation_type in ('team', 'solo'));

alter table public.tournaments
  drop constraint if exists tournaments_wwm_mode_check;

alter table public.tournaments
  add constraint tournaments_wwm_mode_check
  check (
    wwm_mode is null
    or wwm_mode in ('1v1_arena', 'group_strategy')
  );

-- Solo registrations link directly to a member instead of a roster team.
alter table public.tournament_registrations
  add column if not exists member_user_id uuid references public.members (id) on delete set null;

-- roster_team_id may already be nullable; ensure solo rows can omit it.
alter table public.tournament_registrations
  alter column roster_team_id drop not null;

create unique index if not exists tournament_registrations_tournament_member_uidx
  on public.tournament_registrations (tournament_id, member_user_id)
  where member_user_id is not null;

-- Backfill TFT events as solo if column was just added.
update public.tournaments
set participation_type = 'solo', wwm_mode = null
where game = 'Teamfight Tactics' and participation_type = 'team';
