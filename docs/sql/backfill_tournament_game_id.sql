-- Backfill game_id for existing tournaments based on game name
-- Run in Supabase SQL Editor to fix tournaments that don't have game_id set

-- Update tournaments with game_id based on game name matching games.display_name
UPDATE tournaments t
SET game_id = g.id
FROM games g
WHERE t.game = g.display_name
AND t.game_id IS NULL;

-- Check results
SELECT 
  t.id, 
  t.name, 
  t.game, 
  t.game_id,
  g.display_name as matched_game,
  g.tournament_header_image,
  g.color_class,
  g.accent_class
FROM tournaments t
LEFT JOIN games g ON t.game_id = g.id
ORDER BY t.created_at DESC
LIMIT 10;
