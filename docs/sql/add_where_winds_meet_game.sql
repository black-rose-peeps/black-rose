-- Add "Where Winds Meet" to game enums used by teams and tournaments.
-- Run in Supabase SQL Editor after deploying the app update.
--
-- If you previously ran an older version of this script, only the ALTER TYPE
-- statements below are required (CHECK constraints are not used when columns
-- are enum-typed).

-- Teams: public.teams.game → team_game
alter type public.team_game add value if not exists 'Where Winds Meet';

-- Tournaments: public.tournaments.game → tournament_game (skip if your DB
-- reuses team_game for tournaments — see diagnostic query at the bottom).
do $$
begin
  if exists (select 1 from pg_type where typname = 'tournament_game' and typnamespace = 'public'::regnamespace) then
    execute 'alter type public.tournament_game add value if not exists ''Where Winds Meet''';
  elsif exists (select 1 from pg_type where typname = 'team_game' and typnamespace = 'public'::regnamespace) then
    -- tournament_game absent; teams enum already extended above
    null;
  end if;
end $$;

-- Legacy: drop text CHECK constraints if an early schema used them instead of enums.
alter table public.teams drop constraint if exists teams_game_check;
alter table public.tournaments drop constraint if exists tournaments_game_check;

-- Diagnostic (optional): list enum values and column types
-- select t.typname as enum_name, e.enumlabel as value
-- from pg_type t
-- join pg_enum e on e.enumtypid = t.oid
-- where t.typname in ('team_game', 'tournament_game')
-- order by t.typname, e.enumsortorder;
--
-- select table_name, column_name, udt_name
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('teams', 'tournaments')
--   and column_name = 'game';
