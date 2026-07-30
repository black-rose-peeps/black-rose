-- Extend team_member_role enum for Marvel Rivals roster roles.
-- Run in Supabase SQL Editor if create team fails with:
--   invalid input value for enum team_member_role: "Strategist"
--   invalid input value for enum team_member_role: "Duelist"
--   invalid input value for enum team_member_role: "Vanguard"

alter type public.team_member_role add value if not exists 'Vanguard';
alter type public.team_member_role add value if not exists 'Duelist';
alter type public.team_member_role add value if not exists 'Strategist';
