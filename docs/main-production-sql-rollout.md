# Main/Prod: SQL to apply before releasing this branch

> Current feature branch: `feat/game-membership-workspace` (renamed from `work/local-development`). Older verification documents retain the earlier branch name as historical context.

> **Goal:** i-apply sa Main/Prod ang final database changes na ginawa sa Dev, then deploy the matching application code. This is not a Dev database export. **Do not run every SQL file in `docs/sql/`.**
>
> **Production target:** `efchfvreaotskrdlweze` — verify this project reference in the dashboard address bar before opening SQL Editor. **Verified Dev:** `xjwugbbrqpwnenmlrkdh` / `blackrose-testing-dev`. Production was not connected to or inspected for this guide.

## 1. Short answer: these five migrations

Open each linked SQL file, copy **its entire contents**, and run it as a separate SQL Editor execution. Run only after the safeguards below pass. Do not paste Markdown into SQL Editor. Stop on the first error; do not continue or replay from the beginning blindly.

| Order | Complete SQL file                                                                                                      | Verified applied Dev version | What it changes                                                                                                                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [20261019_game_membership_expand.sql](sql/20261019_game_membership_expand.sql)                                         | `20261019063253`             | Adds `games.profile_field_config`, `game_roles.is_active`, the three game profile/membership/event tables, indexes, foreign keys and private RPCs/helpers.                                                    |
| 2     | [20261019_game_membership_integrity.sql](sql/20261019_game_membership_integrity.sql)                                   | `20261019120120`             | Replaces the initial RPC implementations with the final integrity/actor/identity rules, field-config validation and legacy profile-preference writer.                                                         |
| 3     | [20261019_game_membership_catalog_rls.sql](sql/20261019_game_membership_catalog_rls.sql)                               | `20261019120303`             | Tightens catalog/admin permissions and legacy admin RPC access. **Breaking for the old browser-only admin login/catalog writers; see maintenance requirement.**                                               |
| 4     | [20261019120817_game_membership_backfill_dev_applied.sql](sql/20261019120817_game_membership_backfill_dev_applied.sql) | `20261019120817`             | Exact recovered Dev backfill: imports eligible **production legacy identities into production game profiles**, without overwriting existing pairs or creating memberships/events. **Pass §4 before running.** |
| 5     | [20261019_game_workspace_preferences.sql](sql/20261019_game_workspace_preferences.sql)                                 | `20261019161848`             | Adds independent `set_member_main_game` and `update_member_profile_details` RPCs. Required by the current My Games and Edit Profile code.                                                                     |

This is the **actual Dev application order**, including catalog RLS before backfill. The pre-deployment path below uses a maintenance window to make that order usable before the new code is live. There are four schema/security migrations and one real data-import migration; the backfill creates no additional permanent schema.

**Dev/Preview already has these migrations.** Do not rerun them there merely because this local work is merged into Develop. Main/Prod needs its own reviewed application of the delta; Git merges do not move database schema or data between projects.

### Important: one local backfill file differs from applied history

`sql/20261019_game_membership_backfill.sql` was subsequently hardened locally. Compared with Dev migration `20261019120817`, it adds member-row locking, shared-Riot conflict detection, control-character checks and a different Riot-tag rule. **It is not the exact SQL recorded as applied on Dev.**

For your request to reproduce what was actually run, step 4 links a separately recovered snapshot, `20261019120817_game_membership_backfill_dev_applied.sql`. Its complete statement, excluding the final file newline, has MD5 **`b202b5ec7785720770cb2f1787ccf0ca`**, identical to Dev's stored statement. Existing source/evidence files were not silently rewritten.

The exact historical import is less defensive than the hardened local candidate. This is why §4 is a release gate rather than a claim that old import SQL is safe for arbitrary production data. **Do not run both backfill variants.** If the gate finds conflicts, stop and review/rehearse the hardened candidate separately; it has not been applied or data-rehearsed during this read-only audit. Skipping the import leaves the schema installed but does not reproduce Dev's imported game profiles; make that a deliberate release decision, not an unnoticed omission.

## 2. Before running them: maintenance and runtime configuration

### Recommended for “all SQL first, merge Main afterward”

