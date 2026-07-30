-- Add "Marvel Rivals" to game enums used by teams and tournaments.
-- Run in Supabase SQL Editor before deploying code that emits "Marvel Rivals".
-- The feature must not be enabled until this database enum update succeeds.

-- Teams: public.teams.game → team_game
do $$
begin
  if exists (select 1 from pg_type where typname = 'team_game' and typnamespace = 'public'::regnamespace) then
    execute 'alter type public.team_game add value if not exists ''Marvel Rivals''';
  end if;
end $$;

-- Tournaments: public.tournaments.game → tournament_game (skip if your DB
-- reuses team_game for tournaments — see diagnostic query at the bottom).
do $$
begin
  if exists (select 1 from pg_type where typname = 'tournament_game' and typnamespace = 'public'::regnamespace) then
    execute 'alter type public.tournament_game add value if not exists ''Marvel Rivals''';
  elsif exists (select 1 from pg_type where typname = 'team_game' and typnamespace = 'public'::regnamespace) then
    -- tournament_game absent; teams enum already extended above
    null;
  end if;
end $$;

-- Legacy: drop text CHECK constraints if an early schema used them instead of enums.
alter table public.teams drop constraint if exists teams_game_check;
alter table public.tournaments drop constraint if exists tournaments_game_check;
