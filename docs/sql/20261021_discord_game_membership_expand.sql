-- ADDITIVE FORWARD migration; review/apply DEV xjwugbbrqpwnenmlrkdh only.
-- Requires 20261019 expand + final integrity. No deployment or SQL execution implied.
-- TRUST BOUNDARY: service callers must verify the guild and mapped-role catalog exist
-- before submitting NEGATIVE observations. A deleted Discord role is configuration
-- failure, NOT evidence of member role removal: disable its mapping and omit proof.
-- The observation wire shape cannot independently attest role-catalog existence.
-- No browser observation is authoritative. Do not grant these RPCs to browser roles.
begin;
set local lock_timeout = '5s';
alter table public.game_memberships add column discord_managed boolean not null default false;
alter table public.game_memberships add column discord_observed_at timestamptz;
alter table public.game_membership_events add column discord_evidence jsonb;
alter table public.game_membership_events drop constraint game_membership_events_actor_type_check;
alter table public.game_membership_events add constraint game_membership_events_actor_type_check
 check (actor_type in ('member','admin','discord'));
create table public.discord_game_role_mappings (
 guild_id text not null check (guild_id ~ '^[0-9]{17,20}$'),
 role_id text not null check (role_id ~ '^[0-9]{17,20}$'),
 game_id uuid not null references public.games(id) on delete restrict,
 enabled boolean not null default true,
 primary key(guild_id,role_id), unique(guild_id,game_id)
);
alter table public.discord_game_role_mappings enable row level security;
revoke all on public.discord_game_role_mappings from public,anon,authenticated;
grant select,insert,update,delete on public.discord_game_role_mappings to service_role;
create index game_memberships_discord_managed_queue_idx on public.game_memberships(member_id,game_id)
 where discord_managed and status in ('accepted','inactive');
create index game_memberships_discord_applying_queue_idx on public.game_memberships(member_id,game_id)
 where status='applying';
-- Resolve approved aliases against the catalog; never use environment-specific UUIDs.
do $$
declare seed record; ids uuid[];
begin
 for seed in select * from (values
 ('1548977405069234256',array['world-of-warcraft-forever','wow-forever','World of Warcraft Forever','WoW Forever']),
 ('1547101455125577789',array['aion-2','Aion 2']),
 ('1465129387182522450',array['valorant','Valorant']),
 ('1475345886434295898',array['palworld','Palworld']),
 ('1465128743726219287',array['league-of-legends','League of Legends','LoL']),
 ('1331615176784482306',array['marvel-rivals','Marvel Rivals']),
 ('1439483814182129695',array['where-winds-meet','Where Winds Meet'])
 ) s(role_id,aliases) loop
  select array_agg(distinct g.id) into ids from public.games g
  where exists(select 1 from unnest(public.game_membership_aliases(g.name,g.display_name,g.slug)) a,
   unnest(seed.aliases) b where public.game_membership_key(a)=public.game_membership_key(b));
  if coalesce(cardinality(ids),0)<>1 then
   raise exception 'Missing or ambiguous Discord game catalog mapping for role %',seed.role_id using errcode='22023';
  end if;
  insert into public.discord_game_role_mappings(guild_id,role_id,game_id)
   values('1193921905795792906',seed.role_id,ids[1]);
 end loop;
end $$;

-- Saved IGN only. Optional class/server/faction/role fields are not prerequisites.
-- Revalidate persisted values under the same whole-member lock, including legacy imports.
create or replace function public.discord_game_membership_valid_ign(p_ign text,p_riot boolean)
returns boolean language sql immutable security invoker set search_path = pg_catalog,public
as $$ select coalesce(length(btrim(p_ign)) between 1 and 160
 and p_ign !~ '[[:cntrl:]]' and p_ign !~ U&'[\0080-\009F\2028\2029]'
 and (not p_riot or (length(p_ign)-length(replace(p_ign,'#',''))=1
  and length(btrim(split_part(p_ign,'#',1))) between 3 and 16
  and length(btrim(split_part(p_ign,'#',2))) between 3 and 6)),false) $$;

