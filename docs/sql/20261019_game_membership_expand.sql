-- Additive expand only. Review/apply against explicit project xjwugbbrqpwnenmlrkdh (DEV).
-- No backfill, catalog privilege changes, or legacy writes occur during installation.
begin;
set local lock_timeout = '5s';

alter table public.games add column if not exists profile_field_config jsonb not null default '{}'::jsonb;
alter table public.game_roles add column if not exists is_active boolean not null default true;
create unique index if not exists game_roles_game_id_id_membership_key on public.game_roles(game_id,id);

create table if not exists public.member_game_profiles (
 member_id uuid not null references public.members(id) on delete cascade,
 game_id uuid not null references public.games(id) on delete restrict,
 ign text not null default '' check (length(ign)<=160),
 role_id uuid references public.game_roles(id) on delete restrict,
 role_label text not null default '' check (length(role_label)<=160),
 class_name text not null default '' check (length(class_name)<=160),
 server_name text not null default '' check (length(server_name)<=160),
 faction text not null default '' check (length(faction)<=160),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(member_id,game_id),
 foreign key(game_id,role_id) references public.game_roles(game_id,id) on delete restrict
);
create table if not exists public.game_memberships (
 member_id uuid not null references public.members(id) on delete cascade,
 game_id uuid not null references public.games(id) on delete restrict,
 status text not null check (status in ('interested','applying','accepted','inactive','left')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(member_id,game_id)
);
create table if not exists public.game_membership_events (
 id uuid primary key default gen_random_uuid(),
 -- RESTRICT intentionally preserves audit on attempted member/catalog deletion.
 member_id uuid not null references public.members(id) on delete restrict,
 game_id uuid not null references public.games(id) on delete restrict,
 actor_type text not null check (actor_type in ('member','admin')),
 actor_id text not null check (length(actor_id) between 1 and 160),
 action text not null check (action in ('interest','apply','withdraw','leave','set_status')),
 old_status text check (old_status in ('interested','applying','accepted','inactive','left')),
 new_status text not null check (new_status in ('interested','applying','accepted','inactive','left')),
 reason text check (length(reason)<=1000), created_at timestamptz not null default now()
);
create index if not exists game_memberships_roster_idx on public.game_memberships(game_id,status);
create index if not exists member_game_profiles_roster_idx on public.member_game_profiles(game_id,role_id);
create index if not exists game_membership_events_pair_idx on public.game_membership_events(member_id,game_id,created_at);
alter table public.member_game_profiles enable row level security;
alter table public.game_memberships enable row level security;
alter table public.game_membership_events enable row level security;
revoke all on public.member_game_profiles,public.game_memberships,public.game_membership_events from public,anon,authenticated;
grant select,insert,update,delete on public.member_game_profiles,public.game_memberships to service_role;
grant select,insert on public.game_membership_events to service_role;
revoke update,delete,truncate on public.game_membership_events from service_role;

-- Private service-only helpers. Matching is case/punctuation insensitive, not fuzzy.
create or replace function public.game_membership_key(p_value text) returns text
language sql immutable security invoker set search_path = pg_catalog,public
as $$ select regexp_replace(lower(coalesce(p_value,'')),'[^a-z0-9]','','g') $$;
create or replace function public.game_membership_aliases(p_name text,p_display text,p_slug text) returns text[]
language sql immutable security invoker set search_path = pg_catalog,public
as $$ select array[p_name,p_display,p_slug] || case
 when public.game_membership_key(p_name)='wherewindsmeet' or public.game_membership_key(p_slug)='wherewindsmeet' then array['WWM']
 when public.game_membership_key(p_name)='leagueoflegends' or public.game_membership_key(p_slug)='leagueoflegends' then array['LoL','League']
 when public.game_membership_key(p_name)='teamfighttactics' or public.game_membership_key(p_slug)='teamfighttactics' then array['TFT']
 when public.game_membership_key(p_name)='marvelrivals' or public.game_membership_key(p_slug)='marvelrivals' then array['MR']
 else array[]::text[] end $$;
create or replace function public.game_membership_is_riot(p_group text,p_name text,p_slug text) returns boolean
language sql immutable security invoker set search_path = pg_catalog,public
as $$ select lower(coalesce(p_group,''))='riot' or public.game_membership_key(p_name) in ('valorant','leagueoflegends','teamfighttactics','lol','tft') or public.game_membership_key(p_slug) in ('valorant','leagueoflegends','teamfighttactics','lol','tft') $$;

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
  v_role:=r.role_name;
 end if;
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
 if riot and v_ign !~ '^[^#[:cntrl:]]{3,16}#[[:alnum:]]{3,5}$' then
  raise exception 'Riot ID must be name (3-16 characters)#tagline (3-5 alphanumeric characters)' using errcode='22023';
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
 if p_actor_type='admin' and not exists(select 1 from public.admin_accounts where username=p_actor_id) then
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

revoke all on function public.game_membership_key(text), public.game_membership_aliases(text,text,text),public.game_membership_is_riot(text,text,text),
 public.save_member_game_profile(uuid,uuid,text,uuid,text,text,text,text[]), public.change_game_membership(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.game_membership_key(text), public.game_membership_aliases(text,text,text),public.game_membership_is_riot(text,text,text),
 public.save_member_game_profile(uuid,uuid,text,uuid,text,text,text,text[]), public.change_game_membership(uuid,uuid,text,text,text,text,text) to service_role;
commit;