1. Verify the production project reference above, existing schema and backup/restore capability. Save a production backup/recovery point and record the preflight outputs below. A backup must have an understood restore path.
2. Establish a real **write freeze/maintenance window** through application deployment and smoke checks. Stop old browser/server writers and coordinate any bot/Worker/job writing the affected data. A banner alone does not stop old tabs or direct calls. Do not run real verification-sync tests against an unverified shared Worker target.
3. Run preflight, SQL 1–2, the backfill gate, then SQL 3–5, individually. Each migration already contains `BEGIN`, `COMMIT` and a five-second lock timeout. Do not wrap all five in another transaction or assume they are one atomic release. A later failure leaves earlier committed files installed. The historical backfill does not take the member locks added to the newer local candidate; the write freeze is required.
4. Run postflight and preservation checks before reopening writes. Configure the production runtime, then merge/deploy the complete compatible application while maintenance remains in place.
5. Refresh and sign in again as member/admin; verify saves, catalog management and manual acceptance. Reopen traffic only after these checks pass.

**Do not apply step 3 early to a live old application and expect its admin features to keep working.** It revokes browser access to `admin_accounts` and the old admin login/session RPCs, removes catalog write grants and replaces games/game_roles policies. Existing public catalog SELECT is retained, including inactive rows needed by historical readers.

If you cannot freeze writes, use the staged cutover in [game-membership-deployment.md](game-membership-deployment.md): install expand/integrity/workspace RPCs and coordinate the backfill with old writers; deploy and verify protected server login/catalog writers **before** applying catalog RLS. That is a different operational order, not permission to run all five early against live incompatible clients. Neither path has been rehearsed against this production database.

### Required settings — not SQL

Configure these in the **production deployment environment**, not in SQL or a committed file:

- `SESSION_SECRET`: random, server-only, at least 32 characters; stable across instances and different from Dev. Do not prefix it with `VITE_`. Rotation invalidates signed sessions.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: production project and its public/browser credential.
- `SUPABASE_SERVICE_ROLE_KEY`: the matching production server credential, never exposed through `VITE_` or browser code.
- If `SUPABASE_URL` is also configured, keep it consistent: the current server client prefers `VITE_SUPABASE_URL`. A correct fallback does not override a stale Dev Vite URL.
- Retain the real production Discord OAuth/HTTPS/same-origin configuration. Old localStorage flags are not upgraded into signed sessions: existing users and admins must refresh and re-login.

If merging Main automatically deploys, configure these and finish the SQL/postflight **before that deployment is exposed**. Rebuild for production; do not upload a Dev-bound local build. SQL alone cannot supply these runtime requirements.

## 3. Read-only production preflight

Run these in the **verified production SQL Editor**, save the results, and resolve unexpected output before migrations. They only inspect schema or return aggregate hashes/counts; no member details or credentials are selected.

Run each fenced SQL block separately so you see every result. SQL Editor/tools may show only the last result set if several SELECTs are pasted together.

### A. Existing tables, columns and legacy admin RPCs

The first query must return **zero rows**. New columns/tables from this release are intentionally not listed as pre-existing requirements.

```sql
with required(table_name, column_name) as (
  values
    ('members','id'), ('members','status'),
    ('member_profiles','member_id'), ('member_profiles','display_name'),
    ('member_profiles','headline'), ('member_profiles','bio'),
    ('member_profiles','region'), ('member_profiles','is_public'),
    ('member_profiles','main_game'), ('member_profiles','main_role'),
    ('member_profiles','ingame_display_name'), ('member_profiles','game_identities'),
    ('member_profiles','valorant_game_name'), ('member_profiles','valorant_tagline'),
    ('member_profiles','updated_at'),
    ('games','id'), ('games','name'), ('games','display_name'),
    ('games','slug'), ('games','is_active'), ('games','identity_group'),
    ('game_roles','id'), ('game_roles','game_id'), ('game_roles','role_name'),
    ('admin_accounts','id'), ('admin_accounts','username'), ('admin_accounts','password_hash')
)
select r.table_name, r.column_name as missing_column
from required r
left join information_schema.columns c
  on c.table_schema='public' and c.table_name=r.table_name and c.column_name=r.column_name
where c.column_name is null
order by r.table_name,r.column_name;
```

Review types: IDs below must be UUID; `game_identities` must be JSONB. Other listed values are expected to match the existing application's boolean/text fields. A names-only check is not proof of type/constraint compatibility.

