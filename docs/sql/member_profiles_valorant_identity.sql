-- Add manual Valorant IGN + tagline to member profiles (run in Supabase SQL Editor)

alter table public.member_profiles
  add column if not exists valorant_game_name text,
  add column if not exists valorant_tagline text;
