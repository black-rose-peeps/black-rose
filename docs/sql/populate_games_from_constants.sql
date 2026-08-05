-- Populate games and game_roles tables from current hardcoded constants
-- Run in Supabase SQL Editor AFTER create_games_tables.sql
-- This migrates the current game definitions to the new dynamic system

-- Insert games from current constants
-- Data sourced from:
-- - src/features/member/constants/index.ts (PROFILE_GAME_OPTIONS)
-- - src/features/teams/constants/index.ts (GAME_OPTIONS, GAME_COLOR, GAME_ACCENT)
-- - src/features/member/utils/game-identity.ts (GAME_IDENTITY_CONFIG)

-- Clear existing data (safe to re-run)
truncate table public.game_roles cascade;
truncate table public.games cascade;

-- Insert Riot games (shared identity group)
insert into public.games (name, slug, display_name, identity_group, identity_field_label, identity_field_placeholder, identity_helper_text, accent_class, is_active, sort_order) values
('Valorant', 'valorant', 'Valorant', 'riot', 'Riot ID', '', 'Used on Valorant team rosters and tournament brackets — even when Valorant is not your profile main game.', 'from-red-500/20 via-red-500/5 to-transparent', true, 1),
('League of Legends', 'league-of-legends', 'League of Legends', 'riot', 'Riot ID', 'SummonerName#TAG', 'Uses your shared Riot ID — the same name and tagline as Valorant and TFT.', 'from-blue-500/20 via-blue-500/5 to-transparent', true, 2),
('Teamfight Tactics', 'teamfight-tactics', 'Teamfight Tactics', 'riot', 'Riot ID', 'PlayerName#TAG', 'Uses your shared Riot ID — the same name and tagline as Valorant and League.', 'from-violet-500/20 via-violet-500/5 to-transparent', true, 3);

-- Insert individual games
insert into public.games (name, slug, display_name, identity_group, identity_field_label, identity_field_placeholder, identity_helper_text, accent_class, is_active, sort_order) values
('Where Winds Meet', 'where-winds-meet', 'Where Winds Meet', null, 'Character Name', 'Your in-game character name', 'Used on Where Winds Meet rosters and events for that title.', 'from-cyan-500/20 via-cyan-500/5 to-transparent', true, 4),
('Palworld', 'palworld', 'Palworld', null, 'In-Game Name', 'Your Palworld character name', 'Used to identify you on Black Rose Palworld servers. Enter the name your guild and server members know you by.', 'from-emerald-500/20 via-emerald-500/5 to-transparent', true, 5),
('Marvel Rivals', 'marvel-rivals', 'Marvel Rivals', null, 'Player Name', 'Your Marvel Rivals in-game name', 'Used on Marvel Rivals team rosters and tournament brackets — enter the name shown in-game.', 'from-rose-500/20 via-rose-500/5 to-transparent', true, 6);

-- Insert Multi-game option (for teams only, not profiles)
insert into public.games (name, slug, display_name, identity_group, identity_field_label, identity_field_placeholder, identity_helper_text, accent_class, is_active, sort_order) values
('Multi', 'multi', 'Multi-game', null, 'In-Game ID', '', '', 'from-white/10 via-white/5 to-transparent', true, 7);

-- Insert game roles from current constants
-- Data sourced from src/features/teams/constants/index.ts

-- Valorant roles
do $$
declare
  valorant_id uuid;
begin
  select id into valorant_id from public.games where slug = 'valorant';
  insert into public.game_roles (game_id, role_name) values
    (valorant_id, 'IGL'),
    (valorant_id, 'Duelist'),
    (valorant_id, 'Controller'),
    (valorant_id, 'Initiator'),
    (valorant_id, 'Sentinel'),
    (valorant_id, 'Flex'),
    (valorant_id, 'Sub'),
    (valorant_id, 'TBD');
end $$;

-- League of Legends roles
do $$
declare
  lol_id uuid;
begin
  select id into lol_id from public.games where slug = 'league-of-legends';
  insert into public.game_roles (game_id, role_name) values
    (lol_id, 'Top'),
    (lol_id, 'Jungle'),
    (lol_id, 'Mid'),
    (lol_id, 'ADC'),
    (lol_id, 'Support'),
    (lol_id, 'IGL'),
    (lol_id, 'Flex'),
    (lol_id, 'Sub'),
    (lol_id, 'TBD');
end $$;

-- Marvel Rivals roles
do $$
declare
  mr_id uuid;
begin
  select id into mr_id from public.games where slug = 'marvel-rivals';
  insert into public.game_roles (game_id, role_name) values
    (mr_id, 'Vanguard'),
    (mr_id, 'Duelist'),
    (mr_id, 'Strategist'),
    (mr_id, 'Flex'),
    (mr_id, 'Sub'),
    (mr_id, 'TBD');
end $$;

-- Teamfight Tactics roles
do $$
declare
  tft_id uuid;
begin
  select id into tft_id from public.games where slug = 'teamfight-tactics';
  insert into public.game_roles (game_id, role_name) values
    (tft_id, 'Flex'),
    (tft_id, 'IGL'),
    (tft_id, 'Sub'),
    (tft_id, 'TBD');
end $$;

-- Where Winds Meet roles
do $$
declare
  wwm_id uuid;
begin
  select id into wwm_id from public.games where slug = 'where-winds-meet';
  insert into public.game_roles (game_id, role_name) values
    (wwm_id, 'DPS'),
    (wwm_id, 'Tank'),
    (wwm_id, 'Healer'),
    (wwm_id, 'Support'),
    (wwm_id, 'Flex'),
    (wwm_id, 'Sub'),
    (wwm_id, 'TBD');
end $$;

-- Palworld roles
do $$
declare
  palworld_id uuid;
begin
  select id into palworld_id from public.games where slug = 'palworld';
  insert into public.game_roles (game_id, role_name) values
    (palworld_id, 'DPS'),
    (palworld_id, 'Tank'),
    (palworld_id, 'Support'),
    (palworld_id, 'Flex'),
    (palworld_id, 'Sub'),
    (palworld_id, 'TBD');
end $$;

-- Multi-game roles (generic)
do $$
declare
  multi_id uuid;
begin
  select id into multi_id from public.games where slug = 'multi';
  insert into public.game_roles (game_id, role_name) values
    (multi_id, 'IGL'),
    (multi_id, 'Flex'),
    (multi_id, 'Sub'),
    (multi_id, 'TBD');
end $$;

-- Verification query (optional - comment out in production)
-- select g.name, g.slug, g.identity_group, g.color_class, 
--        count(gr.id) as role_count
-- from public.games g
-- left join public.game_roles gr on gr.game_id = g.id
-- group by g.id
-- order by g.sort_order;
