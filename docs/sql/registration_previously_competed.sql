-- Add "Previously Competed" to registration_status enum (returning teams/players).
-- Run in Supabase SQL Editor after tournament_registrations exists.
--
-- If you previously ran an older version of this script that used CHECK constraints,
-- only the ALTER TYPE below is required — status is enum-typed, not text + CHECK.

alter type public.registration_status add value if not exists 'Previously Competed';

-- Legacy: drop text CHECK if an early schema used it instead of the enum.
alter table public.tournament_registrations
  drop constraint if exists tournament_registrations_status_check;

-- Backfill: approved entrants on already-completed events → Previously Competed
update public.tournament_registrations r
set status = 'Previously Competed'
from public.tournaments t
where r.tournament_id = t.id
  and r.status = 'Approved'
  and t.status in ('Completed', 'Archived');

-- Diagnostic (optional): list enum values
-- select e.enumlabel as value
-- from pg_type t
-- join pg_enum e on e.enumtypid = t.oid
-- where t.typname = 'registration_status'
-- order by e.enumsortorder;
