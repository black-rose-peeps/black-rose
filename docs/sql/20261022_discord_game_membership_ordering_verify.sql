-- Dev-only ordering regressions after BOTH Discord migrations. All changes roll back.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local role service_role;
create temporary table dgo_results(label text primary key) on commit drop;
create function pg_temp.dgo_assert(ok boolean,label text) returns void language plpgsql as $$
begin
 if ok is distinct from true then raise exception 'Discord ordering fixture failed: %',label; end if;
 insert into dgo_results values(label) on conflict do nothing;
end $$;
create function pg_temp.dgo_proof(uid text,rid text,present boolean) returns jsonb language sql as $$
 select jsonb_build_array(jsonb_build_object('discord_id',uid,'role_ids',
  case when present then jsonb_build_array(rid) else '[]'::jsonb end,
  'not_in_guild',false,'observed_at',clock_timestamp())) $$;
do $$
declare
 m uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); suffix text:=gen_random_uuid()::text;
 uid text:='1888888888888888804'; rid text:='1888888888888888824'; guild text:='1193921905795792906';
 positive jsonb; negative jsonb; newer jsonb; stale jsonb; result jsonb; before_row jsonb;
 n bigint; manual_at timestamptz; tied_at timestamptz;
begin
 insert into public.members(id,username,discord_username,discord_id,status)
 values(m,'dgm-order-'||suffix,'dgm-order-'||left(suffix,16),uid,'Verified');
 insert into public.games(id,name,slug,display_name,profile_field_config)
 values(g,'dgm-order-'||suffix,'dgm-order-'||suffix,'Synthetic ordering','{}');
 insert into public.member_game_profiles(member_id,game_id,ign) values(m,g,'OrderHero');
 insert into public.admin_accounts(id,username,password_hash)
 values(a,'dgm-order-'||suffix,'disabled-synthetic-not-a-password-hash');
 insert into public.discord_game_role_mappings(guild_id,role_id,game_id) values(guild,rid,g);
 -- BOTH observations precede the atomic Apply write; later evidence must still win.
 positive:=pg_temp.dgo_proof(uid,rid,true);
 perform pg_sleep(0.01);
 negative:=pg_temp.dgo_proof(uid,rid,false);
 perform pg_sleep(0.01);
 result:=public.reconcile_discord_game_memberships(guild,positive,m,g);
 perform pg_temp.dgo_assert(result->'applied'->>'status'='accepted','atomic Apply accepts legitimate pre-write proof');
 result:=public.reconcile_discord_game_memberships(guild,negative);
 perform pg_temp.dgo_assert((result->>'inactivated')::int=1,'newer negative predating atomic Apply persistence wins');
 -- Newer negative no-op protects Inactive against a delayed older positive.
 positive:=pg_temp.dgo_proof(uid,rid,true);
 perform pg_sleep(0.01);
 newer:=pg_temp.dgo_proof(uid,rid,false);
 select to_jsonb(x) into before_row from public.game_memberships x where member_id=m and game_id=g;
 select count(*) into n from public.game_membership_events where member_id=m;
 result:=public.reconcile_discord_game_memberships(guild,newer);
 perform pg_temp.dgo_assert((result->>'changed')::int=0
  and before_row-'discord_observed_at'=(select to_jsonb(x)-'discord_observed_at' from public.game_memberships x where member_id=m and game_id=g)
  and n=(select count(*) from public.game_membership_events where member_id=m),'no-op advances only private checkpoint');
 result:=public.reconcile_discord_game_memberships(guild,positive);
 perform pg_temp.dgo_assert((result->>'changed')::int=0 and exists(select 1 from public.game_memberships where member_id=m and game_id=g and status='inactive'),'newer unchanged negative blocks older positive');
 -- Newer positive no-op protects Accepted against a delayed older negative.
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgo_proof(uid,rid,true));
 negative:=pg_temp.dgo_proof(uid,rid,false);
 perform pg_sleep(0.01);
 newer:=pg_temp.dgo_proof(uid,rid,true);
 result:=public.reconcile_discord_game_memberships(guild,newer);
 result:=public.reconcile_discord_game_memberships(guild,negative);
 perform pg_temp.dgo_assert((result->>'changed')::int=0 and exists(select 1 from public.game_memberships where member_id=m and game_id=g and status='accepted'),'newer unchanged positive blocks older negative');
 -- Non-Apply transition: acquisition T2 < earlier observation's persistence T3.
 perform public.change_game_membership(m,g,'leave','member',m::text);
 result:=public.reconcile_discord_game_memberships(guild,'[]',m,g);
 perform pg_sleep(0.01);
 positive:=pg_temp.dgo_proof(uid,rid,true);
 perform pg_sleep(0.01);
 negative:=pg_temp.dgo_proof(uid,rid,false);
 perform pg_sleep(0.01);
 result:=public.reconcile_discord_game_memberships(guild,positive);
 result:=public.reconcile_discord_game_memberships(guild,negative);
 perform pg_temp.dgo_assert((result->>'inactivated')::int=1,'newer acquisition predating older persistence still applies');
 -- A genuinely later manual decision remains authoritative.
 stale:=pg_temp.dgo_proof(uid,rid,true);
 perform pg_sleep(0.01);
 perform public.change_game_membership(m,g,'set_status','admin',a::text,'applying');
 select membership_decided_at into manual_at from public.game_memberships where member_id=m and game_id=g;
 result:=public.reconcile_discord_game_memberships(guild,stale);
 perform pg_temp.dgo_assert((result->>'changed')::int=0 and exists(select 1 from public.game_memberships where member_id=m and game_id=g and status='applying' and discord_suppressed),'later manual Applying decision blocks old proof');
 result:=public.get_discord_game_membership_sync_batch(guild,25,0);
 perform pg_temp.dgo_assert(not ((result->'members') @> jsonb_build_array(jsonb_build_object('discord_id',uid))),'manual Applying override excluded from queue');
 -- Equal audit timestamps and random UUID ordering cannot release explicit state.
 select max(created_at) into tied_at from public.game_membership_events where member_id=m and game_id=g;
 insert into public.game_membership_events(member_id,game_id,actor_type,actor_id,action,old_status,new_status,created_at)
 values(m,g,'member',m::text,'apply','applying','applying',tied_at);
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgo_proof(uid,rid,true));
 perform pg_temp.dgo_assert((result->>'changed')::int=0 and exists(select 1 from public.game_memberships where member_id=m and game_id=g and discord_suppressed),'equal-time audit tie does not override suppression');
 result:=public.reconcile_discord_game_memberships(guild,stale,m,g);
 perform pg_temp.dgo_assert(result->'applied'->>'status'='applying' and exists(select 1 from public.game_memberships where member_id=m and game_id=g and membership_decided_at>=manual_at),'stale Apply proof cannot lower pre-existing manual barrier');
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgo_proof(uid,rid,true),m,g);
 perform pg_temp.dgo_assert(result->'applied'->>'status'='accepted' and exists(select 1 from public.game_memberships where member_id=m and game_id=g and not discord_suppressed),'explicit Apply releases suppression with fresh proof');
 perform public.change_game_membership(m,g,'set_status','admin',a::text,'accepted');
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgo_proof(uid,rid,false));
 perform pg_temp.dgo_assert((result->>'changed')::int=0 and exists(select 1 from public.game_memberships where member_id=m and game_id=g and status='accepted' and not discord_managed),'same-status manual acceptance preserved');
 perform public.change_game_membership(m,g,'leave','member',m::text);
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgo_proof(uid,rid,true));
 perform pg_temp.dgo_assert((result->>'changed')::int=0 and exists(select 1 from public.game_memberships where member_id=m and game_id=g and status='left'),'Leave preserved after ordering repair');
 result:=public.reconcile_discord_game_memberships(guild,'[]',m,g);
 perform public.change_game_membership(m,g,'withdraw','member',m::text);
 result:=public.reconcile_discord_game_memberships(guild,pg_temp.dgo_proof(uid,rid,true));
 perform pg_temp.dgo_assert((result->>'changed')::int=0 and exists(select 1 from public.game_memberships where member_id=m and game_id=g and status='interested'),'withdrawal preserved after ordering repair');
end $$;
select count(*) passed_groups,jsonb_agg(label order by label) checks from dgo_results;
reset role;
rollback;
