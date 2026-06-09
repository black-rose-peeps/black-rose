-- =============================================================================
-- Create an admin account (run AFTER admin_accounts.sql)
-- =============================================================================
-- 1. Replace the username and password below.
-- 2. Run this single statement in Supabase SQL Editor.
-- 3. Sign in at /login?console=1 with those credentials.
-- =============================================================================

select public.create_admin_account(
  'admin',                    -- username
  'your-secure-password-here' -- password (min 8 characters)
);

-- Verify it was created:
-- select id, username, created_at from public.admin_accounts;
--
-- If login fails with "function crypt(text, text) does not exist", run the
-- verify_admin_login fix in admin_accounts.sql (pgcrypto lives in `extensions`).