```sql
select table_name,column_name,data_type,udt_name
from information_schema.columns
where table_schema='public' and (
  (table_name in ('members','games','game_roles','admin_accounts') and column_name='id')
  or (table_name='game_roles' and column_name='game_id')
  or (table_name='member_profiles' and column_name in ('member_id','game_identities'))
)
order by table_name,column_name;
```

```sql
select signature,to_regprocedure(signature) as existing_function
from (values
  ('public.verify_admin_login(text,text)'),
  ('public.verify_admin_session(text)'),
  ('public.create_admin_account(text,text)')
) required(signature);
```

All three functions must resolve, or catalog RLS will fail. Inspect their current signatures/security and existing catalog/admin policies before approving replacement. If new release objects already exist, compare their definitions/history first; `IF NOT EXISTS` does not reconcile incompatible schema. SQL Editor runs require an authorized administrator capable of these DDL/grant operations, not `anon`.

### B. Save original production data fingerprints

Run this **before** and **after** the migrations while writes remain frozen. Counts/hashes must match for these original tables. The two additive catalog columns are excluded so adding their defaults does not create a false mismatch. Use production's own baseline, not Dev's historical 261-member/10-game counts.

```sql
select 'members' as object_name,count(*) as row_count,
  md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by t.id::text),'')) as original_data_md5
from public.members t
union all
select 'member_profiles',count(*),
  md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by t.member_id::text),''))
from public.member_profiles t
union all
select 'games',count(*),
  md5(coalesce(string_agg(md5((to_jsonb(t)-'profile_field_config')::text),'' order by t.id::text),''))
from public.games t
union all
select 'game_roles',count(*),
  md5(coalesce(string_agg(md5((to_jsonb(t)-'is_active')::text),'' order by t.id::text),''))
from public.game_roles t;
```

Also preserve schema/grant snapshots and the backup. These aggregate checks are not a replacement for either. Unexpected differences must be investigated; do not overwrite production with a Dev dump to force a match.

## 4. Backfill gate — after SQL 1–2, before SQL 3–4

This read-only query examines production legacy values using the installed matching helpers. It is conservative: **`conflicting_shared_riot_members` and `control_character_candidate_pairs` must be zero** before replaying the less-defensive historical backfill. Review other skips; do not delete/clear source identities to make the report look clean.

```sql
with aliases as (
  select distinct g.id game_id, public.game_membership_key(a) alias_key
  from public.games g
  cross join lateral unnest(public.game_membership_aliases(g.name,g.display_name,g.slug)) a
), sources as (
  select mp.member_id,e.key source_key,btrim(e.value #>> '{}') ign,'explicit'::text source
  from public.member_profiles mp
  cross join lateral jsonb_each(
    case when jsonb_typeof(mp.game_identities)='object' then mp.game_identities else '{}'::jsonb end
  ) e
  where jsonb_typeof(e.value)='string' and btrim(e.value #>> '{}')<>''
  union all
  select mp.member_id,mp.main_game,
    case when public.game_membership_is_riot(g.identity_group,g.name,g.slug)
      then btrim(coalesce(mp.valorant_game_name,''))||'#'||btrim(coalesce(mp.valorant_tagline,''))
      else btrim(mp.ingame_display_name) end,'main'
  from public.member_profiles mp
  join aliases a on a.alias_key=public.game_membership_key(mp.main_game)
  join public.games g on g.id=a.game_id
  where (select count(distinct x.game_id) from aliases x where x.alias_key=a.alias_key)=1
    and case when public.game_membership_is_riot(g.identity_group,g.name,g.slug)
      then btrim(coalesce(mp.valorant_game_name,''))<>'' and btrim(coalesce(mp.valorant_tagline,''))<>''
      else btrim(coalesce(mp.ingame_display_name,''))<>'' end
), resolved as (
  select s.*,a.game_id,
    (select count(distinct x.game_id) from aliases x where x.alias_key=public.game_membership_key(s.source_key)) matches
  from sources s left join aliases a on a.alias_key=public.game_membership_key(s.source_key)
), candidates as (
  select r.member_id,r.game_id,min(r.ign) ign,count(distinct r.ign) identity_count
  from resolved r where r.matches=1
    and (r.source='explicit' or not exists(
      select 1 from resolved e where e.member_id=r.member_id and e.game_id=r.game_id
        and e.source='explicit' and e.matches=1
    ))
  group by r.member_id,r.game_id
), riot_values as (
  select r.member_id,r.ign from resolved r join public.games g on g.id=r.game_id
  where r.matches=1 and public.game_membership_is_riot(g.identity_group,g.name,g.slug)
  union all
  select gp.member_id,btrim(gp.ign) from public.member_game_profiles gp
  join public.games g on g.id=gp.game_id
  where btrim(gp.ign)<>'' and public.game_membership_is_riot(g.identity_group,g.name,g.slug)
  union all
  select mp.member_id,btrim(mp.valorant_game_name)||'#'||btrim(mp.valorant_tagline)
  from public.member_profiles mp
  where btrim(coalesce(mp.valorant_game_name,''))<>'' and btrim(coalesce(mp.valorant_tagline,''))<>''
), riot_conflicts as (
  select member_id from riot_values group by member_id having count(distinct ign)>1
)
select
  (select count(*) from sources) as source_rows,
  (select count(*) from sources s where not exists(
    select 1 from aliases a where a.alias_key=public.game_membership_key(s.source_key)
  )) as unmatched_source_rows,
  (select count(*) from sources s where (
    select count(distinct a.game_id) from aliases a where a.alias_key=public.game_membership_key(s.source_key)
  )>1) as ambiguous_source_rows,
  (select count(*) from candidates where identity_count>1) as conflicting_identity_pairs,
  (select count(*) from riot_conflicts) as conflicting_shared_riot_members,
  (select count(*) from candidates where ign ~ '[[:cntrl:]]' or ign ~ U&'[\0080-\009F\2028\2029]') as control_character_candidate_pairs,
  (select count(*) from public.member_game_profiles) as profiles_before_import,
  (select count(*) from public.game_memberships) as memberships_before_import,
  (select count(*) from public.game_membership_events) as events_before_import;
```

