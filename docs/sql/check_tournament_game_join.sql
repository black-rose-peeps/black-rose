-- Debug script to check tournament-game join
-- Run in Supabase SQL Editor to verify the join is working

-- Check if tournaments have game_id set
SELECT id, name, game, game_id FROM tournaments LIMIT 5;

-- Check if games table has header images
SELECT id, name, display_name, tournament_header_image, color_class, accent_class FROM games LIMIT 5;

-- Test the join that the service uses
SELECT 
  t.id, 
  t.name, 
  t.game, 
  t.game_id,
  g.tournament_header_image,
  g.color_class,
  g.accent_class
FROM tournaments t
LEFT JOIN games g ON t.game_id = g.id
LIMIT 5;

-- Check for tournaments with game_id but no matching game
SELECT t.id, t.name, t.game, t.game_id
FROM tournaments t
LEFT JOIN games g ON t.game_id = g.id
WHERE t.game_id IS NOT NULL AND g.id IS NULL;