-- Final integrity body is copied forward below with ownership/IGN-only changes.
create or replace function public.change_game_membership(
 p_member_id uuid,p_game_id uuid,p_action text,p_actor_type text,p_actor_id text,
 p_admin_status text default null,p_reason text default null
) returns public.game_memberships
language plpgsql security invoker set search_path = pg_catalog,public
as $$
declare g public.games%rowtype; oldm public.game_memberships%rowtype; result public.game_memberships%rowtype; target text; saved_ign text;
begin
 if p_actor_type is null or p_actor_type not in ('member','admin') or p_actor_id is null or length(p_actor_id) not between 1 and 160 or length(p_reason)>1000 then
  raise exception 'Invalid actor/reason' using errcode='22023';
 end if;
 perform 1 from public.members where id=p_member_id for update;
 if not found then raise exception 'Member not found' using errcode='22023'; end if;
 if p_actor_type='member' and p_actor_id<>p_member_id::text then raise exception 'Member actor mismatch' using errcode='42501'; end if;
 if p_actor_type='admin' and not exists(select 1 from public.admin_accounts where id::text=p_actor_id) then
  raise exception 'Unknown administrator' using errcode='42501';
 end if;
 select * into g from public.games where id=p_game_id for share;
 if not found then raise exception 'Game not found' using errcode='22023'; end if;
 select * into oldm from public.game_memberships where member_id=p_member_id and game_id=p_game_id for update;
 if p_actor_type='admin' and p_action='set_status' then
  target:=p_admin_status;
  if target is null or target not in ('interested','applying','accepted','inactive','left') then raise exception 'Invalid admin status' using errcode='22023'; end if;
 elsif p_actor_type='member' and p_admin_status is null then
  case p_action
   when 'interest' then
    if oldm.status is not null and oldm.status not in ('interested','left') then raise exception 'Invalid interest transition' using errcode='22023'; end if;
    target:='interested';
   when 'apply' then
    if oldm.status is not null and oldm.status not in ('interested','applying','left') then raise exception 'Invalid apply transition' using errcode='22023'; end if;
    target:='applying';
   when 'withdraw' then
    if oldm.status is distinct from 'applying' then raise exception 'Only applying may withdraw' using errcode='22023'; end if;
    target:='interested';
   when 'leave' then
    if oldm.status is null then raise exception 'Existing membership required' using errcode='22023'; end if;
    target:='left';
   else raise exception 'Invalid member action' using errcode='42501';
  end case;
 else raise exception 'Invalid actor/action combination' using errcode='42501'; end if;
 if not g.is_active and target in ('interested','applying','accepted') and p_action<>'withdraw' then
  raise exception 'Game is inactive' using errcode='22023';
 end if;
 if target in ('applying','accepted') then
  select ign into saved_ign from public.member_game_profiles where member_id=p_member_id and game_id=p_game_id;
  if not public.discord_game_membership_valid_ign(saved_ign,public.game_membership_is_riot(g.identity_group,g.name,g.slug)) then raise exception 'Save a valid nonblank IGN first' using errcode='22023'; end if;
 end if;
 -- A manual override revokes automation even if the visible status is unchanged.
 -- A new explicit Apply can release an admin Applying override without a fake transition.
 if oldm.status=target and not oldm.discord_managed and p_actor_type<>'admin' and not (
  p_actor_type='member' and p_action='apply' and exists(
   select 1 from public.game_membership_events e where e.member_id=p_member_id and e.game_id=p_game_id
    and e.actor_type='admin' and e.action='set_status'
    and not exists(select 1 from public.game_membership_events newer
      where newer.member_id=e.member_id and newer.game_id=e.game_id and newer.created_at>e.created_at)
  )) then return oldm; end if;
 insert into public.game_memberships(member_id,game_id,status,updated_at) values(p_member_id,p_game_id,target,clock_timestamp())
 on conflict(member_id,game_id) do update set status=excluded.status,discord_managed=false,discord_observed_at=null,updated_at=clock_timestamp() returning * into result;
 insert into public.game_membership_events(member_id,game_id,actor_type,actor_id,action,old_status,new_status,reason,created_at)
 values(p_member_id,p_game_id,p_actor_type,p_actor_id,p_action,oldm.status,target,nullif(btrim(p_reason),''),clock_timestamp());
 return result;
