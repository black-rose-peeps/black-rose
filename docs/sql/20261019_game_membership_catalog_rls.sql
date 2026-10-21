-- Apply after trusted server catalog CRUD/admin login is deployed and SESSION_SECRET is set.
-- Preserve public SELECT including inactive titles/roles for existing catalog readers.
begin;
set local lock_timeout = '5s';
alter table public.games enable row level security;
alter table public.game_roles enable row level security;
alter table public.admin_accounts enable row level security;
revoke all on public.games,public.game_roles,public.admin_accounts from public,anon,authenticated;
-- Table-level revocation does not remove column-level grants. Remove those too.
do $$ declare r record; begin
 for r in select table_name,column_name,grantee from information_schema.column_privileges
  where table_schema='public' and table_name in ('games','game_roles','admin_accounts')
    and grantee in ('PUBLIC','anon','authenticated') loop
  execute format('revoke all (%I) on public.%I from %s',r.column_name,r.table_name,
   case when r.grantee='PUBLIC' then 'PUBLIC' else quote_ident(r.grantee) end);
 end loop;
 -- Drop catalog write/ALL policies; remove stale active-only reads in favor of explicit catalog policy.
 for r in select tablename,policyname from pg_policies where schemaname='public' and tablename in ('games','game_roles') loop
  execute format('drop policy %I on public.%I',r.policyname,r.tablename);
 end loop;
end $$;
grant select on public.games,public.game_roles to anon,authenticated;
grant select,insert,update,delete on public.games,public.game_roles to service_role;
grant select,insert,update,delete on public.admin_accounts to service_role;
-- These legacy boolean RPCs are no longer browser authentication. Only the
-- server login endpoint may check passwords and issue a signed HttpOnly cookie.
revoke all on function public.verify_admin_login(text,text),public.verify_admin_session(text),public.create_admin_account(text,text) from public,anon,authenticated;
grant execute on function public.verify_admin_login(text,text),public.verify_admin_session(text) to service_role;
create policy games_public_catalog_select on public.games for select to anon,authenticated using (true);
create policy game_roles_public_catalog_select on public.game_roles for select to anon,authenticated using (true);
commit;
