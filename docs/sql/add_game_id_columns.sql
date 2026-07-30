-- Add nullable game_id columns to teams and tournaments tables
-- Run in Supabase SQL Editor AFTER populate_games_from_constants.sql
-- This adds the new foreign key columns alongside existing enum columns for cutover

-- Add game_id column to teams table
alter table public.teams
  add column if not exists game_id uuid references public.games(id) on delete restrict;

-- Add game_id column to tournaments table
alter table public.tournaments
  add column if not exists game_id uuid references public.games(id) on delete restrict;

-- Create indexes for performance
create index if not exists teams_game_id_idx on public.teams(game_id);
create index if not exists tournaments_game_id_idx on public.tournaments(game_id);

-- Add comment to document the cutover process
comment on column public.teams.game_id is 'Foreign key to games table. Replaces the game enum column during migration.';
comment on column public.tournaments.game_id is 'Foreign key to games table. Replaces the game enum column during migration.';
