-- ADDITIVE FORWARD migration. Review/apply on authorized DEV only, before callers deploy.
-- Prerequisites: game membership expand + integrity migrations, including alias/Riot helpers.
-- Keeps the older combined preference RPC available for backward compatibility.
-- No backfill; no membership, identity, role-catalog, or per-game-profile writes.
-- Inactive games cannot be selected (even a no-op); existing stored preferences are
-- untouched until explicitly changed to an active game or cleared with SQL NULL.
-- Before rollout, verify in a rollback-only transaction: active/non-Riot and Riot
-- projections, missing canonical profiles, NULL clear, invalid/inactive/ambiguous
-- catalog rejection, preservation of all unrelated columns/rows, and service-only
-- EXECUTE grants. In two sessions, check serialization with save_member_game_profile,
-- change_game_membership, the legacy preference RPC, and these two new writers.
-- Update callers to update_member_profile_details before relying on independent
-- writes: an older caller of the combined preference RPC can still set Main Game.
begin;
set local lock_timeout = '5s';

create or replace function public.set_member_main_game(
 p_member_id uuid,p_game_id uuid
) returns void
language plpgsql security invoker set search_path = pg_catalog,public
as $$
declare
 legacy public.member_profiles%rowtype; g public.games%rowtype;
 saved public.member_game_profiles%rowtype; aliases text[];
 target_main text:=null; target_role text:=''; target_ign text:=null;
begin
 -- Match the whole-member lock used by all existing game/profile RPCs.
 perform 1 from public.members where id=p_member_id for update;
 if not found then raise exception 'Member not found' using errcode='22023'; end if;
 select * into legacy from public.member_profiles where member_id=p_member_id for update;
 if not found then raise exception 'Legacy member profile required' using errcode='22023'; end if;
 if p_game_id is not null then
  -- Recheck availability under a catalog lock; never rely on a server pre-read.
  select * into g from public.games where id=p_game_id for share;
  if not found or not g.is_active then raise exception 'Active game required' using errcode='22023'; end if;
  aliases:=public.game_membership_aliases(g.name,g.display_name,g.slug);
  -- UUID ownership is unambiguous, but legacy readers still resolve text aliases.
  -- Refuse projections which those readers could attribute to another title.
  if exists(select 1 from public.games other_game,unnest(public.game_membership_aliases(other_game.name,other_game.display_name,other_game.slug)) a
    where other_game.id<>g.id and exists(select 1 from unnest(aliases) b where public.game_membership_key(a)=public.game_membership_key(b))) then
   raise exception 'Ambiguous catalog aliases' using errcode='22023';
  end if;
  select * into saved from public.member_game_profiles
   where member_id=p_member_id and game_id=p_game_id;
  target_main:=g.name;
  -- Absence of a canonical profile clears projections, not somebody else's IGN/role.
  target_role:=coalesce(saved.role_label,'');
  target_ign:=case when public.game_membership_is_riot(g.identity_group,g.name,g.slug) then null else saved.ign end;
 end if;
 -- NULL explicitly clears the preference and both old preference projections.
 update public.member_profiles set
  main_game=target_main,main_role=target_role,ingame_display_name=target_ign,updated_at=now()
 where member_id=p_member_id;
end $$;

create or replace function public.update_member_profile_details(
 p_member_id uuid,p_display_name text,p_headline text,p_bio text,p_region text,p_is_public boolean
) returns public.member_profiles
language plpgsql security invoker set search_path = pg_catalog,public
as $$
declare result public.member_profiles%rowtype;
begin
 perform 1 from public.members where id=p_member_id for update;
 if not found then raise exception 'Member not found' using errcode='22023'; end if;
 perform 1 from public.member_profiles where member_id=p_member_id for update;
 if not found then raise exception 'Legacy member profile required' using errcode='22023'; end if;
 update public.member_profiles set
  display_name=p_display_name,headline=p_headline,bio=p_bio,region=p_region,is_public=p_is_public,updated_at=now()
 where member_id=p_member_id returning * into result;
 return result;
end $$;

revoke all on function public.set_member_main_game(uuid,uuid) from public,anon,authenticated;
revoke all on function public.update_member_profile_details(uuid,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.set_member_main_game(uuid,uuid) to service_role;
grant execute on function public.update_member_profile_details(uuid,text,text,text,text,boolean) to service_role;
commit;
