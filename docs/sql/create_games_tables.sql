-- Games and game_roles tables for dynamic game management
-- Run in Supabase SQL Editor

-- Games table: stores game configuration
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  display_name text not null,
  identity_group text, -- 'riot' for Riot games, null for individual games
  identity_field_label text,
  identity_field_placeholder text,
  identity_helper_text text,
  accent_class text not null default 'from-white/10 via-white/5 to-transparent',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Game roles table: stores role mappings per game
create table if not exists public.game_roles (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  role_name text not null,
  created_at timestamptz not null default now(),
  unique (game_id, role_name)
);

-- Indexes for performance
create index if not exists games_slug_idx on public.games(slug);
create index if not exists games_is_active_idx on public.games(is_active);
create index if not exists games_sort_order_idx on public.games(sort_order);
create index if not exists game_roles_game_id_idx on public.game_roles(game_id);

-- Enable RLS
alter table public.games enable row level security;
alter table public.game_roles enable row level security;

-- Drop existing policies if any
drop policy if exists "Games read policy" on public.games;
drop policy if exists "Games insert policy" on public.games;
drop policy if exists "Games update policy" on public.games;
drop policy if exists "Games delete policy" on public.games;

drop policy if exists "Game roles read policy" on public.game_roles;
drop policy if exists "Game roles insert policy" on public.game_roles;
drop policy if exists "Game roles update policy" on public.game_roles;
drop policy if exists "Game roles delete policy" on public.game_roles;

-- Games RLS policies
-- Public read for active games only
create policy "Games read policy"
  on public.games for select to anon, authenticated
  using (is_active = true);

-- Admin read for all games (including inactive)
create policy "Games admin read policy"
  on public.games for select to authenticated
  using (true);

-- Authenticated users can insert (admin check should be done at application level)
create policy "Games insert policy"
  on public.games for insert to authenticated
  with check (true);

create policy "Games update policy"
  on public.games for update to authenticated
  using (true)
  with check (true);

create policy "Games delete policy"
  on public.games for delete to authenticated
  using (true);

-- Game roles RLS policies
-- Public read for active games only
create policy "Game roles read policy"
  on public.game_roles for select to anon, authenticated
  using (
    exists (
      select 1 from public.games
      where games.id = game_roles.game_id
        and games.is_active = true
    )
  );

-- Admin read for all roles
create policy "Game roles admin read policy"
  on public.game_roles for select to authenticated
  using (true);

-- Authenticated users can insert/update/delete (admin check at application level)
create policy "Game roles insert policy"
  on public.game_roles for insert to authenticated
  with check (true);

create policy "Game roles update policy"
  on public.game_roles for update to authenticated
  using (true)
  with check (true);

create policy "Game roles delete policy"
  on public.game_roles for delete to authenticated
  using (true);

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists games_updated_at on public.games;

create trigger games_updated_at
  before update on public.games
  for each row
  execute function public.handle_updated_at();
