-- Optional: record when admin approves or rejects a registration (run in Supabase SQL Editor)
alter table public.tournament_registrations
  add column if not exists approved_at timestamptz,
  add column if not exists reviewed_at timestamptz;
