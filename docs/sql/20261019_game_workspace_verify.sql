-- DEV-only behavioral rehearsal. Run the WHOLE file; every fixture write rolls back.
-- Requires game_workspace_preferences_20261019 and the prior membership migrations.
begin;
set local role service_role;
do $$
declare
 m uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); empty_game uuid:=gen_random_uuid();
 retired uuid:=gen_random_uuid(); riot uuid:=gen_random_uuid(); role_id uuid:=gen_random_uuid();
 alias_game uuid:=gen_random_uuid(); suffix text:=gen_random_uuid()::text;
 before_details jsonb; before_game_state jsonb; before_memberships jsonb;
 before_events bigint; saved public.member_profiles%rowtype;
begin
 insert into public.members(id,username,discord_username) values(m,'workspace-'||suffix,'workspace-'||suffix);
 insert into public.member_profiles(member_id,slug,display_name,headline,bio,region,is_public,main_game,main_role,ingame_display_name,game_identities)
 values(m,'workspace-'||suffix,'Before','Before headline','Before bio','SEA',false,'Unknown legacy game','Old role','Old IGN','{"unrelated":"keep"}');
 insert into public.games(id,name,slug,display_name,is_active) values
 (g,'workspace-'||suffix,'workspace-'||suffix,'workspace-'||suffix,true),
 (empty_game,'empty-'||suffix,'empty-'||suffix,'empty-'||suffix,true),
 (retired,'retired-'||suffix,'retired-'||suffix,'retired-'||suffix,false);
 insert into public.games(id,name,slug,display_name,is_active,identity_group)
 values(riot,'riot-'||suffix,'riot-'||suffix,'riot-'||suffix,true,'riot');
 insert into public.game_roles(id,game_id,role_name) values(role_id,g,'Healer');
 perform public.save_member_game_profile(m,g,'Hero',role_id,'','','',array[]::text[]);
 perform public.save_member_game_profile(m,riot,'Rose#123',null,'','','',array[]::text[]);
 perform public.change_game_membership(m,g,'interest','member',m::text,null,null);
 select jsonb_agg(to_jsonb(t) order by game_id) into before_game_state from public.member_game_profiles t where member_id=m;
 select jsonb_agg(to_jsonb(t) order by game_id) into before_memberships from public.game_memberships t where member_id=m;
 select count(*) into before_events from public.game_membership_events where member_id=m;
 select to_jsonb(t)-array['main_game','main_role','ingame_display_name','updated_at'] into before_details from public.member_profiles t where member_id=m;
 perform public.set_member_main_game(m,g);
 select * into saved from public.member_profiles where member_id=m;
 if saved.main_game is distinct from 'workspace-'||suffix or saved.main_role is distinct from 'Healer' or saved.ingame_display_name is distinct from 'Hero' then
  raise exception 'Canonical Main Game role/IGN projection failed';
 end if;
 if before_details is distinct from (select to_jsonb(t)-array['main_game','main_role','ingame_display_name','updated_at'] from public.member_profiles t where member_id=m) then
  raise exception 'Main Game save changed common details or identities';
 end if;
 perform public.update_member_profile_details(m,'Edited','New headline','New bio','PH',true);
 select * into saved from public.member_profiles where member_id=m;
 if saved.display_name<>'Edited' or saved.headline<>'New headline' or saved.bio<>'New bio' or saved.region<>'PH' or not saved.is_public
  or saved.main_game is distinct from 'workspace-'||suffix or saved.main_role is distinct from 'Healer' or saved.ingame_display_name is distinct from 'Hero' then
  raise exception 'Details-only write changed the independent preference or failed';
 end if;
 perform public.set_member_main_game(m,empty_game);
 if not exists(select 1 from public.member_profiles where member_id=m and main_game='empty-'||suffix and main_role='' and ingame_display_name is null) then
  raise exception 'Missing canonical profile inherited a different title role/IGN';
 end if;
 if exists(select 1 from public.member_game_profiles where member_id=m and game_id=empty_game) then
  raise exception 'Main Game preference invented participation';
 end if;
 perform public.set_member_main_game(m,riot);
 if not exists(select 1 from public.member_profiles where member_id=m and main_game='riot-'||suffix and main_role='' and ingame_display_name is null and valorant_game_name='Rose' and valorant_tagline='123') then
  raise exception 'Shared Riot preference projection or preservation failed';
 end if;
 begin perform public.set_member_main_game(m,retired); raise exception 'Expected inactive rejection';
 exception when invalid_parameter_value then null; end;
 begin perform public.set_member_main_game(m,gen_random_uuid()); raise exception 'Expected unknown game rejection';
 exception when invalid_parameter_value then null; end;
 begin perform public.set_member_main_game(gen_random_uuid(),g); raise exception 'Expected missing member rejection';
 exception when invalid_parameter_value then null; end;
 insert into public.games(id,name,slug,display_name,is_active)
 values(alias_game,'alias-'||suffix,'alias-'||suffix,'workspace-'||suffix,true);
 begin perform public.set_member_main_game(m,g); raise exception 'Expected ambiguous alias rejection';
 exception when invalid_parameter_value then null; end;
 perform public.set_member_main_game(m,null);
 if not exists(select 1 from public.member_profiles where member_id=m and main_game is null and main_role='' and ingame_display_name is null and display_name='Edited' and bio='New bio' and is_public) then
  raise exception 'Explicit preference clear failed or changed common details';
 end if;
 if before_game_state is distinct from (select jsonb_agg(to_jsonb(t) order by game_id) from public.member_game_profiles t where member_id=m)
  or before_memberships is distinct from (select jsonb_agg(to_jsonb(t) order by game_id) from public.game_memberships t where member_id=m)
  or before_events<>(select count(*) from public.game_membership_events where member_id=m) then
  raise exception 'Independent detail/preference writes changed game profiles, memberships or audit';
 end if;
 if has_function_privilege('anon','public.set_member_main_game(uuid,uuid)','execute')
  or has_function_privilege('authenticated','public.set_member_main_game(uuid,uuid)','execute')
  or has_function_privilege('anon','public.update_member_profile_details(uuid,text,text,text,text,boolean)','execute')
  or has_function_privilege('authenticated','public.update_member_profile_details(uuid,text,text,text,text,boolean)','execute') then
  raise exception 'Independent writers are executable by a browser role';
 end if;
end $$;
select jsonb_build_object('result','passed','scope','rollback-only synthetic workspace preferences','checks',jsonb_build_array(
 'canonical Main Game projection','common details preserved by Main Game writes','Main Game preserved by common detail writes',
 'no inferred profile or membership','Riot identity preserved','inactive/unknown/ambiguous game and missing member rejected',
 'explicit preference clear','game profiles/memberships/audit preserved','browser-role execution denied')) as workspace_behavior_verification;
rollback;
