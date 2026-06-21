-- =============================================================================
-- Admin audit logs — run once in Supabase → SQL Editor
-- Tracks admin console actions (approvals, deletions, status changes, etc.)
-- =============================================================================

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_admin_username text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_action_idx
  on public.admin_audit_logs (action);

create index if not exists admin_audit_logs_entity_idx
  on public.admin_audit_logs (entity_type, entity_id);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admin console read audit logs" on public.admin_audit_logs;

create policy "Admin console read audit logs"
  on public.admin_audit_logs
  for select
  to anon, authenticated
  using (true);

-- Inserts only via RPC (not open INSERT policy)
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