When the gate passes, run SQL 3, then the exact historical backfill file in step 4 and save its `backfill_report`. It uses `ON CONFLICT DO NOTHING`: existing per-game profiles are not overwritten, source legacy columns remain unchanged, and memberships/events must retain their prior counts. Ambiguous/unmatched/invalid values stay in legacy data for manual review. The historical Riot rule accepts a narrower tag shape than the current profile editor, so valid newer-shaped values may be skipped rather than lost.

The import must use **production's own members and games**. Never substitute Dev UUIDs, import its 84/85 profile rows, or translate an IGN/Main Game into an Accepted membership.

Then apply SQL 5. Installing only expand/integrity is insufficient: the current application explicitly calls the two workspace RPCs.

## 5. Read-only postflight

First rerun §3B fingerprints. Then run these after all five steps.

### A. Required tables and RLS

Expect six existing tables with `rls_enabled=true`.

```sql
select required.table_name,c.oid is not null as exists,c.relrowsecurity as rls_enabled
from (values
  ('games'),('game_roles'),('admin_accounts'),
  ('member_game_profiles'),('game_memberships'),('game_membership_events')
) required(table_name)
left join pg_namespace n on n.nspname='public'
left join pg_class c on c.relnamespace=n.oid and c.relname=required.table_name
order by required.table_name;
```

### B. Required RPCs/helpers and browser denial

Expect nine rows: `exists=true`, `security_definer=false`, `anon_execute=false`, `authenticated_execute=false`, `service_execute=true` for every row.

```sql
select signature,p.oid is not null as exists,p.prosecdef as security_definer,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
from (values
  ('public.game_membership_key(text)'),
  ('public.game_membership_aliases(text,text,text)'),
  ('public.game_membership_is_riot(text,text,text)'),
  ('public.game_membership_validate_field_config(jsonb)'),
  ('public.save_member_game_profile(uuid,uuid,text,uuid,text,text,text,text[])'),
  ('public.change_game_membership(uuid,uuid,text,text,text,text,text)'),
  ('public.update_member_profile_preferences(uuid,text,text,text,text,text,boolean)'),
  ('public.set_member_main_game(uuid,uuid)'),
  ('public.update_member_profile_details(uuid,text,text,text,text,boolean)')
) required(signature)
left join pg_proc p on p.oid=to_regprocedure(signature)
order by signature;
```

### C. Table/column permissions and import totals

For `anon`/`authenticated`, catalog SELECT is true, admin/new-table SELECT is false, and table INSERT/UPDATE/DELETE are false. Service role keeps the required table access; events specifically allow SELECT/INSERT but not UPDATE/DELETE/TRUNCATE.

