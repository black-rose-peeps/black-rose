-- =============================================================================
-- Create an admin account (first or additional)
-- =============================================================================
-- Run this entire file in Supabase SQL Editor.
-- Safe to re-run: ensures extension, table, and helper RPC exist, then creates
-- the account. Sign in at /login?console=1 with the username + password below.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_accounts drop constraint if exists admin_accounts_username_key;
drop index if exists public.admin_accounts_username_lower_key;
create unique index if not exists admin_accounts_username_lower_key
  on public.admin_accounts (lower(username));

alter table public.admin_accounts enable row level security;

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

revoke all on function public.create_admin_account(text, text) from public;
revoke all on function public.create_admin_account(text, text) from anon, authenticated;

-- Optional — list existing admins before creating another:
-- select id, username, created_at from public.admin_accounts order by created_at;

-- Edit username and password, then run:
select public.create_admin_account(
  'new-admin-username'::text,       -- must not match an existing username
  'your-secure-password-here'::text -- min 8 characters
);

-- Returns the new row's uuid on success.
-- Duplicate username → error from unique index on lower(username).
--
-- For login RPCs (verify_admin_login, verify_admin_session), also run once:
-- docs/sql/admin_accounts.sql
