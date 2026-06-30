-- =============================================================================
-- Black Rose Arena — optional link to full tournament-specific ruleset
-- Run once in Supabase → SQL Editor
-- =============================================================================

alter table public.tournaments
  add column if not exists rules_url text;

comment on column public.tournaments.rules_url is
  'Public URL for the uploaded official rules file (Supabase Storage) or legacy external link.';

alter table public.tournaments
  drop constraint if exists tournaments_rules_url_length_chk;

alter table public.tournaments
  add constraint tournaments_rules_url_length_chk
  check (rules_url is null or char_length(rules_url) <= 500);
