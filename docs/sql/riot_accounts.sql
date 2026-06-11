-- Riot Sign On (RSO) linked accounts — run in Supabase SQL editor.
-- Stores verified Valorant identity after explicit player opt-in.

create table if not exists public.riot_accounts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members (id) on delete cascade,
  puuid text not null,
  game_name text not null,
  tagline text not null,
  region text not null default '',
  rso_subject text,
  is_public boolean not null default false,
  consent_version text not null default '1',
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists riot_accounts_puuid_idx on public.riot_accounts (puuid);

alter table public.riot_accounts enable row level security;

-- No anon/authenticated policies — riot_accounts is accessed via service role only.
