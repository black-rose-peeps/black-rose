-- Member profiles + social links (run in Supabase SQL Editor)

create table if not exists public.member_profiles (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members (id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  headline text not null default 'Black Rose Member',
  bio text not null default '',
  main_game text,
  main_role text not null default '',
  region text not null default '',
  avatar_url text,
  banner_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_profiles_slug_idx on public.member_profiles (slug);
create index if not exists member_profiles_member_id_idx on public.member_profiles (member_id);

create table if not exists public.member_social_links (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  platform text not null,
  url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, platform)
);

alter table public.member_profiles enable row level security;
alter table public.member_social_links enable row level security;

drop policy if exists "Allow member_profiles read" on public.member_profiles;
drop policy if exists "Allow member_profiles insert" on public.member_profiles;
drop policy if exists "Allow member_profiles update" on public.member_profiles;

-- Public read only; writes go through service role (server functions).
create policy "Allow member_profiles read"
  on public.member_profiles for select to anon, authenticated
  using (is_public = true);

drop policy if exists "Allow member_social_links read" on public.member_social_links;
drop policy if exists "Allow member_social_links insert" on public.member_social_links;
drop policy if exists "Allow member_social_links update" on public.member_social_links;

create policy "Allow member_social_links read"
  on public.member_social_links for select to anon, authenticated
  using (
    is_public = true
    and url is not null
    and exists (
      select 1
      from public.member_profiles p
      where p.member_id = member_social_links.member_id
        and p.is_public = true
    )
  );

-- Safe to re-run if member_social_links already existed without visibility
alter table public.member_social_links
  add column if not exists is_public boolean not null default true;

do $$
begin
  alter publication supabase_realtime add table public.member_profiles;
exception
  when duplicate_object then
    raise notice 'member_profiles already in supabase_realtime publication';
  when others then
    raise;
end $$;