```sql
select r.role_name,t.table_name,
  has_table_privilege(r.role_name,'public.'||t.table_name,'SELECT') as can_select,
  has_table_privilege(r.role_name,'public.'||t.table_name,'INSERT') as can_insert,
  has_table_privilege(r.role_name,'public.'||t.table_name,'UPDATE') as can_update,
  has_table_privilege(r.role_name,'public.'||t.table_name,'DELETE') as can_delete,
  has_table_privilege(r.role_name,'public.'||t.table_name,'TRUNCATE') as can_truncate
from (values ('anon'),('authenticated'),('service_role')) r(role_name)
cross join (values
  ('games'),('game_roles'),('admin_accounts'),
  ('member_game_profiles'),('game_memberships'),('game_membership_events')
) t(table_name)
order by t.table_name,r.role_name;
```

```sql
-- Expect zero rows: no leftover browser write grants or admin column access.
select table_name,column_name,grantee,privilege_type
from information_schema.column_privileges
where table_schema='public' and grantee in ('PUBLIC','anon','authenticated')
  and ((table_name in ('games','game_roles') and privilege_type<>'SELECT')
    or table_name='admin_accounts');
```

```sql
select 'member_game_profiles' as object_name,count(*) as row_count from public.member_game_profiles
union all select 'game_memberships',count(*) from public.game_memberships
union all select 'game_membership_events',count(*) from public.game_membership_events;
```

The backfill may increase only `member_game_profiles`. Membership/event counts must equal their saved pre-import values; zero is expected only if they were previously empty. Inspect constraints/indexes and catalog/admin policies as well: privileges and counts alone do not prove every database invariant or authentication path.

## 6. What else in this branch needs SQL?

| Branch/local change group                                                                                                                | Database requirement                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Independent game profiles, Main Game, explicit membership, admin roster and configurable class/server/faction                            | The five steps above; no separate per-game seeds or replacement catalogs.                                                                              |
| Trusted member/admin sessions and protected game administration                                                                          | Runtime signing secret/server credentials plus the listed RPC/RLS changes; no separate session table migration.                                        |
| Accepted memberships on privacy-authorized public profiles; canonical `/br/{stored-slug}` and legacy redirects                           | Uses the new membership tables and existing stored slugs; no slug rewrite/backfill.                                                                    |
| Member directory filters, role/IGN matching, searchable controls, safe CSV exports                                                       | Existing member/catalog reads plus the new membership tables where applicable; no additional migration.                                                |
| Dashboard Overview / My Games / Teams order, profile save/discard/scroll guards, subtle three-identity expansion, consistent card sizing | Application changes only after the database prerequisites.                                                                                             |
| Active/inactive visibility, preserved saved information and historical team/tournament records                                           | Existing `games.is_active` and preserved catalog IDs; no additional migration or deletion.                                                             |
| Acceptance notifications, read/dedup state and deep links                                                                                | Uses `game_membership_events` with trusted server reads; no new notification table, browser policy or Realtime publication.                            |
| Team/tournament/championship/member read optimizations, navigation hubs, community event/Guild Code presentation                         | Existing schema; no additional migration.                                                                                                              |
| WoW Forever dedicated announcement page/countdown/embed and automatic community fallback                                                 | Application only; the intended game must exist and be active in production. No automatic Dev catalog copy or new game seed.                            |
| Discord-based automatic game acceptance | **Separate opt-in integration:** after the five foundation migrations, follow `discord-game-membership-automation.md` for the additional `20261021_discord_game_membership_expand.sql` then `20261022_discord_game_membership_observation_ordering.sql`, Dev evidence and explicit runtime/Worker deployment gates. Production remains unactivated. |

See [game-membership-deployment.md](game-membership-deployment.md), [game-workspace-redesign.md](game-workspace-redesign.md), [discord-game-membership-automation.md](discord-game-membership-automation.md) and the linked feature docs in [README.md](README.md) for detailed behavior.

### Do not run these as production migrations

- `20261019_game_membership_verify.sql` and `20261019_game_workspace_verify.sql`: synthetic write tests ending in rollback, **not read-only preflight and not required migrations**. The latter is explicitly Dev-only. Neither was executed during this audit.
- `disable_games_rls.sql`, permissive historical RLS fixes, catalog-population/seeding scripts, sample admin creation, unrelated older SQL, resets/truncation, or a Dev dump. These are not part of this release's delta and can contradict its security/preservation model.
- Both backfill variants, or expand again as a harmless health check. Expand temporarily reinstalls older RPC bodies; integrity must follow it. Already-existing objects/data require review, not blind replay.

