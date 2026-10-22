-- ROLLBACK-ONLY DEV fixture. Run the WHOLE file as postgres after reviewed expand.
-- Intended target: xjwugbbrqpwnenmlrkdh. Never run against production.
-- Rehearsed on Dev; see discord-game-membership-dev-verification.json for evidence.
-- A SQL error requires ROLLBACK immediately. Never use this fixture on production.
-- Single-session assertions cannot prove blocking: before rollout also run a
-- two-session probe: session A locks members(id) and changes IGN/manual status;
-- session B starts reconcile and must wait, then re-read A's committed state.
-- No credentials, raw Discord payloads, unrelated roles or IGN enter audit evidence.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local role service_role;
create temporary table dgm_results(label text primary key) on commit drop;
-- protected existing members: compare EVERY pre-existing member's protected rows.
create temporary table dgm_protected on commit drop as
select m.id,to_jsonb(m) member_row,
 (select to_jsonb(p) from public.member_profiles p where p.member_id=m.id) legacy_row,
 (select jsonb_agg(to_jsonb(p) order by p.game_id) from public.member_game_profiles p where p.member_id=m.id) profiles,
 (select jsonb_agg(to_jsonb(p) order by p.game_id) from public.game_memberships p where p.member_id=m.id) memberships,
 (select jsonb_agg(to_jsonb(p) order by p.id) from public.game_membership_events p where p.member_id=m.id) events
from public.members m;
create function pg_temp.dgm_assert(ok boolean,label text) returns void
language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'Discord fixture failed: %',label; end if;
 insert into dgm_results values(label) on conflict do nothing;
end $$;
create function pg_temp.dgm_proof(uid text,roles text[] default array[]::text[],gone boolean default false,
 at_time timestamptz default clock_timestamp()) returns jsonb
language sql as $$ select jsonb_build_array(jsonb_build_object('discord_id',uid,'role_ids',to_jsonb(roles),
 'not_in_guild',gone,'observed_at',at_time)) $$;
do $$
declare
 m uuid:=gen_random_uuid(); m2 uuid:=gen_random_uuid(); m3 uuid:=gen_random_uuid();
 g uuid:=gen_random_uuid(); g2 uuid:=gen_random_uuid(); gr uuid:=gen_random_uuid();
 admin_id uuid:=gen_random_uuid(); suffix text:=gen_random_uuid()::text;
 guild text:='1193921905795792906'; uid text:='1888888888888888801'; uid2 text:='1888888888888888802'; uid3 text:='1888888888888888803';
 role_id text:='1888888888888888811'; role2 text:='1888888888888888812'; roler text:='1888888888888888813';
 proof jsonb; result jsonb; before_row jsonb; before_profile jsonb; before_legacy jsonb; before_member jsonb;
 n bigint; initial_events bigint; q jsonb; q2 jsonb; bad jsonb; bad_ign text; seen_at timestamptz;
