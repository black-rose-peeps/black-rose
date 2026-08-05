-- Add icon field to games table
-- Run in Supabase SQL Editor

alter table public.games add column if not exists icon text;

-- Add comment
comment on column public.games.icon is 'Path to game icon image in public folder';
