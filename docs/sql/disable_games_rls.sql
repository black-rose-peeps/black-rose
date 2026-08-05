-- Disable RLS for games and game_roles tables temporarily to test
-- Run this in Supabase SQL Editor

-- Disable RLS entirely for games table
alter table public.games disable row level security;

-- Disable RLS entirely for game_roles table
alter table public.game_roles disable row level security;
