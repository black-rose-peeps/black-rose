-- Allow team-captain roster audit entries (non-admin actors) for live tournament registrations.
-- Run in Supabase SQL Editor after deploying the app update.

create or replace function public.insert_admin_audit_log(
  p_actor_admin_username text,
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if nullif(trim(p_actor_admin_username), '') is null then
    raise exception 'actor_admin_username is required';
  end if;

  if nullif(trim(p_action), '') is null then
    raise exception 'action is required';
  end if;

  if nullif(trim(p_entity_type), '') is null then
    raise exception 'entity_type is required';
  end if;

  if trim(p_action) not in ('registration.roster_member_added', 'registration.roster_member_removed')
     and not exists (
    select 1
    from public.admin_accounts
    where lower(username) = lower(trim(p_actor_admin_username))
  ) then
    raise exception 'Unauthorized audit log actor';
  end if;

  insert into public.admin_audit_logs (
    actor_admin_username,
    action,
    entity_type,
    entity_id,
    metadata_json
  )
  values (
    lower(trim(p_actor_admin_username)),
    trim(p_action),
    trim(p_entity_type),
    nullif(trim(p_entity_id), ''),
    p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.insert_admin_audit_log(text, text, text, text, jsonb)
  to anon, authenticated;