begin
 -- Do not reuse or alter a real catalog row, member, profile or game-role mapping.
 insert into public.members(id,username,discord_username,discord_id,status) values
  (m,'dgm-'||suffix,'dgm-'||left(suffix,16),uid,'Verified'),
  (m2,'dgm2-'||suffix,'dgm2-'||left(suffix,16),uid2,'Verified'),
  (m3,'dgm3-'||suffix,'dgm3-'||left(suffix,16),uid3,'Verified');
 insert into public.member_profiles(member_id,slug,display_name,main_game,main_role,game_identities)
 values(m,'dgm-'||suffix,'Synthetic','preserve-main','preserve-role','{"unrelated":"preserve","riot":"original"}'),
 (m2,'dgm2-'||suffix,'Synthetic','preserve-main','preserve-role','{}'),
 (m3,'dgm3-'||suffix,'Synthetic','preserve-main','preserve-role','{}');
 insert into public.admin_accounts(id,username,password_hash)
 values(admin_id,'dgm-'||suffix,'disabled-synthetic-not-a-password-hash');
 insert into public.games(id,name,slug,display_name,profile_field_config,identity_group) values
 (g,'dgm-'||suffix,'dgm-'||suffix,'Synthetic','{"class":{"enabled":true,"label":"Class","kind":"select","options":["Mage"]}}',null),
 (g2,'dgm2-'||suffix,'dgm2-'||suffix,'Synthetic 2','{}',null),
 (gr,'dgmr-'||suffix,'dgmr-'||suffix,'Synthetic Riot','{}','riot');
 insert into public.discord_game_role_mappings(guild_id,role_id,game_id) values
 (guild,role_id,g),(guild,role2,g2),(guild,roler,gr);
 select to_jsonb(p) into before_legacy from public.member_profiles p where member_id=m;
 select to_jsonb(p) into before_member from public.members p where id=m;
 -- missing IGN, blank IGN, invalid IGN all reject before any application/event write.
 begin perform public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[role_id]),m,g);
  raise exception 'Expected missing IGN rejection'; exception when invalid_parameter_value then null; end;
 insert into public.member_game_profiles(member_id,game_id,ign) values(m,g,''),(m,gr,'invalid-riot');
 foreach bad_ign in array array['','   ','bad'||chr(10)||'name',repeat('x',161)] loop
  -- >160 is rejected at storage as well as the shared validator.
  if length(bad_ign)<=160 then
   update public.member_game_profiles set ign=bad_ign where member_id=m and game_id=g;
   begin perform public.reconcile_discord_game_memberships(guild,'[]',m,g);
    raise exception 'Expected invalid IGN rejection'; exception when invalid_parameter_value then null; end;
  else
   perform pg_temp.dgm_assert(not public.discord_game_membership_valid_ign(bad_ign,false),'invalid IGN length');
  end if;
 end loop;
 begin perform public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[roler]),m,gr);
  raise exception 'Expected invalid Riot IGN rejection'; exception when invalid_parameter_value then null; end;
 perform pg_temp.dgm_assert(not exists(select 1 from public.game_memberships where member_id=m)
  and not exists(select 1 from public.game_membership_events where member_id=m),'missing IGN and invalid IGN rejection atomic');
 update public.member_game_profiles set ign='Hero',class_name='',server_name='',faction='' where member_id=m and game_id=g;
 select to_jsonb(p) into before_profile from public.member_game_profiles p where member_id=m and game_id=g;
 -- Observation deliberately predates the new Applying timestamp in this SAME RPC.
 proof:=jsonb_set(pg_temp.dgm_proof(uid,array[role_id,'1888888888888888899']),'{0,username}','"MUST_NOT_PERSIST_RAW_USER_PAYLOAD"');
 result:=public.reconcile_discord_game_memberships(guild,proof,m,g);
 perform pg_temp.dgm_assert(result->'applied'->>'status'='accepted' and (result->>'accepted')::int=1
  and (result->>'changed')::int=1 and jsonb_array_length(result->'changes')=1,'immediate acceptance in one transaction');
 perform pg_temp.dgm_assert((select count(*) from public.game_membership_events where member_id=m and game_id=g)=2
  and exists(select 1 from public.game_membership_events where member_id=m and game_id=g and actor_type='member' and action='apply')
  and exists(select 1 from public.game_memberships where member_id=m and game_id=g and discord_managed),'optional empty fields accepted');
 select to_jsonb(x) into before_row from public.game_memberships x where member_id=m and game_id=g;
 select count(*) into n from public.game_membership_events where member_id=m;
 result:=public.reconcile_discord_game_memberships(guild,proof);
 perform pg_temp.dgm_assert((result->>'changed')::int=0 and n=(select count(*) from public.game_membership_events where member_id=m)
  and before_row=(select to_jsonb(x) from public.game_memberships x where member_id=m and game_id=g),'duplicate idempotence no extra events or timestamps');
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[role_id]));
 perform pg_temp.dgm_assert((result->>'changed')::int=0 and before_row-'discord_observed_at'=(select to_jsonb(x)-'discord_observed_at' from public.game_memberships x where member_id=m and game_id=g)
  and n=(select count(*) from public.game_membership_events where member_id=m),'fresh unchanged idempotence');
 select to_jsonb(x) into before_row from public.game_memberships x where member_id=m and game_id=g;
 -- All malformed/unavailable proof must leave Accepted alone, never mass revoke.
 for bad in select value from jsonb_array_elements(jsonb_build_array(
  '[]'::jsonb, '[null]'::jsonb,
  pg_temp.dgm_proof(uid,array[]::text[],false,clock_timestamp()-interval '121 seconds'),
  pg_temp.dgm_proof(uid,array[]::text[],false,clock_timestamp()+interval '6 seconds'),
  '[{"discord_id":"1888888888888888801","role_ids":[123],"not_in_guild":false,"observed_at":"2026-10-21T00:00:00Z"}]'::jsonb,
  pg_temp.dgm_proof(uid)||pg_temp.dgm_proof(uid),
  jsonb_set(pg_temp.dgm_proof(uid),'{0,observed_at}','"not-a-date"'),
  jsonb_set(pg_temp.dgm_proof(uid),'{0,observed_at}','"2026-02-31T00:00:00Z"'),
  jsonb_set(pg_temp.dgm_proof(uid),'{0,role_ids}','null'),
  jsonb_set(pg_temp.dgm_proof(uid),'{0,not_in_guild}','"false"'),
  pg_temp.dgm_proof(uid,array[role_id],true)
 )) loop
  result:=public.reconcile_discord_game_memberships(guild,bad);
  perform pg_temp.dgm_assert((result->>'changed')::int=0 and before_row=(select to_jsonb(x) from public.game_memberships x where member_id=m and game_id=g),'stale future malformed unavailable contradictory duplicate proof no revocation');
 end loop;
 perform pg_temp.dgm_assert(n=(select count(*) from public.game_membership_events where member_id=m),'malformed proof no extra events');
 -- Missing, disabled or inactive configuration never means role loss.
 update public.discord_game_role_mappings set enabled=false where guild_id=guild and game_id=g;
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'disabled mapping no configuration mass revokes');
 delete from public.discord_game_role_mappings where guild_id=guild and game_id=g;
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'missing mapping no role-deleted configuration revocation');
 insert into public.discord_game_role_mappings(guild_id,role_id,game_id) values(guild,role_id,g);
 update public.games set is_active=false where id=g;
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'inactive game no mass revokes');
 update public.games set is_active=true where id=g;
 -- Only confirmed fresh role loss or confirmed guild departure may inactivate.
 proof:=pg_temp.dgm_proof(uid);
 result:=public.reconcile_discord_game_memberships(guild,proof);
 perform pg_temp.dgm_assert((result->>'inactivated')::int=1 and exists(select 1 from public.game_memberships where member_id=m and game_id=g and status='inactive' and discord_managed),'role loss inactivates managed acceptance');
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[role_id]));
 perform pg_temp.dgm_assert((result->>'accepted')::int=1,'role return reactivates managed inactive');
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[]::text[],true));
 perform pg_temp.dgm_assert((result->>'inactivated')::int=1,'confirmed guild departure inactivates');
 -- An old role-positive observation may not undo a newer role-negative transition.
 result:=public.reconcile_discord_game_memberships(guild,jsonb_set(proof,'{0,role_ids}',jsonb_build_array(role_id)));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'out of order proof cannot undo newer state');
 -- profile revalidation under member lock: imported/directly-corrupted data cannot reactivate.
 update public.member_game_profiles set ign=chr(10) where member_id=m and game_id=g;
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[role_id]));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'profile revalidation rejects changed invalid IGN');
 update public.member_game_profiles set ign='Hero' where member_id=m and game_id=g;
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[role_id]));
 perform pg_temp.dgm_assert((result->>'accepted')::int=1,'profile revalidation permits restored valid IGN');
 -- same accepted override clears ownership and adds a real admin audit principal.
 perform public.change_game_membership(m,g,'set_status','admin',admin_id::text,'accepted','manual override');
 perform pg_temp.dgm_assert(exists(select 1 from public.game_memberships where member_id=m and game_id=g and status='accepted' and not discord_managed and discord_observed_at is null)
  and exists(select 1 from public.game_membership_events where member_id=m and game_id=g and old_status='accepted' and new_status='accepted' and actor_type='admin' and actor_id=admin_id::text),'same accepted override clears Discord ownership');
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'manual acceptance never auto-inactivated');
 perform public.change_game_membership(m,g,'set_status','admin',admin_id::text,'inactive',null);
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[role_id]));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'manual inactive never reaccepted');
 perform public.change_game_membership(m,g,'leave','member',m::text,null,null);
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[role_id]));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'left never reaccepted without Apply');
 -- Empty observations is failed Discord lookup, NOT a failed member Apply.
 result:=public.reconcile_discord_game_memberships(guild,'[]',m,g);
 perform pg_temp.dgm_assert(result->'applied'->>'status'='applying','failed Discord lookup remains Applying');
 perform public.change_game_membership(m,g,'withdraw','member',m::text,null,null);
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[role_id]));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'withdrawal never reaccepted');
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid),m,g);
 perform pg_temp.dgm_assert(result->'applied'->>'status'='applying','no role remains Applying');
 -- Admin even setting the SAME Applying state must explicitly opt out of automation.
 perform public.change_game_membership(m,g,'set_status','admin',admin_id::text,'applying',null);
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[role_id]));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'same applying manual override protected');
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid,array[role_id]),m,g);
 perform pg_temp.dgm_assert(result->'applied'->>'status'='accepted','new explicit Apply releases applying override');
 -- A pending application may be accepted later by role, but never synthesize rows.
 insert into public.member_game_profiles(member_id,game_id,ign) values(m2,g,'Second'),(m2,g2,'Other'),(m3,g,'Manual');
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid2,array[role_id,role2]));
 perform pg_temp.dgm_assert((result->>'changed')::int=0 and not exists(select 1 from public.game_memberships where member_id=m2),'no implicit membership from profile and role');
 result:=public.reconcile_discord_game_memberships(guild,'[null]',m2,g);
 perform pg_temp.dgm_assert(result->'applied'->>'status'='applying','malformed proof Apply still creates Applying');
 result:=public.reconcile_discord_game_memberships(guild,
  pg_temp.dgm_proof(uid2,array[role_id],false,clock_timestamp()-interval '121 seconds'),m2,g);
 perform pg_temp.dgm_assert(result->'applied'->>'status'='applying','stale proof Apply remains Applying');
 result:=public.reconcile_discord_game_memberships(guild,
  pg_temp.dgm_proof(uid2,array[role_id],false,clock_timestamp()+interval '6 seconds'),m2,g);
 perform pg_temp.dgm_assert(result->'applied'->>'status'='applying','future proof Apply remains Applying');
 result:=public.reconcile_discord_game_memberships(guild,'[]',m2,g);
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid2,array[role_id,role2]));
 perform pg_temp.dgm_assert((result->>'accepted')::int=1 and not exists(select 1 from public.game_memberships where member_id=m2 and game_id=g2),'pending application accepted by later role only');
 perform public.change_game_membership(m3,g,'set_status','admin',admin_id::text,'accepted','preexisting manual');
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid3));
 perform pg_temp.dgm_assert((result->>'changed')::int=0,'protected existing members manual acceptances');
 -- Current Verified + linked identity is required; reconcile never changes ROSE status.
 update public.members set status='Not Verified' where id=m2;
 begin perform public.reconcile_discord_game_memberships(guild,'[]',m2,g2);
  raise exception 'Expected Verified rejection'; exception when insufficient_privilege then null; end;
 update public.members set status='Verified',discord_id=null where id=m2;
 begin perform public.reconcile_discord_game_memberships(guild,'[]',m2,g2);
  raise exception 'Expected linked identity rejection'; exception when insufficient_privilege then null; end;
 update public.members set discord_id=uid2 where id=m2;
 -- Atomic validation + dry run never writes membership/event/profile state.
 select count(*) into n from public.game_membership_events where member_id=m2;
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid2,array[role2]),m2,g2,true);
 perform pg_temp.dgm_assert(result->'applied'->>'status'='accepted' and not exists(select 1 from public.game_memberships where member_id=m2 and game_id=g2)
  and n=(select count(*) from public.game_membership_events where member_id=m2),'dry run simulates Apply and acceptance with zero writes');
 begin perform public.reconcile_discord_game_memberships('1193921905795792907',pg_temp.dgm_proof(uid),m,g);
  raise exception 'Expected wrong guild rejection'; exception when invalid_parameter_value then null; end;
 begin perform public.reconcile_discord_game_memberships(guild,'[]',m,null);
  raise exception 'Expected incomplete Apply rejection'; exception when invalid_parameter_value then null; end;
 perform pg_temp.dgm_assert(true,'wrong guild and incomplete Apply rejected');
 -- Explicit Apply on game2 must not reconcile unrelated game1 in the same RPC.
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgm_proof(uid2,array[role2]),m2,g2);
 perform pg_temp.dgm_assert(result->'applied'->>'status'='accepted' and exists(select 1 from public.game_memberships where member_id=m2 and game_id=g and status='accepted'),'Apply proof scoped to target game');
 -- Audit privacy: exact allowlist, only mapped role IDs, stable guild principal.
 perform pg_temp.dgm_assert(not exists(select 1 from public.game_membership_events e where e.member_id in(m,m2,m3) and actor_type='discord'
  and (actor_id<>guild or reason is not null or discord_evidence is null
   or (select array_agg(k order by k) from jsonb_object_keys(discord_evidence) k)
      is distinct from array['discord_id','matched_role_ids','observed_at']::text[]
   or discord_evidence->>'discord_id' not in (uid,uid2,uid3)
   or exists(select 1 from jsonb_array_elements_text(discord_evidence->'matched_role_ids') r where r not in (role_id,role2,roler))
   or jsonb_array_length(discord_evidence->'matched_role_ids')>1
   or not public.discord_game_membership_valid_ign(discord_evidence->>'observed_at',false))),
  'privacy exact evidence allowlist stable guild actor matched roles only');
 perform pg_temp.dgm_assert(exists(select 1 from public.game_membership_events where member_id=m and actor_type='discord'
  and new_status='accepted' and discord_evidence->'matched_role_ids'=jsonb_build_array(role_id))
  and exists(select 1 from public.game_membership_events where member_id=m and actor_type='discord'
   and new_status='inactive' and discord_evidence->'matched_role_ids'='[]'::jsonb),'evidence acceptance and removal retained');
 perform pg_temp.dgm_assert(before_profile=(select to_jsonb(p) from public.member_game_profiles p where member_id=m and game_id=g)
  and before_legacy=(select to_jsonb(p) from public.member_profiles p where member_id=m)
  and before_member=(select to_jsonb(p) from public.members p where id=m),'preservation of profiles Riot identities main game ROSE and history');
 begin update public.game_membership_events set reason='tamper' where member_id=m;
  raise exception 'Expected audit UPDATE denial'; exception when insufficient_privilege then null; end;
 begin delete from public.game_membership_events where member_id=m;
  raise exception 'Expected audit DELETE denial'; exception when insufficient_privilege then null; end;
 perform pg_temp.dgm_assert(true,'audit history append only even for service');
 q:=public.get_discord_game_membership_sync_batch(guild,1,0);
 q2:=public.get_discord_game_membership_sync_batch(guild,1,1);
 perform pg_temp.dgm_assert((q->>'total')::bigint>=2 and jsonb_array_length(q->'members')=1
  and (q->>'page')::bigint=0 and (q2->>'page')::bigint=1 and q->'members'<>q2->'members','queue rotation bounded deterministic page');
 perform pg_temp.dgm_assert(q=public.get_discord_game_membership_sync_batch(guild,1,0),'queue rotation repeatability');
 begin perform public.get_discord_game_membership_sync_batch(guild,26,0);
  raise exception 'Expected queue bound rejection'; exception when invalid_parameter_value then null; end;
