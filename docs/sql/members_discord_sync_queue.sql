-- Discord sync queue hygiene (run in Supabase SQL Editor before deploying Worker update)
-- Tracks repeated not-in-guild misses so the cron Worker stops polling abandoned signups.

alter table public.members
  add column if not exists discord_not_in_guild_strikes integer not null default 0;

alter table public.members
  drop constraint if exists members_discord_not_in_guild_strikes_nonneg;

alter table public.members
  add constraint members_discord_not_in_guild_strikes_nonneg
  check (discord_not_in_guild_strikes >= 0);

alter table public.members
  add column if not exists discord_sync_paused_at timestamptz;

comment on column public.members.discord_not_in_guild_strikes is
  'Consecutive Discord guild member lookups that returned 404 (user left or never joined).';

comment on column public.members.discord_sync_paused_at is
  'When set, the discord-sync Worker skips this Not Verified member until they reappear in guild (recovery sweep or login OAuth).';

create index if not exists members_discord_sync_hot_idx
  on public.members (created_at desc, id)
  where status = 'Not Verified'
    and discord_id is not null
    and discord_sync_paused_at is null;

create index if not exists members_discord_sync_paused_idx
  on public.members (discord_sync_paused_at desc, id)
  where status = 'Not Verified'
    and discord_id is not null
    and discord_sync_paused_at is not null;
