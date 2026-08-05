-- Backfill game_id columns from existing enum values
-- Run in Supabase SQL Editor AFTER add_game_id_columns.sql
-- This maps enum values to game rows and populates the new game_id columns

-- Backfill teams.game_id from team_game enum
update public.teams
set game_id = (
  select g.id 
  from public.games g 
  where g.name = teams.game::text
)
where game_id is null and game is not null;

-- Backfill tournaments.game_id from tournament_game enum
update public.tournaments
set game_id = (
  select g.id 
  from public.games g 
  where g.name = tournaments.game::text
)
where game_id is null and game is not null;

-- Verification queries (optional - comment out in production)
-- Check for any unmapped enum values
-- select game, count(*) 
-- from public.teams 
-- where game_id is null 
-- group by game;
--
-- select game, count(*) 
-- from public.tournaments 
-- where game_id is null 
-- group by game;

-- Check mapping success
-- select t.game, g.name as mapped_game, t.game_id
-- from public.teams t
-- left join public.games g on g.id = t.game_id
-- limit 10;
