-- =============================================================================
-- Admin console login — run in Supabase SQL Editor
-- =============================================================================
-- Step 1: Run this ENTIRE file once (schema + login RPC + create helper).
-- Step 2: At the bottom, run ONE of the "create admin" lines (edit password first).
-- =============================================================================

-- Supabase installs pgcrypto in the `extensions` schema (not `public`).
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Table
-- -----------------------------------------------------------------------------
create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Case-insensitive username uniqueness (login compares lower(username))
alter table public.admin_accounts drop constraint if exists admin_accounts_username_key;
drop index if exists public.admin_accounts_username_lower_key;
create unique index if not exists admin_accounts_username_lower_key
  on public.admin_accounts (lower(username));

alter table public.admin_accounts enable row level security;
-- No SELECT/INSERT policies for anon — login only via RPC below.

-- -----------------------------------------------------------------------------
-- Login (called by the app)
-- -----------------------------------------------------------------------------
create or replace function public.verify_admin_login(p_username text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  select password_hash into stored_hash
  from public.admin_accounts
  where lower(username) = lower(trim(p_username));

  if stored_hash is null then
    return false;
  end if;

  return stored_hash = extensions.crypt(p_password, stored_hash);
end;
$$;

grant execute on function public.verify_admin_login(text, text) to anon, authenticated;

-- Session check: username still exists (called on admin route load)
create or replace function public.verify_admin_session(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_accounts
    where lower(username) = lower(trim(p_username))
  );
$$;

grant execute on function public.verify_admin_session(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Create admin (SQL Editor only — NOT exposed to the browser)
-- -----------------------------------------------------------------------------
create or replace function public.create_admin_account(p_username text, p_password text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  normalized_username text;
begin
  normalized_username := lower(trim(p_username));

  if normalized_username = '' then
    raise exception 'Username is required';
  end if;

  if p_password is null or length(p_password) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;

  insert into public.admin_accounts (username, password_hash)
  values (normalized_username, extensions.crypt(p_password, extensions.gen_salt('bf')))
  returning id into new_id;

  return new_id;
end;
$$;

-- Only dashboard / postgres should call this — not the anon API key.
revoke all on function public.create_admin_account(text, text) from public;
revoke all on function public.create_admin_account(text, text) from anon, authenticated;

-- =============================================================================
-- STEP 2 — Create your first admin (edit username/password, then run ONE line)
-- =============================================================================
-- Sign in at /login?console=1 with the same username + password.
--
-- select public.create_admin_account('admin', 'your-secure-password-here');
--
-- Or insert manually:
-- insert into public.admin_accounts (username, password_hash)
-- values ('admin', extensions.crypt('your-secure-password-here', extensions.gen_salt('bf')));
--
-- List admins (usernames only):
-- select id, username, created_at from public.admin_accounts order by created_at;

-- Member verification migration → run docs/sql/members_verification.sql
