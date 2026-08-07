# Games Management Feature - Production Deployment Guide

This guide provides the complete SQL run order for deploying the games management feature to production.

## Overview

The games management feature introduces dynamic games and roles, replacing hardcoded enum values with database-driven configuration. This requires running several SQL migrations in a specific order.

## Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Review all SQL files in a staging environment first
- [ ] Ensure Supabase Storage buckets are ready for manual uploads
- [ ] Test dynamic roles functionality after deployment

## SQL Run Order

Run these SQL files in Supabase SQL Editor in the following order:

### Step 1: Core Games Tables and Data (6 files)

1. **create_games_tables.sql**
   - Creates `games` and `game_roles` tables with RLS policies
   - Sets up the foundation for dynamic games management

2. **populate_games_from_constants.sql** (use latest version)
   - Populates games and roles from existing constants
   - Includes Marvel Rivals, Where Winds Meet, and other games
   - Modified in commits b5270ca and 8c30b75

3. **add_game_id_columns.sql**
   - Adds `game_id` foreign key columns to `teams` and `tournaments` tables
   - Enables relationship between teams/tournaments and games

4. **drop_tournament_game_constraint.sql**
   - Changes enum columns to text for flexibility
   - Allows dynamic game names instead of hardcoded enum values

5. **backfill_game_id_from_enum.sql**
   - Maps existing enum values to new game IDs
   - Preserves existing data during migration

6. **backfill_tournament_game_id.sql**
   - Additional tournament game_id backfill
   - Ensures all tournament records have proper game references

### Step 2: Game Icons (2 files)

7. **add_icon_to_games.sql**
   - Adds `icon` column to games table
   - Enables game icon storage

8. **create_game_icons_bucket.sql**
   - Creates storage bucket for game icons
   - Sets up RLS policies for secure access

⚠️ **SKIP**: `backfill_game_icons.sql` - No longer needed, upload icons via Admin UI instead

### Step 3: Game Header Images (4 files + manual step)

9. **create_game_headers_bucket.sql**
   - Creates storage bucket for tournament header images
   - Sets up bucket configuration

10. **disable_game_headers_rls.sql**
    - Fixes RLS policies for game-headers bucket
    - Ensures proper access control

11. **add_tournament_header_to_games.sql**
    - Adds `tournament_header_image` column to games table
    - Enables header image display

⚠️ **MANUAL STEP**: Upload header images to game-headers bucket via Supabase Storage UI

12. **backfill_game_header_images.sql**
    - Replace `{game_id}` placeholders with actual game IDs from database
    - Run after manual image upload is complete

### Step 4: Dynamic Roles Support (1 file)

13. **remove_team_member_role_enum_constraint.sql**
    - Removes enum constraint from `team_members.role` column
    - Enables dynamic roles added via admin side
    - Critical for role selection functionality in user teams management

### Step 5: RLS Policies (1 file)

14. **fix_games_rls_policies.sql**
    - Fixes RLS policies for games tables
    - Ensures proper security and access control

### Step 6: Verification (Optional)

15. **check_tournament_game_join.sql**
    - Debug/verification script to check tournament-game joins
    - Run to verify data integrity after migration

## Files to Skip for Production

❌ **disable_games_rls.sql** - Testing only, do not run in production
❌ **team_member_role_wwm.sql** - No longer needed, replaced by dynamic roles system
❌ **add_marvel_rivals_game.sql** - Included in populate_games_from_constants.sql
❌ **add_where_winds_meet_game.sql** - Included in populate_games_from_constants.sql
❌ **backfill_game_icons.sql** - Use Admin UI for icon uploads instead

## Post-Deployment Verification

After running all SQL migrations:

1. **Verify Games Table**
   ```sql
   SELECT * FROM games ORDER BY sort_order;
   ```
   Should show all games with proper display names and configurations

2. **Verify Game Roles**
   ```sql
   SELECT * FROM game_roles ORDER BY game_id, role_name;
   ```
   Should show dynamic roles for each game

3. **Verify Teams have game_id**
   ```sql
   SELECT id, name, game, game_id FROM teams WHERE game_id IS NULL;
   ```
   Should return 0 rows

4. **Verify Tournaments have game_id**
   ```sql
   SELECT id, name, game, game_id FROM tournaments WHERE game_id IS NULL;
   ```
   Should return 0 rows

5. **Test Dynamic Roles**
   - Navigate to admin games management
   - Add a custom role to a game
   - Navigate to user team management
   - Try selecting the custom role for a team member
   - Verify the role persists to database

## Rollback Plan

If issues occur, you can rollback by:

1. Restore from pre-deployment database backup
2. Or manually revert specific migrations (not recommended)

## Troubleshooting

### Error: "invalid input value for enum team_member_role"
- **Cause**: Enum constraint still exists on team_members.role
- **Solution**: Ensure step 13 (remove_team_member_role_enum_constraint.sql) was run successfully

### Error: "relation does not exist" for games tables
- **Cause**: Core tables not created
- **Solution**: Ensure steps 1-2 were run in order

### Error: Game icons not displaying
- **Cause**: Storage bucket not created or RLS issues
- **Solution**: Run steps 7-8 and verify bucket exists in Supabase Storage

### Error: Tournament game_id is NULL
- **Cause**: Backfill scripts not run or failed
- **Solution**: Re-run steps 5-6 and verify no NULL values remain

## Contact

For deployment issues or questions, refer to the development team or check the commit history for additional context.
