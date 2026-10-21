-- DEV verification: all synthetic fixture writes roll back. Run whole file as postgres.
-- Requires expand + forward integrity migration. Catalog RLS may run before/after this file.
begin;
set local role service_role;
create temporary table gm_test_results(label text primary key) on commit drop;
do $$
declare
 m uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); g2 uuid:=gen_random_uuid();
 riot1 uuid:=gen_random_uuid(); riot2 uuid:=gen_random_uuid(); riot3 uuid:=gen_random_uuid();
 role1 uuid:=gen_random_uuid(); role2 uuid:=gen_random_uuid(); n bigint; x record; suffix text:=gen_random_uuid()::text;
 admin_id uuid:=gen_random_uuid(); admin_name text:='gm-fixture-'||gen_random_uuid()::text;
 before_legacy jsonb; before_memberships jsonb; before_events bigint;
begin
 insert into public.members(id,username,discord_username) values(m,'gm-'||suffix,'gm-'||suffix);
 insert into public.member_profiles(member_id,slug,display_name,main_game,main_role,ingame_display_name,game_identities)
 values(m,'gm-'||suffix,'Synthetic rollback fixture','gm-'||suffix,'old','old','{"unrelated":"preserve"}');
 insert into public.admin_accounts(id,username,password_hash) values(admin_id,admin_name,'disabled-synthetic-fixture-not-a-password-hash');
 insert into public.games(id,name,slug,display_name,profile_field_config) values
 (g,'gm-'||suffix,'gm-'||suffix,'gm-'||suffix,'{"class":{"enabled":true,"label":"Class","kind":"select","options":["Mage"]},"server":{"enabled":true,"label":"Server","kind":"text","options":[]}}'),
 (g2,'other-'||suffix,'other-'||suffix,'other-'||suffix,'{}');
 insert into public.games(id,name,slug,display_name,identity_group) values
 (riot1,'riot1-'||suffix,'riot1-'||suffix,'riot1-'||suffix,'riot'),
 (riot2,'riot2-'||suffix,'riot2-'||suffix,'riot2-'||suffix,'riot'),
 (riot3,'riot3-'||suffix,'riot3-'||suffix,'riot3-'||suffix,'riot');
 insert into public.game_roles(id,game_id,role_name) values(role1,g,'Healer'),(role2,g2,'Other');
 begin perform public.change_game_membership(m,g,'apply','member',m::text,null,null); raise exception 'Expected missing IGN rejection';
 exception when invalid_parameter_value then null; end;
 insert into gm_test_results values('apply requires saved IGN');
 begin perform public.save_member_game_profile(m,g,'Hero',role2,'Mage','Asia','',array[]::text[]); raise exception 'Expected cross-game role rejection';
 exception when invalid_parameter_value then null; end;
 -- Direct writes also cannot cross-link a role to the wrong game.
 begin insert into public.member_game_profiles(member_id,game_id,role_id) values(m,g,role2); raise exception 'Expected composite FK rejection';
 exception when foreign_key_violation then null; end;
 insert into gm_test_results values('role game ownership via RPC and FK');
 perform public.save_member_game_profile(m,g,'Hero',role1,'Mage','Asia','ignored',array[]::text[]);
 if exists(select 1 from public.game_memberships where member_id=m) then raise exception 'Saving profile created membership'; end if;
 select * into x from public.member_profiles where member_id=m;
 if x.main_game<>'gm-'||suffix or x.main_role<>'Healer' or x.ingame_display_name<>'Hero' or x.game_identities->>'unrelated'<>'preserve' then raise exception 'Legacy sync failed'; end if;
 insert into gm_test_results values('profile-only save and selective legacy sync');
 begin perform public.save_member_game_profile(m,g,'Hero',role1,'Warrior','Asia','',array[]::text[]); raise exception 'Expected invalid option rejection';
 exception when invalid_parameter_value then null; end;
 update public.games set profile_field_config='{"class":{"enabled":true,"label":"Class","kind":"select","options":["Warrior"]},"server":{"enabled":false,"label":"Server","kind":"text","options":[]}}' where id=g;
 perform public.save_member_game_profile(m,g,'Hero',role1,'Mage','Europe','',array[]::text[]);
 if not exists(select 1 from public.member_game_profiles where member_id=m and game_id=g and class_name='Mage' and server_name='Asia') then raise exception 'Retired option/disabled preservation failed'; end if;
 update public.game_roles set is_active=false,role_name='Retired renamed label' where id=role1;
 perform public.save_member_game_profile(m,g,'Hero',role1,'Mage','','',array[]::text[]);
 if not exists(select 1 from public.member_game_profiles where member_id=m and game_id=g and role_label='Healer') then raise exception 'Retired role label snapshot erased'; end if;
 insert into gm_test_results values('retired selections/role and disabled field preservation');
 begin perform public.save_member_game_profile(m,g,'Hero',role1,'Mage','','',array['unrelated']); raise exception 'Expected alias rejection';
 exception when invalid_parameter_value then null; end;
 insert into gm_test_results values('unknown legacy alias rejected');
 perform public.change_game_membership(m,g,'interest','member',m::text,null,null);
 perform public.change_game_membership(m,g,'interest','member',m::text,null,null);
 if (select count(*) from public.game_membership_events where member_id=m)<>1 then raise exception 'No-op duplicated audit'; end if;
 insert into gm_test_results values('interest no-op audit deduplication');
 perform public.change_game_membership(m,g,'apply','member',m::text,null,null);
 begin perform public.save_member_game_profile(m,g,'',role1,'Mage','','',array[]::text[]); raise exception 'Expected blank IGN rejection';
 exception when invalid_parameter_value then null; end;
 begin perform public.change_game_membership(m,g,'set_status','member',m::text,'accepted',null); raise exception 'Expected self-accept rejection';
 exception when insufficient_privilege then null; end;
 begin perform public.change_game_membership(m,g,'set_status','admin','nonexistent-'||suffix,'accepted',null); raise exception 'Expected unknown admin rejection';
 exception when insufficient_privilege then null; end;
 begin perform public.change_game_membership(m,g,'leave','member',gen_random_uuid()::text,null,null); raise exception 'Expected actor mismatch';
 exception when insufficient_privilege then null; end;
 insert into gm_test_results values('actor validation and no self acceptance');
 update public.games set is_active=false where id=g;
 perform public.change_game_membership(m,g,'withdraw','member',m::text,null,null);
 begin perform public.change_game_membership(m,g,'apply','member',m::text,null,null); raise exception 'Expected inactive apply rejection';
 exception when invalid_parameter_value then null; end;
 begin perform public.change_game_membership(m,g,'set_status','admin',admin_id::text,'accepted',null); raise exception 'Expected inactive acceptance rejection';
 exception when invalid_parameter_value then null; end;
 begin perform public.save_member_game_profile(m,g,'Hero',role1,'Mage','','',array[]::text[]); raise exception 'Expected inactive profile rejection';
 exception when invalid_parameter_value then null; end;
 perform public.change_game_membership(m,g,'set_status','admin',admin_id::text,'inactive',null);
 perform public.change_game_membership(m,g,'leave','member',m::text,null,null);
 insert into gm_test_results values('inactive game blocks writes but permits withdraw/inactive/leave');
 update public.games set is_active=true where id=g;
 perform public.change_game_membership(m,g,'apply','member',m::text,null,null);
 perform public.change_game_membership(m,g,'set_status','admin',admin_id::text,'accepted','synthetic acceptance');
 begin perform public.save_member_game_profile(m,g,'',role1,'Mage','','',array[]::text[]); raise exception 'Expected accepted blank IGN rejection';
 exception when invalid_parameter_value then null; end;
 if not exists(select 1 from public.game_membership_events where member_id=m and old_status='applying' and new_status='accepted' and actor_id=admin_id::text and reason='synthetic acceptance') then raise exception 'Acceptance audit missing'; end if;
 insert into gm_test_results values('admin acceptance audit and accepted IGN protection');
 begin perform public.save_member_game_profile(m,riot1,'invalid',null,'','','',array[]::text[]); raise exception 'Expected Riot validation';
 exception when invalid_parameter_value then null; end;
 perform public.save_member_game_profile(m,riot2,'Before#123',null,'','','',array[]::text[]);
 perform public.save_member_game_profile(m,riot1,'After#456',null,'','','',array[]::text[]);
 if not exists(select 1 from public.member_game_profiles where member_id=m and game_id=riot2 and ign='After#456')
 or exists(select 1 from public.member_game_profiles where member_id=m and game_id=riot3)
 or exists(select 1 from public.game_memberships where member_id=m and game_id in (riot1,riot2,riot3)) then raise exception 'Riot propagation created extra records or failed'; end if;
 select * into x from public.member_profiles where member_id=m;
 if x.main_game<>'gm-'||suffix or x.ingame_display_name<>'Hero' or x.valorant_game_name<>'After' or x.valorant_tagline<>'456'
 or x.game_identities->>('riot2-'||suffix)<>'After#456' or x.game_identities->>'unrelated'<>'preserve' then raise exception 'Shared Riot legacy sync failed'; end if;
 insert into gm_test_results values('shared Riot update only existing profiles/maps, no inferred memberships');
 -- Username aliases are not audit principals, even when that account exists.
 begin perform public.change_game_membership(m,g,'set_status','admin',admin_name,'accepted',null); raise exception 'Expected username actor rejection';
 exception when insufficient_privilege then null; end;
 update public.admin_accounts set username=admin_name||'-renamed' where id=admin_id;
 perform public.change_game_membership(m,g,'set_status','admin',admin_id::text,'accepted',null);
 insert into gm_test_results values('stable admin UUID survives rename and rejects username');

 -- General form never submits game data; preference projection runs against the latest rows.
 select to_jsonb(mp)-'updated_at'-'display_name'-'headline'-'bio'-'region'-'is_public' into before_legacy
  from public.member_profiles mp where member_id=m;
 select jsonb_agg(to_jsonb(gm) order by game_id) into before_memberships from public.game_memberships gm where member_id=m;
 select count(*) into before_events from public.game_membership_events where member_id=m;
 perform public.update_member_profile_preferences(m,'Edited','Headline','Bio','gm-'||suffix,'SEA',true);
 if before_legacy is distinct from (select to_jsonb(mp)-'updated_at'-'display_name'-'headline'-'bio'-'region'-'is_public'
   from public.member_profiles mp where member_id=m) then raise exception 'Ordinary edit changed protected legacy state'; end if;
 perform public.update_member_profile_preferences(m,'Edited','Headline','Bio','other-'||suffix,'SEA',true);
 if not exists(select 1 from public.member_profiles where member_id=m and main_role='' and ingame_display_name is null)
  then raise exception 'Main preference inherited the previous game role/name'; end if;
 if exists(select 1 from public.member_game_profiles where member_id=m and game_id=g2) then raise exception 'Preference inferred a game profile'; end if;
 perform public.save_member_game_profile(m,g2,'NewHero',null,'','','',array[]::text[]);
 -- A legacy-only role snapshot without role_id survives an IGN edit.
 update public.member_game_profiles set role_label='Uncatalogued legacy role',class_name='retired class' where member_id=m and game_id=g2;
 perform public.save_member_game_profile(m,g2,'NewerHero',null,'erase-me','','',array[]::text[]);
 perform public.update_member_profile_preferences(m,'Edited','Headline','Bio','other-'||suffix,'SEA',true);
 if not exists(select 1 from public.member_game_profiles where member_id=m and game_id=g2 and role_id is null and role_label='Uncatalogued legacy role' and class_name='retired class')
  or not exists(select 1 from public.member_profiles where member_id=m and main_role='Uncatalogued legacy role' and ingame_display_name='NewerHero')
  then raise exception 'Null-ID legacy label or disabled field was erased'; end if;
 perform public.update_member_profile_preferences(m,'Edited','Headline','Bio','gm-'||suffix,'SEA',true);
 if not exists(select 1 from public.member_profiles where member_id=m and main_role='Healer' and ingame_display_name='Hero')
  then raise exception 'Main preference did not project authoritative target'; end if;
 if before_memberships is distinct from (select jsonb_agg(to_jsonb(gm) order by game_id) from public.game_memberships gm where member_id=m)
   or before_events<>(select count(*) from public.game_membership_events where member_id=m)
  then raise exception 'Profile/preference edit changed membership or audit'; end if;
 insert into gm_test_results values('atomic preferences preserve identities and project only target role/name');
 -- Unknown existing fields survive unchanged while ordinary profile text can be saved.
 update public.member_profiles set main_game='unknown legacy title',main_role='unknown role',ingame_display_name='unknown IGN',
  game_identities=game_identities||'{"off-catalog":{"nested":"retain"}}'::jsonb where member_id=m;
 perform public.update_member_profile_preferences(m,'Edited','Headline','Bio','unknown legacy title','SEA',true);
 if not exists(select 1 from public.member_profiles where member_id=m and main_role='unknown role' and ingame_display_name='unknown IGN'
  and game_identities->'off-catalog'='{"nested":"retain"}'::jsonb) then raise exception 'Unknown legacy data lost on ordinary edit'; end if;
 perform public.update_member_profile_preferences(m,'Edited','Headline','Bio','gm-'||suffix,'SEA',true);
 insert into gm_test_results values('ordinary edits preserve unimportable/off-catalog legacy data');

 -- An empty Riot profile is legal without dependent applying/accepted memberships.
 perform public.save_member_game_profile(m,riot1,'',null,'','','',array[]::text[]);
 if exists(select 1 from public.member_game_profiles where member_id=m and game_id in (riot1,riot2) and ign<>'') then raise exception 'Empty Riot identity not shared'; end if;
 perform public.save_member_game_profile(m,riot1,'Rose#A!1234',null,'','','',array[]::text[]);
 perform public.change_game_membership(m,riot2,'apply','member',m::text,null,null);
 begin perform public.save_member_game_profile(m,riot1,'',null,'','','',array[]::text[]); raise exception 'Expected shared applying Riot protection';
 exception when invalid_parameter_value then null; end;
 perform public.change_game_membership(m,riot2,'set_status','admin',admin_id::text,'accepted',null);
 begin perform public.save_member_game_profile(m,riot1,'',null,'','','',array[]::text[]); raise exception 'Expected shared accepted Riot protection';
 exception when invalid_parameter_value then null; end;
 if not exists(select 1 from public.member_game_profiles where member_id=m and game_id=riot2 and ign='Rose#A!1234') then raise exception 'Failed shared clearing mutated identity'; end if;
 perform public.change_game_membership(m,riot2,'leave','member',m::text,null,null);
 perform public.save_member_game_profile(m,riot1,'',null,'','','',array[]::text[]);
 insert into gm_test_results values('blank shared Riot allowed only without applying/accepted dependents; JS tagline parity');

 -- Malformed catalog config must fail at the database boundary, not only JS.
 update public.games set profile_field_config='{"class":{"enabled":true,"label":"Class","kind":"select","options":["Mage","Mage"]}}' where id=g2;
 begin perform public.save_member_game_profile(m,g2,'Hero',null,'Mage','','',array[]::text[]); raise exception 'Expected malformed config rejection';
 exception when invalid_parameter_value then null; end;
 insert into gm_test_results values('malformed catalog config rejected atomically');
 begin update public.game_membership_events set reason='tamper' where member_id=m; raise exception 'Expected audit update denied';
 exception when insufficient_privilege then null; end;
 insert into gm_test_results values('service audit append-only grants');
