-- Remove enum constraint from team_members.role to allow dynamic roles
-- This enables the role column to accept any string value instead of being restricted to hardcoded enum values
-- Run this in Supabase SQL Editor
-- See docs/GAMES_MANAGEMENT_DEPLOYMENT.md for complete deployment guide

-- Step 1: Create a temporary text column
ALTER TABLE team_members ADD COLUMN role_new TEXT;

-- Step 2: Copy existing enum values to the new column
UPDATE team_members SET role_new = role::TEXT;

-- Step 3: Drop the old enum column
ALTER TABLE team_members DROP COLUMN role;

-- Step 4: Rename the new column to role
ALTER TABLE team_members RENAME COLUMN role_new TO role;

-- Step 5: Set the column to not null (optional, if you want to enforce that role must have a value)
ALTER TABLE team_members ALTER COLUMN role SET NOT NULL;

-- Step 6: Optionally, add a check constraint to ensure role is not empty (optional)
-- ALTER TABLE team_members ADD CONSTRAINT check_role_not_empty CHECK (role <> '');

-- Step 7: Drop the old enum type (optional, if no other tables use it)
-- DROP TYPE IF EXISTS team_member_role;
