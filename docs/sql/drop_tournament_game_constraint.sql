-- Drop tournament game enum constraint to allow dynamic games
-- Run in Supabase SQL Editor

-- Drop check constraint if it exists (for text columns with CHECK constraints)
alter table public.tournaments drop constraint if exists tournaments_game_check;

-- If the column is an enum type, we need to change it to text
-- First check the current column type and change it to text
do $$
begin
  -- Check if tournaments.game is using an enum type
  if exists (
    select 1 
    from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'tournaments' 
      and column_name = 'game'
      and udt_name in ('tournament_game', 'team_game')
  ) then
    -- Change enum column to text to allow dynamic game values
    execute 'alter table public.tournaments alter column game type text using game::text';
  end if;
end $$;

-- Also do the same for teams.game
alter table public.teams drop constraint if exists teams_game_check;

do $$
begin
  -- Check if teams.game is using an enum type
  if exists (
    select 1 
    from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'teams' 
      and column_name = 'game'
      and udt_name in ('team_game', 'tournament_game')
  ) then
    -- Change enum column to text to allow dynamic game values
    execute 'alter table public.teams alter column game type text using game::text';
  end if;
end $$;

-- Verify the changes
-- select table_name, column_name, udt_name
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('teams', 'tournaments')
--   and column_name = 'game';
