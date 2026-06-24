-- Store full registration timestamp (not date-only) for accurate sort and display.
-- Run in Supabase SQL Editor after deploying the app update.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournament_registrations'
      and column_name = 'registered_at'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournament_registrations'
      and column_name = 'registration_date'
  ) then
    alter table public.tournament_registrations
      rename column registered_at to registration_date;
  end if;
end $$;

alter table public.tournament_registrations
  alter column registration_date type timestamptz
  using registration_date::timestamptz;

alter table public.tournament_registrations
  alter column registration_date set default now();

alter table public.tournament_registrations
  alter column registration_date set not null;