## 7. Merge, smoke checks and recovery

- [ ] Save production backup, schema/grant snapshots, preflight outputs, per-file execution results and backfill report.
- [ ] Confirm all required SQL and postflight succeeded; do not reopen old clients after an early RLS change.
- [ ] Ensure **all intended runtime, SQL, regression-test and glossary files** are included in the commit/merge, without `.env.local` or credentials. A merge does not include uncommitted files. The feature push now includes `tests/` and `GLOSSARY.md`; they are no longer intentionally ignored.
- [ ] Build/deploy with production configuration, not the Dev database or Dev-bound build. Main merge itself is not proof SQL or secrets have been applied.
- [ ] Re-login as real member/admin on the deployed HTTPS origin; test Edit Profile, independent Main Game/per-game saves, admin game edit, apply/manual acceptance and acceptance notification refresh. Browser fixtures do not substitute for these real-account checks.
- [ ] Verify private profiles remain private, inactive games disappear from current choices without erasing history, old member URLs redirect, and other overlay destinations remain intact.
- [ ] Keep Discord acceptance automation disabled unless its separate migration, environment checks and deployment/activation are approved. Follow `discord-game-membership-automation.md`; do not change the shared bot/Worker as an accidental part of a website release.

If a step fails, keep writes frozen, record the failing transaction and inspect what already committed. Retain additive schema and new data; prefer a reviewed forward fix or a compatible application rollback. An old browser-only admin binary is incompatible after catalog RLS. Do not reopen anonymous writes, drop membership tables, delete audit events, or blanket-delete imported profiles to undo the UI. Restoring a backup is a separately authorized recovery operation and can lose later writes.

### SQL Editor versus CLI migration tracking

This repository currently carries these reviewed SQL artifacts under `docs/sql/`. Running them manually in SQL Editor does **not** automatically reproduce Dev's `supabase_migrations.schema_migrations` records. Keep an operator execution log; do not insert fake history rows or later run an unchecked `supabase db push` against the same objects. If adopting CLI-managed migrations, first reconcile the actual target schema/history through a reviewed migration workflow. [Supabase's official migration guidance](https://supabase.com/docs/guides/deployment/database-migrations) explains this distinction. No CLI link, history repair, migration push or reset was performed here.

## 8. Evidence and scope of this guide

Verified **October 21, 2026**:

- Fresh fetch: `origin/main` and current HEAD `3453afe6bc82bbc43e17562ffc7997eb7b2d2712`; `origin/develop` `62c6bfb80e60c2f866f459cc8afe2e163167b283`. Main contains Develop's commits at this snapshot. Comparison included uncommitted/untracked application files, not just committed diffs. No merge, commit or push was performed.
- The management connector lists only Dev `xjwugbbrqpwnenmlrkdh`; production access/schema parity is **not established** by its dashboard URL.
- Dev migration history contains exactly the five versions in §1. Expand, integrity, catalog RLS and workspace SQL match applied statements after removing line comments/whitespace. The recovered historical backfill has the exact stored statement checksum noted above; the local hardened candidate does not match it.
- All nine current Dev RPC/helper bodies match the final repository definitions under the same comment/whitespace comparison. Their EXECUTE grants are service-only, their security mode is invoker, and RLS is enabled on all six relevant tables.
- The new read-only gate ran successfully on current Dev: 103 source rows, two unmatched sources, zero ambiguous/conflicting identity pairs, zero shared-Riot conflicts and zero control-character candidate pairs. Its current data snapshot was 90 game profiles, six memberships and 18 events; these are **not** expected production totals or the historical first-backfill result. Required-column/type/admin-RPC and RLS/grant inspection also passed on Dev, including zero unexpected catalog/admin browser column grants.
- This task makes documentation/snapshot files only and runs read-only Dev inspection. It does not apply migrations/backfills, create test data, change settings/secrets, or contact production. Earlier local application QA recorded 278 passing tests and a successful build; that is not a production deployment rehearsal.

**Bottom line:** apply the reviewed five-step database delta with its backfill gate and maintenance/cutover requirements, configure production runtime values, then deploy the matching branch. Do not assume that copying arbitrary SQL or merging Git alone guarantees production readiness.