end $$;

create or replace function public.reconcile_discord_game_memberships(
 p_guild_id text,p_observations jsonb,p_apply_member_id uuid default null,
 p_apply_game_id uuid default null,p_dry_run boolean default false
) returns jsonb language plpgsql security invoker set search_path = pg_catalog,public
as $$
declare
 obs jsonb; observed timestamptz; m public.members%rowtype; gm public.game_memberships%rowtype;
 candidate record; mapping public.discord_game_role_mappings%rowtype; g public.games%rowtype;
 original_updated_at timestamptz; original_discord_at timestamptz;
 result jsonb; applied jsonb:=null; changes jsonb:='[]'; evidence jsonb;
 changed integer:=0; accepted integer:=0; inactivated integer:=0; skipped integer:=0;
 target text; saved_ign text; role_present boolean; last_actor text;
 now_at timestamptz; locked_member_ids uuid[];
begin
 if p_guild_id is distinct from '1193921905795792906' then
  raise exception 'Unapproved guild' using errcode='22023';
 end if;
 if (p_apply_member_id is null)<>(p_apply_game_id is null) then
  raise exception 'Both Apply identifiers required' using errcode='22023';
 end if;
 if p_observations is null or jsonb_typeof(p_observations)<>'array' then
  raise exception 'Observations must be an array; use [] for unavailable proof' using errcode='22023';
 end if;
 if jsonb_array_length(p_observations)>25 then raise exception 'Batch limit is 25' using errcode='22023'; end if;
 -- Run exactly the write path inside a rolled-back PL/pgSQL subtransaction.
 if p_dry_run then
  begin
   result:=public.reconcile_discord_game_memberships(p_guild_id,p_observations,p_apply_member_id,p_apply_game_id,false);
   raise exception 'rollback dry run' using errcode='ZX001';
  exception when sqlstate 'ZX001' then return result; end;
 end if;
 -- Acquire ALL whole-member locks before pair locks; same ordering for overlapping batches.
 select array_agg(locked.id) into locked_member_ids from (
  select lm.id from public.members lm
  where lm.id=p_apply_member_id or exists(select 1 from jsonb_array_elements(p_observations) o
   where jsonb_typeof(o)='object' and jsonb_typeof(o->'discord_id')='string' and o->>'discord_id'=lm.discord_id)
  order by lm.id for update
 ) locked;
 -- Never discover an unlocked newly-linked member in a later READ COMMITTED snapshot.
 -- Hold catalog/mapping reads against concurrent configuration changes in this transaction.
 perform lg.id from public.games lg where lg.id=p_apply_game_id or exists(
  select 1 from public.discord_game_role_mappings d where d.guild_id=p_guild_id and d.game_id=lg.id)
 order by lg.id for share;
 perform d.role_id from public.discord_game_role_mappings d where d.guild_id=p_guild_id order by d.role_id for share;
 if p_apply_member_id is not null then
  select * into m from public.members where id=p_apply_member_id and id=any(locked_member_ids);
  if not found or m.status is distinct from 'Verified' or coalesce(m.discord_id,'') !~ '^[0-9]{17,20}$'
   or (select count(*) from public.members mm where mm.discord_id=m.discord_id)<>1 then
   raise exception 'Current verified Discord-linked member required' using errcode='42501';
  end if;
  select updated_at,discord_observed_at into original_updated_at,original_discord_at
   from public.game_memberships where member_id=p_apply_member_id and game_id=p_apply_game_id;
  -- Existing Apply validates persisted profile + active catalog under the member lock.
  gm:=public.change_game_membership(p_apply_member_id,p_apply_game_id,'apply','member',p_apply_member_id::text,null,null);
  applied:=to_jsonb(gm);
 end if;
 for obs in select value from jsonb_array_elements(p_observations) loop
  -- Reject malformed proof as unavailable, never convert it into negative evidence.
  if jsonb_typeof(obs) is distinct from 'object'
   or jsonb_typeof(obs->'discord_id') is distinct from 'string'
   or coalesce(obs->>'discord_id','') !~ '^[0-9]{17,20}$'
   or jsonb_typeof(obs->'role_ids') is distinct from 'array'
   or jsonb_typeof(obs->'not_in_guild') is distinct from 'boolean'
   or jsonb_typeof(obs->'observed_at') is distinct from 'string' then
   skipped:=skipped+1; continue;
  end if;
  if jsonb_array_length(obs->'role_ids')>250
   or exists(select 1 from jsonb_array_elements(obs->'role_ids') r where jsonb_typeof(r)<>'string' or (r #>> '{}') !~ '^[0-9]{17,20}$')
   or (obs->>'not_in_guild')::boolean and jsonb_array_length(obs->'role_ids')<>0
   or (select count(*) from jsonb_array_elements(p_observations) o where o->>'discord_id'=obs->>'discord_id')<>1
   or (obs->>'observed_at') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$' then
   skipped:=skipped+1; continue;
  end if;
  begin observed:=(obs->>'observed_at')::timestamptz;
  exception when invalid_datetime_format or datetime_field_overflow then skipped:=skipped+1; continue; end;
  now_at:=clock_timestamp();
  if observed<now_at-interval '120 seconds' or observed>now_at+interval '5 seconds' then
   skipped:=skipped+1; continue;
  end if;
  select * into m from public.members where discord_id=obs->>'discord_id' and id=any(locked_member_ids);
  if not found or (select count(*) from public.members mm where mm.discord_id=m.discord_id)<>1 then
   skipped:=skipped+1; continue;
  end if;
  -- Explicit Apply proof is scoped to its target, never to other games/users in the same RPC.
  if p_apply_member_id is not null and m.id<>p_apply_member_id then skipped:=skipped+1; continue; end if;
  for candidate in select x.* from public.game_memberships x
   where x.member_id=m.id and (x.status='applying' or x.discord_managed and x.status in ('accepted','inactive'))
    and (p_apply_game_id is null or x.game_id=p_apply_game_id)
   order by x.game_id for update loop
   gm:=candidate;
   select * into g from public.games where id=gm.game_id for share;
   if not found or not g.is_active then skipped:=skipped+1; continue; end if;
   select * into mapping from public.discord_game_role_mappings d
    where d.guild_id=p_guild_id and d.game_id=gm.game_id and d.enabled for share;
   if not found then skipped:=skipped+1; continue; end if;
   if observed<=coalesce(case when p_apply_member_id=m.id and p_apply_game_id=gm.game_id
      then original_updated_at else gm.updated_at end,'-infinity'::timestamptz)
    or observed<=coalesce(case when p_apply_member_id=m.id and p_apply_game_id=gm.game_id
      then original_discord_at else gm.discord_observed_at end,'-infinity'::timestamptz) then
    skipped:=skipped+1; continue;
   end if;
   -- A manual Applying override is protected until a new explicit Apply.
   select e.actor_type into last_actor from public.game_membership_events e
    where e.member_id=m.id and e.game_id=gm.game_id
    order by e.created_at desc,e.id desc limit 1;
   if gm.status='applying' and last_actor='admin' and p_apply_member_id is null then skipped:=skipped+1; continue; end if;
   role_present:=not (obs->>'not_in_guild')::boolean and (obs->'role_ids') ? mapping.role_id;
   target:=null;
   if role_present and (gm.status='applying' or gm.status='inactive' and gm.discord_managed)
    and m.status='Verified' then
    -- Re-read profile INSIDE TX after whole-member lock, not a caller/browser snapshot.
    select ign into saved_ign from public.member_game_profiles where member_id=m.id and game_id=gm.game_id;
    if public.discord_game_membership_valid_ign(saved_ign,public.game_membership_is_riot(g.identity_group,g.name,g.slug)) then target:='accepted'; end if;
   elsif not role_present and gm.status='accepted' and gm.discord_managed then target:='inactive';
   end if;
   -- No persisted observations, updated_at writes, or audit events for unchanged results.
   if target is null or target=gm.status then skipped:=skipped+1; continue; end if;
   evidence:=jsonb_build_object('discord_id',m.discord_id,'matched_role_ids',
    case when role_present then jsonb_build_array(mapping.role_id) else '[]'::jsonb end,'observed_at',observed);
   update public.game_memberships set status=target,discord_managed=true,discord_observed_at=observed,
    updated_at=clock_timestamp() where member_id=m.id and game_id=gm.game_id;
   insert into public.game_membership_events(member_id,game_id,actor_type,actor_id,action,old_status,new_status,discord_evidence,created_at)
    values(m.id,gm.game_id,'discord',p_guild_id,'set_status',gm.status,target,evidence,clock_timestamp());
   changed:=changed+1;
   if target='accepted' then accepted:=accepted+1; else inactivated:=inactivated+1; end if;
   changes:=changes||jsonb_build_array(jsonb_build_object('member_id',m.id,'game_id',gm.game_id,'old_status',gm.status,'new_status',target));
  end loop;
 end loop;
 if p_apply_member_id is not null then
  select to_jsonb(x) into applied from public.game_memberships x where member_id=p_apply_member_id and game_id=p_apply_game_id;
 end if;
 return jsonb_build_object('applied',applied,'changed',changed,'accepted',accepted,'inactivated',inactivated,'skipped',skipped,'changes',changes);
end $$;

create or replace function public.get_discord_game_membership_sync_batch(p_guild_id text,p_limit integer,p_tick bigint)
returns jsonb language plpgsql security invoker set search_path = pg_catalog,public
as $$
declare result jsonb;
begin
 if p_guild_id is distinct from '1193921905795792906' then raise exception 'Unapproved guild' using errcode='22023'; end if;
 if p_limit is null or p_limit<1 or p_limit>25 or p_tick is null or p_tick<0 then
  raise exception 'Limit must be 1..25 and tick nonnegative' using errcode='22023'; end if;
 -- ONE statement/snapshot: eligible set, count, deterministic rotation and slice.
 with eligible as materialized (
  select m.id member_id,m.discord_id from public.members m
  where m.discord_id ~ '^[0-9]{17,20}$'
   and not exists(select 1 from public.members other where other.discord_id=m.discord_id and other.id<>m.id)
   and exists(select 1 from public.game_memberships gm
    join public.games g on g.id=gm.game_id and g.is_active
    join public.discord_game_role_mappings d on d.game_id=g.id and d.guild_id=p_guild_id and d.enabled
    where gm.member_id=m.id and (gm.status='applying' or gm.discord_managed and gm.status in ('accepted','inactive')))
 ), totals as (select count(*) total from eligible), rotation as (
  select total,case when total=0 then 0 else p_tick % ((total+p_limit-1)/p_limit) end page from totals
 ), batch as (select * from eligible order by member_id
  limit p_limit offset (select page*p_limit from rotation))
 select jsonb_build_object('members',coalesce((select jsonb_agg(to_jsonb(b) order by member_id) from batch b),'[]'::jsonb),
  'total',total,'page',page) into result from rotation;
 return result;
end $$;

revoke all on function public.discord_game_membership_valid_ign(text,boolean),
 public.reconcile_discord_game_memberships(text,jsonb,uuid,uuid,boolean),
 public.get_discord_game_membership_sync_batch(text,integer,bigint),
 public.change_game_membership(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.discord_game_membership_valid_ign(text,boolean),
 public.reconcile_discord_game_memberships(text,jsonb,uuid,uuid,boolean),
 public.get_discord_game_membership_sync_batch(text,integer,bigint),
 public.change_game_membership(uuid,uuid,text,text,text,text,text) to service_role;
commit;



