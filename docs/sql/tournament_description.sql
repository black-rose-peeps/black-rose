-- =============================================================================
-- Black Rose Arena — public tournament description (hero / meta)
-- Run once in Supabase → SQL Editor
-- =============================================================================

alter table public.tournaments
  add column if not exists description text;

comment on column public.tournaments.description is
  'Short public summary shown on the tournament detail page (max 280 characters).';

alter table public.tournaments
  drop constraint if exists tournaments_description_length_chk;

alter table public.tournaments
  add constraint tournaments_description_length_chk
  check (description is null or char_length(description) <= 280);
