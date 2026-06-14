-- Extend team_member_role enum for Where Winds Meet roster roles.
-- Run in Supabase SQL Editor if create team fails with:
--   invalid input value for enum team_member_role: "DPS"

alter type public.team_member_role add value if not exists 'DPS';
alter type public.team_member_role add value if not exists 'Tank';
alter type public.team_member_role add value if not exists 'Healer';
