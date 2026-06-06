-- =============================================================================
-- Members: verification status migration (run in Supabase SQL Editor)
-- =============================================================================
-- The app uses status = 'Not Verified' | 'Verified' (text, no role column).
-- If your table still uses the member_status ENUM (Active / Suspended), this
-- converts it to text first — do NOT compare to lowercase 'active' on the enum.
-- =============================================================================

-- Remove legacy admin columns (safe if already dropped)
alter table public.members drop column if exists role;
alter table public.members drop column if exists console_password_hash;

-- Convert member_status enum → text (skip if already text)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'members'
      and column_name = 'status'
      and udt_name = 'member_status'
  ) then
    alter table public.members alter column status drop default;

    alter table public.members
      alter column status type text
      using (
        case lower(status::text)
          when 'active' then 'Verified'
          when 'verified' then 'Verified'
          when 'suspended' then 'Not Verified'
          when 'banned' then 'Not Verified'
          when 'not verified' then 'Not Verified'
          else 'Not Verified'
        end
      );

    drop type if exists public.member_status;
  end if;
end $$;

-- Normalize any remaining legacy text values (safe after enum → text)
update public.members
set status = 'Verified'
where lower(status) in ('active', 'verified');

update public.members
set status = 'Not Verified'
where status is null
   or status not in ('Verified', 'Not Verified');

-- Defaults for new rows
alter table public.members
  alter column status set default 'Not Verified';

alter table public.members
  alter column registered_at set default current_date;

alter table public.members
  alter column created_at set default now();

-- Replace old CHECK constraints on status (names vary by project)
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'members'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.members drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.members
  drop constraint if exists members_status_check;

alter table public.members
  add constraint members_status_check
  check (status in ('Not Verified', 'Verified'));

-- RLS: admin console uses the anon key (localStorage session, not Supabase Auth).
-- Intentionally permissive until admin routes use Supabase Auth or write RPCs.
-- Tightening to auth.uid() would block the current browser admin CRUD flow.
alter table public.members enable row level security;

drop policy if exists "Allow members read" on public.members;
drop policy if exists "Allow members insert" on public.members;
drop policy if exists "Allow members update" on public.members;

create policy "Allow members read"
  on public.members for select
  to anon, authenticated
  using (true);

create policy "Allow members insert"
  on public.members for insert
  to anon, authenticated
  with check (true);

create policy "Allow members update"
  on public.members for update
  to anon, authenticated
  using (true)
  with check (true);
