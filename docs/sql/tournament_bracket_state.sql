-- =============================================================================
-- Black Rose Arena — bracket publish + live score sync
-- Run once in Supabase → SQL Editor
--
-- Requires existing tables: tournaments, tournament_registrations, members
-- Adds: tournament_bracket_state (JSON snapshot used by bracket.service.ts)
-- =============================================================================

-- 1) Bracket state table (one row per tournament)
create table if not exists public.tournament_bracket_state (
  tournament_id uuid primary key
    references public.tournaments (id) on delete cascade,
  status text not null default 'not_generated'
    check (status in ('not_generated', 'draft', 'published')),
  seeding_locked boolean not null default false,
  bracket_data jsonb,
  updated_at timestamptz not null default now()
);

-- Safe if you re-run this script
alter table public.tournament_bracket_state
  add column if not exists bracket_data jsonb;

create index if not exists tournament_bracket_state_status_idx
  on public.tournament_bracket_state (status);

-- 2) Realtime (public bracket tab + tournament list refresh)
do $$
begin
  alter publication supabase_realtime add table public.tournament_bracket_state;
exception
  when duplicate_object then null;
  when others then
    raise notice 'tournament_bracket_state realtime: %', sqlerrm;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tournaments;
exception
  when duplicate_object then null;
  when others then
    raise notice 'tournaments realtime: %', sqlerrm;
end $$;

-- 3) Row Level Security
alter table public.tournament_bracket_state enable row level security;

-- Drop old policies if re-running
drop policy if exists "Public read published brackets" on public.tournament_bracket_state;
drop policy if exists "Allow bracket state writes" on public.tournament_bracket_state;
drop policy if exists "Allow bracket state insert" on public.tournament_bracket_state;
drop policy if exists "Allow bracket state update" on public.tournament_bracket_state;
drop policy if exists "Allow bracket state delete" on public.tournament_bracket_state;
drop policy if exists "Admin manage bracket state" on public.tournament_bracket_state;

-- Anyone (including anon) can read a published bracket
create policy "Public read published brackets"
  on public.tournament_bracket_state
  for select
  using (status = 'published');

-- Writes are separate from SELECT (dev: open until Supabase Auth + is_tournament_admin()).
-- Replace the three policies below with is_tournament_admin() once auth is wired.
create policy "Allow bracket state insert"
  on public.tournament_bracket_state
  for insert
  with check (true);

create policy "Allow bracket state update"
  on public.tournament_bracket_state
  for update
  using (true)
  with check (true);

create policy "Allow bracket state delete"
  on public.tournament_bracket_state
  for delete
  using (true);

-- ---------------------------------------------------------------------------
-- OPTIONAL — use after Supabase Auth is connected (replace open write policy)
-- ---------------------------------------------------------------------------
-- create or replace function public.is_tournament_admin()
-- returns boolean
-- language sql
-- stable
-- security definer
-- set search_path = public
-- as $$
--   select exists (
--     select 1
--     from public.members m
--     where m.id = auth.uid()
--       and m.role in ('Tournament Admin', 'Super Admin')
--   );
-- $$;
--
-- drop policy if exists "Allow bracket state writes" on public.tournament_bracket_state;
-- create policy "Admin manage bracket state"
--   on public.tournament_bracket_state for all
--   using (public.is_tournament_admin())
--   with check (public.is_tournament_admin());

-- 4) Security-definer RPCs (admin console uses anon key — bypasses RLS safely)
create or replace function public.get_tournament_bracket_state(p_tournament_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select to_jsonb(s)
  from public.tournament_bracket_state s
  where s.tournament_id = p_tournament_id;
$$;

create or replace function public.upsert_tournament_bracket_state(
  p_tournament_id uuid,
  p_status text,
  p_seeding_locked boolean,
  p_bracket_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tournament_bracket_state;
begin
  insert into public.tournament_bracket_state (
    tournament_id, status, seeding_locked, bracket_data, updated_at
  )
  values (p_tournament_id, p_status, p_seeding_locked, p_bracket_data, now())
  on conflict (tournament_id) do update set
    status = excluded.status,
    seeding_locked = excluded.seeding_locked,
    bracket_data = excluded.bracket_data,
    updated_at = now()
  returning * into result;

  return to_jsonb(result);
end;
$$;

create or replace function public.update_tournament_bracket_data(
  p_tournament_id uuid,
  p_bracket_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tournament_bracket_state;
begin
  update public.tournament_bracket_state
  set bracket_data = p_bracket_data, updated_at = now()
  where tournament_id = p_tournament_id
    and status = 'published'
  returning * into result;

  if result.tournament_id is null then
    raise exception 'Published bracket not found for tournament %', p_tournament_id;
  end if;

  return to_jsonb(result);
end;
$$;

create or replace function public.reset_tournament_bracket_state(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tournament_bracket_state (
    tournament_id, status, seeding_locked, bracket_data, updated_at
  )
  values (p_tournament_id, 'not_generated', false, null, now())
  on conflict (tournament_id) do update set
    status = 'not_generated',
    seeding_locked = false,
    bracket_data = null,
    updated_at = now();
end;
$$;

grant execute on function public.get_tournament_bracket_state(uuid) to anon, authenticated;
grant execute on function public.upsert_tournament_bracket_state(uuid, text, boolean, jsonb) to anon, authenticated;
grant execute on function public.update_tournament_bracket_data(uuid, jsonb) to anon, authenticated;
grant execute on function public.reset_tournament_bracket_state(uuid) to anon, authenticated;
