-- Backfill game header images from existing assets
-- Run in Supabase SQL Editor after manually uploading the images to the storage bucket

-- Instructions:
-- 1. First, run disable_game_headers_rls.sql to fix RLS issues
-- 2. Manually upload the following images to the game-headers bucket:
--    - For League of Legends: Upload lol-tournament-header.jpg from src/assets as {game_id}/header.jpg
--    - For Teamfight Tactics: Upload tft-tournament-header.jpg from src/assets as {game_id}/header.jpg
--    - For Valorant: Upload valorant-tournament-header.jpg from src/assets as {game_id}/header.jpg
--    - For Where Winds Meet: Upload wwm-tournament-header.jpg from src/assets as {game_id}/header.jpg
--    - For Palworld: Upload palworld-banner.png from public as {game_id}/header.jpg
--    - For Marvel Rivals: Upload marvel-rivals.png from public as {game_id}/header.jpg
-- 3. Get the game IDs by running: SELECT id, name, display_name FROM games;
-- 4. Replace {game_id} in the paths with the actual game IDs
-- 5. Run the UPDATE statements below with the actual game IDs

-- After uploading, update the games table with the image URLs
-- Replace the UUIDs below with the actual game IDs from your database

-- League of Legends
update public.games 
set tournament_header_image = 'https://xjwugbbrqpwnenmlrkdh.supabase.co/storage/v1/object/game-headers/{league_of_legends_game_id}/header.jpg?v=' || extract(epoch from now())
where name = 'League of Legends';

-- Teamfight Tactics  
update public.games 
set tournament_header_image = 'https://xjwugbbrqpwnenmlrkdh.supabase.co/storage/v1/object/game-headers/{tft_game_id}/header.jpg?v=' || extract(epoch from now())
where name = 'Teamfight Tactics';

-- Valorant
update public.games 
set tournament_header_image = 'https://xjwugbbrqpwnenmlrkdh.supabase.co/storage/v1/object/game-headers/{valorant_game_id}/header.jpg?v=' || extract(epoch from now())
where name = 'Valorant';

-- Where Winds Meet
update public.games 
set tournament_header_image = 'https://xjwugbbrqpwnenmlrkdh.supabase.co/storage/v1/object/game-headers/{wwm_game_id}/header.jpg?v=' || extract(epoch from now())
where name = 'Where Winds Meet';

-- Palworld
update public.games 
set tournament_header_image = 'https://xjwugbbrqpwnenmlrkdh.supabase.co/storage/v1/object/game-headers/{palworld_game_id}/header.png?v=' || extract(epoch from now())
where name = 'Palworld';

-- Marvel Rivals
update public.games 
set tournament_header_image = 'https://xjwugbbrqpwnenmlrkdh.supabase.co/storage/v1/object/game-headers/{marvel_rivals_game_id}/header.png?v=' || extract(epoch from now())
where name = 'Marvel Rivals';