end $$;
-- Preserve EVERY real member and protected associated row; no fixture observations target them.
select pg_temp.dgm_assert(not exists(select 1 from dgm_protected s left join public.members m on m.id=s.id
 where s.member_row is distinct from to_jsonb(m)
 or s.legacy_row is distinct from (select to_jsonb(p) from public.member_profiles p where p.member_id=s.id)
 or s.profiles is distinct from (select jsonb_agg(to_jsonb(p) order by p.game_id) from public.member_game_profiles p where p.member_id=s.id)
 or s.memberships is distinct from (select jsonb_agg(to_jsonb(p) order by p.game_id) from public.game_memberships p where p.member_id=s.id)
 or s.events is distinct from (select jsonb_agg(to_jsonb(p) order by p.id) from public.game_membership_events p where p.member_id=s.id)),
 'protected existing members exact preservation');
-- Test actual browser privileges, not merely function grants introspection.
set local role anon;
do $$ begin
 begin perform public.reconcile_discord_game_memberships('1193921905795792906','[]');
  raise exception 'browser denied: anon RPC unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.get_discord_game_membership_sync_batch('1193921905795792906',25,0);
  raise exception 'browser denied: anon queue unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.discord_game_role_mappings;
  raise exception 'browser denied: anon mappings unexpectedly readable'; exception when insufficient_privilege then null; end;
 begin update public.game_memberships set discord_managed=true;
  raise exception 'browser denied: anon membership write unexpectedly allowed'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
do $$ begin
 begin perform public.reconcile_discord_game_memberships('1193921905795792906','[]',gen_random_uuid(),gen_random_uuid());
  raise exception 'browser denied: authenticated RPC unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform public.get_discord_game_membership_sync_batch('1193921905795792906',25,0);
  raise exception 'browser denied: authenticated queue unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.discord_game_role_mappings(guild_id,role_id,game_id) values('1193921905795792906','1888888888888888898',gen_random_uuid());
  raise exception 'browser denied: authenticated mapping write unexpectedly allowed'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.game_membership_events;
  raise exception 'browser denied: authenticated audits unexpectedly readable'; exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
insert into dgm_results values('browser denied for anon and authenticated');
select count(*) passed_groups,jsonb_agg(label order by label) checks from dgm_results;
reset role;
rollback;
