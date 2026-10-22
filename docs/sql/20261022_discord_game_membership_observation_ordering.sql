-- FORWARD REPAIR after 20261021_discord_game_membership_expand.sql.
-- Dev ordering regression reproduced before this repair; no original migration edit.
-- Preserve the newest trusted observation without fabricating status/audit changes.
-- Same RPC/request count. One necessary private checkpoint per eligible no-op pair.
begin;
set local lock_timeout = '5s';
-- Install with automation disabled. Preserve existing visible rows and audit history.
alter table public.game_memberships add column membership_decided_at timestamptz;
alter table public.game_memberships add column discord_suppressed boolean not null default false;
update public.game_memberships gm set membership_decided_at=updated_at,
 discord_suppressed=(gm.status='applying' and exists(
  select 1 from public.game_membership_events e
  where e.member_id=gm.member_id and e.game_id=gm.game_id and e.actor_type='admin'
   and not exists(select 1 from public.game_membership_events newer
    where newer.member_id=e.member_id and newer.game_id=e.game_id and newer.created_at>e.created_at)
 ));
-- Historical equal-time ambiguity is conservatively suppressed until a new Apply.
alter table public.game_memberships alter column membership_decided_at set not null;
alter table public.game_memberships alter column membership_decided_at set default clock_timestamp();

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
 if oldm.status=target and not oldm.discord_managed and p_actor_type<>'admin'
  and not (p_actor_type='member' and p_action='apply' and oldm.discord_suppressed) then return oldm; end if;
 insert into public.game_memberships(member_id,game_id,status,updated_at,membership_decided_at,discord_suppressed)
 values(p_member_id,p_game_id,target,clock_timestamp(),clock_timestamp(),p_actor_type='admin')
 on conflict(member_id,game_id) do update set status=excluded.status,discord_managed=false,discord_observed_at=null,
  updated_at=excluded.updated_at,membership_decided_at=excluded.membership_decided_at,
  discord_suppressed=excluded.discord_suppressed returning * into result;
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
 original_decided_at timestamptz; original_discord_at timestamptz;
 result jsonb; applied jsonb:=null; changes jsonb:='[]'; evidence jsonb;
 changed integer:=0; accepted integer:=0; inactivated integer:=0; skipped integer:=0;
 target text; saved_ign text; role_present boolean;
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
  select membership_decided_at,discord_observed_at into original_decided_at,original_discord_at
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
      then original_decided_at else gm.membership_decided_at end,'-infinity'::timestamptz)
    or observed<=coalesce(case when p_apply_member_id=m.id and p_apply_game_id=gm.game_id
      then original_discord_at else gm.discord_observed_at end,'-infinity'::timestamptz) then
    skipped:=skipped+1; continue;
   end if;
   -- Explicit authority, not UUID/audit-timestamp tie-breaking.
   if gm.discord_suppressed then skipped:=skipped+1; continue; end if;
   -- Proof precedes the same-request Apply SQL. Bind only after validating the
   -- pre-existing decision/checkpoint barriers; never lower unrelated decisions.
   if p_apply_member_id=m.id and p_apply_game_id=gm.game_id then
    update public.game_memberships set membership_decided_at=observed
     where member_id=m.id and game_id=gm.game_id and membership_decided_at>observed;
   end if;
   role_present:=not (obs->>'not_in_guild')::boolean and (obs->'role_ids') ? mapping.role_id;
   target:=null;
   if role_present and (gm.status='applying' or gm.status='inactive' and gm.discord_managed)
    and m.status='Verified' then
    -- Re-read profile INSIDE TX after whole-member lock, not a caller/browser snapshot.
    select ign into saved_ign from public.member_game_profiles where member_id=m.id and game_id=gm.game_id;
    if public.discord_game_membership_valid_ign(saved_ign,public.game_membership_is_riot(g.identity_group,g.name,g.slug)) then target:='accepted'; end if;
   elsif not role_present and gm.status='accepted' and gm.discord_managed then target:='inactive';
   end if;
   -- Persist the private high-water mark even without a visible status transition.
   -- Otherwise a delayed older contradiction can override a newer unchanged proof.
   -- Membership updated_at, ownership and audit history remain untouched here.
   if target is null or target=gm.status then
    update public.game_memberships set discord_observed_at=observed
     where member_id=m.id and game_id=gm.game_id and discord_observed_at is distinct from observed;
    skipped:=skipped+1; continue;
   end if;
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
 with eligible as materialized (
  select m.id member_id,m.discord_id from public.members m
  where m.discord_id ~ '^[0-9]{17,20}$'
   and not exists(select 1 from public.members other where other.discord_id=m.discord_id and other.id<>m.id)
   and exists(select 1 from public.game_memberships gm
    join public.games g on g.id=gm.game_id and g.is_active
    join public.discord_game_role_mappings d on d.game_id=g.id and d.guild_id=p_guild_id and d.enabled
    where gm.member_id=m.id and (gm.status='applying' and not gm.discord_suppressed
      or gm.discord_managed and gm.status in ('accepted','inactive')))
 ), totals as (select count(*) total from eligible), rotation as (
  select total,case when total=0 then 0 else p_tick % ((total+p_limit-1)/p_limit) end page from totals
 ), batch as (select * from eligible order by member_id
  limit p_limit offset (select page*p_limit from rotation))
 select jsonb_build_object('members',coalesce((select jsonb_agg(to_jsonb(b) order by member_id) from batch b),'[]'::jsonb),
  'total',total,'page',page) into result from rotation;
 return result;
end $$;
revoke all on function public.change_game_membership(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.change_game_membership(uuid,uuid,text,text,text,text,text) to service_role;
revoke all on function public.get_discord_game_membership_sync_batch(text,integer,bigint) from public,anon,authenticated;
grant execute on function public.get_discord_game_membership_sync_batch(text,integer,bigint) to service_role;
revoke all on function public.reconcile_discord_game_memberships(text,jsonb,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.reconcile_discord_game_memberships(text,jsonb,uuid,uuid,boolean) to service_role;
commit;
