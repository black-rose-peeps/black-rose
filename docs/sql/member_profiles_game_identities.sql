-- Per-game in-game identities (Valorant keeps valorant_game_name / valorant_tagline).
-- Run once in Supabase → SQL Editor.

alter table public.member_profiles
  add column if not exists game_identities jsonb not null default '{}'::jsonb;

comment on column public.member_profiles.game_identities is
  'Map of game title → in-game display string for non-Valorant titles (e.g. LoL Riot ID, WWM character name).';

-- Optional one-time backfill from legacy single-field column when present.
update public.member_profiles
set game_identities = jsonb_build_object(main_game, ingame_display_name)
where coalesce(game_identities, '{}'::jsonb) = '{}'::jsonb
  and ingame_display_name is not null
  and trim(ingame_display_name) <> ''
  and main_game is not null
  and trim(main_game) <> ''
  and lower(trim(main_game)) <> 'valorant';
