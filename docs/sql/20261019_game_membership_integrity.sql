-- FORWARD integrity migration: expand was already applied as 20261019063253.
-- Apply only to reviewed DEV. No backfill, data rewrite, or catalog grants here.
-- Apply before deploying the RPC callers; then run the rollback-only verify file.
begin;
set local lock_timeout = '5s';

-- Validate the complete catalog configuration, not just values supplied by one client.
create or replace function public.game_membership_validate_field_config(p_config jsonb) returns void
language plpgsql immutable security invoker set search_path = pg_catalog,public
as $$
declare k text; field jsonb; option_value jsonb; seen text[]; option_text text;
begin
 if p_config is null or jsonb_typeof(p_config)<>'object' then
  raise exception 'Profile field configuration must be an object' using errcode='22023';
 end if;
 for k,field in select key,value from jsonb_each(p_config) loop
  if k not in ('class','server','faction') or jsonb_typeof(field)<>'object' then
   raise exception 'Unknown profile field configuration' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_object_keys(field) x where x not in ('enabled','label','kind','options'))
    or jsonb_typeof(field->'enabled') is distinct from 'boolean'
    or jsonb_typeof(field->'label') is distinct from 'string'
    or coalesce(length(btrim(field->>'label')),0) not between 1 and 60
    or coalesce(field->>'kind','') not in ('text','select')
    or jsonb_typeof(field->'options') is distinct from 'array' then
   raise exception 'Invalid profile field configuration for %',k using errcode='22023';
  end if;
  if (field->>'label') ~ '[[:cntrl:]]' or (field->>'label') ~ U&'[\0080-\009F\2028\2029]'
    or jsonb_array_length(field->'options')>100 then
   raise exception 'Invalid field label or option count' using errcode='22023';
  end if;
  seen:=array[]::text[];
  for option_value in select value from jsonb_array_elements(field->'options') loop
   option_text:=btrim(option_value #>> '{}');
   if jsonb_typeof(option_value)<>'string' or coalesce(length(option_text),0) not between 1 and 80
     or option_text=any(seen) or option_text ~ '[[:cntrl:]]' or option_text ~ U&'[\0080-\009F\2028\2029]' then
    raise exception 'Invalid or duplicate field option' using errcode='22023';
   end if;
   seen:=array_append(seen,option_text);
  end loop;
  if (field->>'enabled')::boolean and field->>'kind'='select' and cardinality(seen)=0 then
   raise exception 'Enabled select requires options' using errcode='22023';
  end if;
 end loop;
end $$;

create or replace function public.save_member_game_profile(
 p_member_id uuid,p_game_id uuid,p_ign text,p_role_id uuid,p_class_name text,
 p_server_name text,p_faction text,p_legacy_keys text[]
) returns public.member_game_profiles
language plpgsql security invoker set search_path = pg_catalog,public
as $$
declare
 g public.games%rowtype; oldp public.member_game_profiles%rowtype; result public.member_game_profiles%rowtype;
 legacy public.member_profiles%rowtype; r public.game_roles%rowtype;
 v_ign text:=btrim(coalesce(p_ign,'')); v_role text:=''; vals text[]; prev text[];
 field_keys text[]:=array['class','server','faction']; cfg jsonb; i integer;
 aliases text[]; k text; main_matches boolean; riot boolean; identities jsonb;
begin
 -- Whole-member lock serializes both RPCs across pairs and shared Riot identity writes.
 perform 1 from public.members where id=p_member_id for update;
 if not found then raise exception 'Member not found' using errcode='22023'; end if;
 select * into g from public.games where id=p_game_id for share;
 if not found or not g.is_active then raise exception 'Active game required' using errcode='22023'; end if;
 select * into oldp from public.member_game_profiles where member_id=p_member_id and game_id=p_game_id for update;
 select * into legacy from public.member_profiles where member_id=p_member_id for update;
 if not found then raise exception 'Legacy member profile required' using errcode='22023'; end if;
 if length(v_ign)>160 or cardinality(p_legacy_keys)>32 then raise exception 'Input too long' using errcode='22023'; end if;
 if v_ign='' and exists(select 1 from public.game_memberships where member_id=p_member_id and game_id=p_game_id and status in ('accepted','applying')) then
  raise exception 'IGN required for applying/accepted membership' using errcode='22023';
 end if;
 if p_role_id is not null then
  select * into r from public.game_roles where id=p_role_id and game_id=p_game_id for share;
  if not found or (not r.is_active and p_role_id is distinct from oldp.role_id) then raise exception 'Invalid or retired game role' using errcode='22023'; end if;
  v_role:=case when not r.is_active and p_role_id=oldp.role_id then oldp.role_label else r.role_name end;
 elsif oldp.role_id is null then
  -- Imported legacy labels need not have a catalog role. A no-op save retains them.
  v_role:=coalesce(oldp.role_label,'');
 end if;
 perform public.game_membership_validate_field_config(g.profile_field_config);
 vals:=array[btrim(coalesce(p_class_name,'')),btrim(coalesce(p_server_name,'')),btrim(coalesce(p_faction,''))];
 prev:=array[coalesce(oldp.class_name,''),coalesce(oldp.server_name,''),coalesce(oldp.faction,'')];
 for i in 1..3 loop
  cfg:=g.profile_field_config->field_keys[i];
  if coalesce(cfg->>'enabled','false')<>'true' then vals[i]:=prev[i];
  elsif length(vals[i])>160 then raise exception 'Optional field too long' using errcode='22023';
  elsif cfg->>'kind'='select' and vals[i]<>'' and vals[i] is distinct from prev[i]
    and not coalesce((cfg->'options') ? vals[i],false) then
   raise exception 'Invalid selection for %',field_keys[i] using errcode='22023';
  end if;
 end loop;
 riot:=public.game_membership_is_riot(g.identity_group,g.name,g.slug);
 if riot and v_ign='' and exists(
  select 1 from public.game_memberships gm join public.games rg on rg.id=gm.game_id
  where gm.member_id=p_member_id and gm.status in ('accepted','applying')
   and public.game_membership_is_riot(rg.identity_group,rg.name,rg.slug)
 ) then
  raise exception 'Shared Riot ID required by an applying/accepted membership' using errcode='22023';
 end if;
 if riot and v_ign<>'' and (
  length(v_ign)-length(replace(v_ign,'#',''))<>1
  or length(btrim(split_part(v_ign,'#',1))) not between 3 and 16
  or length(btrim(split_part(v_ign,'#',2))) not between 3 and 6
 ) then
  raise exception 'Riot ID must be name (3-16 characters)#tagline (3-6 characters)' using errcode='22023';
 end if;
 if v_ign ~ '[[:cntrl:]]' or v_ign ~ U&'[\0080-\009F\2028\2029]' then
  raise exception 'IGN cannot contain control characters' using errcode='22023';
 end if;
 aliases:=public.game_membership_aliases(g.name,g.display_name,g.slug);
 -- Never trust caller-supplied arbitrary JSON keys: each must be a known alias for this game.
 foreach k in array coalesce(p_legacy_keys,array[]::text[]) loop
  if length(k)>160 or not exists(select 1 from unnest(aliases) a where public.game_membership_key(a)=public.game_membership_key(k)) then
   raise exception 'Unknown legacy alias' using errcode='22023';
  end if;
 end loop;
 main_matches:=exists(select 1 from unnest(aliases) a where public.game_membership_key(a)=public.game_membership_key(legacy.main_game));
 -- Reject ambiguous catalog aliases rather than writing identities belonging to a different title.
 if exists(select 1 from public.games other_game,unnest(public.game_membership_aliases(other_game.name,other_game.display_name,other_game.slug)) a
   where other_game.id<>g.id and exists(select 1 from unnest(aliases) b where public.game_membership_key(a)=public.game_membership_key(b))) then
  raise exception 'Ambiguous catalog aliases' using errcode='22023';
 end if;
 identities:=case when jsonb_typeof(legacy.game_identities)='object' then legacy.game_identities else '{}'::jsonb end;
 -- Preserve all unrelated JSON keys, update existing equivalent spellings, and add known aliases.
 for k in select jsonb_object_keys(identities) loop
  if exists(select 1 from unnest(aliases) a where public.game_membership_key(a)=public.game_membership_key(k)) then
   identities:=jsonb_set(identities,array[k],to_jsonb(v_ign),true);
  elsif riot and exists(select 1 from public.games rg,unnest(public.game_membership_aliases(rg.name,rg.display_name,rg.slug)) a
    where public.game_membership_is_riot(rg.identity_group,rg.name,rg.slug) and public.game_membership_key(a)=public.game_membership_key(k)) then
   identities:=jsonb_set(identities,array[k],to_jsonb(v_ign),true);
  end if;
 end loop;
 foreach k in array aliases || coalesce(p_legacy_keys,array[]::text[]) loop
  identities:=jsonb_set(identities,array[k],to_jsonb(v_ign),true);
 end loop;
 insert into public.member_game_profiles(member_id,game_id,ign,role_id,role_label,class_name,server_name,faction)
 values(p_member_id,p_game_id,v_ign,p_role_id,v_role,vals[1],vals[2],vals[3])
 on conflict(member_id,game_id) do update set ign=excluded.ign,role_id=excluded.role_id,role_label=excluded.role_label,
 class_name=excluded.class_name,server_name=excluded.server_name,faction=excluded.faction,updated_at=now()
 returning * into result;
 if riot then
  update public.member_game_profiles gp set ign=v_ign,updated_at=now() from public.games rg
  where gp.member_id=p_member_id and gp.game_id=rg.id and rg.id<>p_game_id
   and public.game_membership_is_riot(rg.identity_group,rg.name,rg.slug);
 end if;
 update public.member_profiles set game_identities=identities,
  main_role=case when main_matches then v_role else main_role end,
  ingame_display_name=case when main_matches and not riot then v_ign else ingame_display_name end,
  valorant_game_name=case when riot then split_part(v_ign,'#',1) else valorant_game_name end,
  valorant_tagline=case when riot then split_part(v_ign,'#',2) else valorant_tagline end,
  updated_at=now() where member_id=p_member_id;
 return result;
end $$;

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
  if coalesce(btrim(saved_ign),'')='' then raise exception 'Save a nonblank IGN first' using errcode='22023'; end if;
 end if;
 if oldm.status=target then return oldm; end if;
 insert into public.game_memberships(member_id,game_id,status) values(p_member_id,p_game_id,target)
 on conflict(member_id,game_id) do update set status=excluded.status,updated_at=now() returning * into result;
 insert into public.game_membership_events(member_id,game_id,actor_type,actor_id,action,old_status,new_status,reason)
 values(p_member_id,p_game_id,p_actor_type,p_actor_id,p_action,oldm.status,target,nullif(btrim(p_reason),''));
 return result;
end $$;

-- General forms are preference-only. Deprecated game inputs are deliberately not
-- accepted. Never reconstruct protected fields from a browser snapshot or JS pre-read.
-- This same members row lock serializes preference, per-game save and transitions.
create or replace function public.update_member_profile_preferences(
 p_member_id uuid,p_display_name text,p_headline text,p_bio text,p_main_game text,p_region text,p_is_public boolean
) returns public.member_profiles
language plpgsql security invoker set search_path = pg_catalog,public
as $$
declare
 legacy public.member_profiles%rowtype; result public.member_profiles%rowtype;
 target_game public.games%rowtype; target_profile public.member_game_profiles%rowtype;
 target_count integer; preference text:=nullif(btrim(p_main_game),''); same_preference boolean;
 target_role text; target_ign text;
begin
 perform 1 from public.members where id=p_member_id for update;
 if not found then raise exception 'Member not found' using errcode='22023'; end if;
 select * into legacy from public.member_profiles where member_id=p_member_id for update;
 if not found then raise exception 'Legacy member profile required' using errcode='22023'; end if;
 -- Blank/null and unknown saved preferences remain supported; do not coerce to a catalog title.
 same_preference:=coalesce(preference,'')=coalesce(legacy.main_game,'');
 select count(*) into target_count from public.games g where exists(
  select 1 from unnest(public.game_membership_aliases(g.name,g.display_name,g.slug)) a
  where public.game_membership_key(a)=public.game_membership_key(preference));
 if target_count>1 and not same_preference then raise exception 'Ambiguous main game preference' using errcode='22023'; end if;
 if target_count=1 then
  select * into target_game from public.games g where exists(
   select 1 from unnest(public.game_membership_aliases(g.name,g.display_name,g.slug)) a
   where public.game_membership_key(a)=public.game_membership_key(preference)) for share;
  same_preference:=same_preference or exists(
   select 1 from unnest(public.game_membership_aliases(target_game.name,target_game.display_name,target_game.slug)) a
   where public.game_membership_key(a)=public.game_membership_key(legacy.main_game));
  select * into target_profile from public.member_game_profiles
   where member_id=p_member_id and game_id=target_game.id;
 end if;
 if target_profile.member_id is not null then
  target_role:=target_profile.role_label;
  target_ign:=case when public.game_membership_is_riot(target_game.identity_group,target_game.name,target_game.slug)
   then null else target_profile.ign end;
 elsif same_preference then
  -- Preserve unimportable legacy snapshots on an ordinary profile edit.
  target_role:=legacy.main_role; target_ign:=legacy.ingame_display_name;
 else
  -- A previous game's role/name must never be attributed to the new preference.
  target_role:=''; target_ign:=null;
 end if;
 update public.member_profiles set
  display_name=p_display_name,headline=p_headline,bio=p_bio,region=p_region,is_public=p_is_public,
  main_game=preference,main_role=target_role,ingame_display_name=target_ign,updated_at=now()
 where member_id=p_member_id returning * into result;
 -- No identity JSON/Riot columns, per-game rows, memberships, or events are written.
 return result;
end $$;

revoke all on function public.game_membership_validate_field_config(jsonb),
 public.update_member_profile_preferences(uuid,text,text,text,text,text,boolean),
 public.save_member_game_profile(uuid,uuid,text,uuid,text,text,text,text[]),
 public.change_game_membership(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.game_membership_validate_field_config(jsonb),
 public.update_member_profile_preferences(uuid,text,text,text,text,text,boolean),
 public.save_member_game_profile(uuid,uuid,text,uuid,text,text,text,text[]),
 public.change_game_membership(uuid,uuid,text,text,text,text,text) to service_role;
commit;
