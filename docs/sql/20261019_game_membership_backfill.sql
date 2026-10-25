-- PREPARED ONLY: run after reviewing the summary/skip counts in a DEV rehearsal.
-- Requires expand + integrity migration. Apply before enabling new profile writers.
-- Never creates membership/event rows; all original legacy columns remain read-only.
-- Original member_profiles values are read-only. No blank/ambiguous/conflicting identity imports.
begin;
set local lock_timeout = '5s';
-- Coordinate import snapshots with every profile/preference/membership RPC.
do $$ begin perform id from public.members order by id for update; end $$;
create temporary table gm_aliases on commit drop as
select distinct g.id game_id, public.game_membership_key(a) alias_key
from public.games g cross join lateral unnest(public.game_membership_aliases(g.name,g.display_name,g.slug)) a;
create temporary table gm_sources on commit drop as
select mp.member_id,e.key source_key,btrim(e.value #>> '{}') ign,'explicit'::text source
from public.member_profiles mp cross join lateral jsonb_each(
 case when jsonb_typeof(mp.game_identities)='object' then mp.game_identities else '{}'::jsonb end) e
where jsonb_typeof(e.value)='string' and btrim(e.value #>> '{}')<>''
union all
select mp.member_id,mp.main_game,
 case when public.game_membership_is_riot(g.identity_group,g.name,g.slug)
   then btrim(coalesce(mp.valorant_game_name,''))||'#'||btrim(coalesce(mp.valorant_tagline,''))
   else btrim(mp.ingame_display_name) end,'main'
from public.member_profiles mp
join gm_aliases a on a.alias_key=public.game_membership_key(mp.main_game)
join public.games g on g.id=a.game_id
where (select count(distinct x.game_id) from gm_aliases x where x.alias_key=a.alias_key)=1
 and case when public.game_membership_is_riot(g.identity_group,g.name,g.slug)
   then btrim(coalesce(mp.valorant_game_name,''))<>'' and btrim(coalesce(mp.valorant_tagline,''))<>''
   else btrim(coalesce(mp.ingame_display_name,''))<>'' end;
create temporary table gm_resolved on commit drop as
select s.*,a.game_id,
 (select count(distinct x.game_id) from gm_aliases x where x.alias_key=public.game_membership_key(s.source_key)) matches
from gm_sources s left join gm_aliases a on a.alias_key=public.game_membership_key(s.source_key);
-- Explicit identities take precedence over main-game fallback, never over another explicit alias.
create temporary table gm_candidates on commit drop as
select r.member_id,r.game_id,min(r.ign) ign,count(distinct r.ign) identity_count
from gm_resolved r where r.matches=1
and (r.source='explicit' or not exists(select 1 from gm_resolved e where e.member_id=r.member_id and e.game_id=r.game_id and e.source='explicit' and e.matches=1))
group by r.member_id,r.game_id;
-- A shared Riot ID must not import different identities into different game rows.
-- Consider every explicit source (including conflicting aliases), saved per-game rows,
-- and the shared legacy columns. Conflicts are skipped for manual review, never repaired.
create temporary table gm_riot_conflicts on commit drop as
select member_id from (
 select r.member_id,r.ign from gm_resolved r join public.games g on g.id=r.game_id
 where r.matches=1 and public.game_membership_is_riot(g.identity_group,g.name,g.slug)
 union all
 select gp.member_id,btrim(gp.ign) from public.member_game_profiles gp join public.games g on g.id=gp.game_id
 where btrim(gp.ign)<>'' and public.game_membership_is_riot(g.identity_group,g.name,g.slug)
 union all
 select mp.member_id,btrim(mp.valorant_game_name)||'#'||btrim(mp.valorant_tagline)
 from public.member_profiles mp where btrim(coalesce(mp.valorant_game_name,''))<>'' and btrim(coalesce(mp.valorant_tagline,''))<>''
) sources group by member_id having count(distinct ign)>1;
create temporary table gm_importable on commit drop as
select c.member_id,c.game_id,c.ign,
 case when a.game_id=c.game_id then coalesce(mp.main_role,'') else '' end role_label
from gm_candidates c join public.games g on g.id=c.game_id
join public.member_profiles mp on mp.member_id=c.member_id
left join gm_aliases a on a.alias_key=public.game_membership_key(mp.main_game)
 and (select count(distinct x.game_id) from gm_aliases x where x.alias_key=a.alias_key)=1
where c.identity_count=1 and length(c.ign)<=160
and c.ign !~ '[[:cntrl:]]' and c.ign !~ U&'[\0080-\009F\2028\2029]'
and (not public.game_membership_is_riot(g.identity_group,g.name,g.slug) or
 (c.ign ~ '^[^#[:cntrl:]]{3,16}#[^#[:cntrl:]]{3,6}$' and not exists(select 1 from gm_riot_conflicts rc where rc.member_id=c.member_id)));
create temporary table gm_inserted on commit drop as
with imported as (
 insert into public.member_game_profiles(member_id,game_id,ign,role_id,role_label)
 select i.member_id,i.game_id,i.ign,
  (select r.id from public.game_roles r where r.game_id=i.game_id
    and lower(btrim(r.role_name))=lower(btrim(i.role_label))
    and (select count(*) from public.game_roles r2 where r2.game_id=i.game_id and lower(btrim(r2.role_name))=lower(btrim(i.role_label)))=1),
  i.role_label
 from gm_importable i where length(i.role_label)<=160 on conflict(member_id,game_id) do nothing returning member_id,game_id
) select * from imported;
select jsonb_build_object(
 'source_rows',(select count(*) from gm_sources),
 'unmatched_source_rows',(select count(*) from gm_sources s where not exists(select 1 from gm_aliases a where a.alias_key=public.game_membership_key(s.source_key))),
 'ambiguous_source_rows',(select count(*) from gm_sources s where (select count(distinct a.game_id) from gm_aliases a where a.alias_key=public.game_membership_key(s.source_key))>1),
 'conflicting_identity_pairs',(select count(*) from gm_candidates where identity_count>1),
 'conflicting_shared_riot_members',(select count(*) from gm_riot_conflicts),
 'invalid_or_overlong_identity_pairs',(select count(*) from gm_candidates c where c.identity_count=1 and not exists(select 1 from gm_importable i where i.member_id=c.member_id and i.game_id=c.game_id)),
 'importable_pairs',(select count(*) from gm_importable),
 'inserted_pairs',(select count(*) from gm_inserted),
 'already_present_pairs',(select count(*) from gm_importable where length(role_label)<=160)-(select count(*) from gm_inserted),
 'overlong_role_snapshot_pairs_skipped',(select count(*) from gm_importable where length(role_label)>160),
 'memberships',(select count(*) from public.game_memberships),
 'events',(select count(*) from public.game_membership_events)
) backfill_report;
commit;
