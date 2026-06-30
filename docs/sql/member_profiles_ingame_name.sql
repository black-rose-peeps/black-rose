-- Generic in-game display name for non-Valorant main games (LoL, TFT, Where Winds Meet).
-- Run once in Supabase → SQL Editor.

alter table public.member_profiles
  add column if not exists ingame_display_name text;

comment on column public.member_profiles.ingame_display_name is
  'Single-field in-game identity when main_game is not Valorant.';
