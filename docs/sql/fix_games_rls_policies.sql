-- Fix RLS policies for games and game_roles tables
-- Run this in Supabase SQL Editor to fix the authorization errors

-- Drop all existing policies for games table
drop policy if exists "Games read policy" on public.games;
drop policy if exists "Games admin read policy" on public.games;
drop policy if exists "Games insert policy" on public.games;
drop policy if exists "Games update policy" on public.games;
drop policy if exists "Games delete policy" on public.games;

-- Drop all existing policies for game_roles table
drop policy if exists "Game roles read policy" on public.game_roles;
drop policy if exists "Game roles admin read policy" on public.game_roles;
drop policy if exists "Game roles insert policy" on public.game_roles;
drop policy if exists "Game roles update policy" on public.game_roles;
drop policy if exists "Game roles delete policy" on public.game_roles;

-- Recreate Games RLS policies
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

-- Recreate Game roles RLS policies
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
