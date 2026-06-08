-- =============================================================================
-- Black Rose Arena — prize distribution tiers per tournament
-- Run once in Supabase → SQL Editor
-- =============================================================================

alter table public.tournaments
  add column if not exists prize_breakdown jsonb;

comment on column public.tournaments.prize_breakdown is
  'Array of { place, prize } objects configured by admins for public overview display.';