end $$;
select count(*) passed_groups,jsonb_agg(label order by label) checks from gm_test_results;
set local role anon;
do $$ begin
 begin perform public.save_member_game_profile(gen_random_uuid(),gen_random_uuid(),'x',null,'','','',array[]::text[]); raise exception 'Expected anon RPC denial';
 exception when insufficient_privilege then null; end;
 begin perform public.change_game_membership(gen_random_uuid(),gen_random_uuid(),'interest','member','x',null,null); raise exception 'Expected anon transition denial';
 exception when insufficient_privilege then null; end;
 begin perform public.update_member_profile_preferences(gen_random_uuid(),'','','',null,'',true); raise exception 'Expected anon preference denial';
 exception when insufficient_privilege then null; end;
 begin perform 1 from public.game_membership_events; raise exception 'Expected anon audit denial';
 exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
do $$ begin
 begin perform public.change_game_membership(gen_random_uuid(),gen_random_uuid(),'interest','member','x',null,null); raise exception 'Expected authenticated RPC denial';
 exception when insufficient_privilege then null; end;
 begin perform public.update_member_profile_preferences(gen_random_uuid(),'','','',null,'',true); raise exception 'Expected authenticated preference denial';
 exception when insufficient_privilege then null; end;
 begin perform 1 from public.member_game_profiles; raise exception 'Expected authenticated table denial';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
