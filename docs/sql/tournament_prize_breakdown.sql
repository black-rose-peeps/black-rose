-- =============================================================================
-- Black Rose Arena — prize distribution tiers per tournament
-- Run once in Supabase → SQL Editor
-- =============================================================================

alter table public.tournaments
  add column if not exists prize_breakdown jsonb;

comment on column public.tournaments.prize_breakdown is
  'Array of { place, prize } objects configured by admins for public overview display.';

-- CHECK constraints cannot use subqueries; validate via an immutable function.
create or replace function public.is_valid_prize_breakdown(data jsonb)
returns boolean
language sql
immutable
strict
as $$
  select data is null
    or (
      jsonb_typeof(data) = 'array'
      and not exists (
        select 1
        from jsonb_array_elements(data) as elem
        where jsonb_typeof(elem) <> 'object'
          or not (elem ? 'place')
          or not (elem ? 'prize')
          or jsonb_typeof(elem->'place') <> 'string'
          or jsonb_typeof(elem->'prize') <> 'string'
      )
    );
$$;

alter table public.tournaments
  drop constraint if exists tournaments_prize_breakdown_shape_chk;

alter table public.tournaments
  add constraint tournaments_prize_breakdown_shape_chk
  check (public.is_valid_prize_breakdown(prize_breakdown));
