-- Add tournament_header_image column to games table
-- Run in Supabase SQL Editor

-- Add the column
alter table public.games add column if not exists tournament_header_image text;

-- Add comment
comment on column public.games.tournament_header_image is 'URL to the tournament header image for this game';