-- Exact original-data checksums exclude only the two additive catalog columns.
select 'games' entity,count(*),md5(string_agg((to_jsonb(t)-'profile_field_config')::text,'' order by id)) checksum from public.games t
union all select 'game_roles',count(*),md5(string_agg((to_jsonb(t)-'is_active')::text,'' order by id)) from public.game_roles t
union all select 'members',count(*),md5(string_agg(to_jsonb(t)::text,'' order by id)) from public.members t
union all select 'member_profiles',count(*),md5(string_agg(to_jsonb(t)::text,'' order by member_id)) from public.member_profiles t;
select conrelid::regclass,conname,pg_get_constraintdef(oid) from pg_constraint where conrelid in
 ('public.member_game_profiles'::regclass,'public.game_memberships'::regclass,'public.game_membership_events'::regclass);
select c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') anon_select,
 has_table_privilege('authenticated',c.oid,'INSERT') authenticated_insert,
 has_table_privilege('service_role',c.oid,'INSERT') service_insert
from pg_class c where c.oid in ('public.member_game_profiles'::regclass,'public.game_memberships'::regclass,'public.game_membership_events'::regclass);
select p.proname,not p.prosecdef security_invoker,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') service_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
and (p.proname like 'game_membership_%' or p.proname in ('save_member_game_profile','change_game_membership','update_member_profile_preferences'));
-- After catalog RLS ONLY: SELECT allowed, all these write privileges must be false.
select r.role_name,t.table_name,has_table_privilege(r.role_name,'public.'||t.table_name,'SELECT') can_select,
 has_table_privilege(r.role_name,'public.'||t.table_name,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') any_write_privilege
from (values ('anon'),('authenticated')) r(role_name) cross join (values ('games'),('game_roles')) t(table_name);
