# Migrate production database to a new Supabase project

This guide documents how we moved the **live** Black Rose Arena database from the **old** production Supabase project into a **new, empty** Supabase project — then pointed `blackrose.asia` at the new database.

Use this when the current prod project (`qupypapvfdhzvmseolhi`) has accumulated schema drift, manual SQL patches, or you want a clean Supabase instance while **keeping all real member, team, and tournament data**.

> **Not the same as staging clone.** [SUPABASE_STAGING_CLONE.md](./SUPABASE_STAGING_CLONE.md) copies prod → a **dev** project for local/preview testing. This guide is a **production cutover** to a **new** Supabase project.

---

## Overview

| Role              | Supabase project                            | When to use                          |
| ----------------- | ------------------------------------------- | ------------------------------------ |
| **Old production** | `qupypapvfdhzvmseolhi` (Blackrose-Database) | Current live DB — source of the dump |
| **New production** | `efchfvreaotskrdlweze`                      | Target after cutover — restore dump here |
| **Staging / dev**  | `xjwugbbrqpwnenmlrkdh`                      | Unchanged — local + Vercel Preview   |

```text
                    ┌── Close prod site (no user writes) ──┐
                    ▼                                      │
Old prod DB  ──dump──►  supabase/backups/*.sql  ──restore──►  New prod DB (efchfvreaotskrdlweze)
                    │                                      │
                    └── Re-open prod after cutover ◄─────────┘
                              │
        Vercel Production (blackrose.asia) ── new Supabase URL/keys
        Cloudflare discord-sync Worker ──────── new SUPABASE_URL + secret
```

**Why we close prod first:** while `blackrose.asia` is live, members can register, join teams, update brackets, and the discord-sync Worker can change `members.status`. If we dump while users are still writing, the backup can miss rows created **after** the dump started — that is **data loss**. Closing the site **freezes** the old database at a known point in time so **all current user data** (members, teams, tournaments, registrations, brackets, profiles, admin accounts) is captured safely before restore.

**What gets copied:** tables, RLS, functions, triggers, publications, and all row data listed above.

**What does not copy automatically:**

- Vercel env vars — you update these at cutover
- Cloudflare Worker `SUPABASE_URL` + service role secret
- Discord OAuth redirect URLs — unchanged if `blackrose.asia` stays the same
- Storage bucket files — this app does not rely on Storage for core flows
- Supabase Auth `auth.users` — member login uses **custom Discord OAuth** + the `members` table, not Supabase Auth sessions

**Downtime:** the main prod website (`blackrose.asia`) stays **closed manually** for the whole maintenance window — from the moment you freeze writes until restore + cutover are verified. Plan **30–60 minutes** (dump, restore, env switch, smoke test). Members cannot use the site during this time; that is intentional so no user data is lost mid-migration.

---

## Prerequisites

Install and verify before starting:

| Tool                                                              | Purpose                        | Verify                     |
| ----------------------------------------------------------------- | ------------------------------ | -------------------------- |
| [Supabase CLI](https://supabase.com/docs/guides/cli)              | Dump from linked project       | `npx supabase --version`   |
| [Docker Desktop](https://docs.docker.com/desktop/)                | Required by `supabase db dump` | Docker running before dump |
| [PostgreSQL client](https://www.postgresql.org/download/windows/) | `psql` for restore             | `psql --version`           |
| Supabase login                                                    | CLI auth                       | `npx supabase login`       |
| Vercel + Cloudflare access                                        | Cutover env vars               | —                          |

### Local PostgreSQL port (important on Windows)

During PostgreSQL install, use the **default port `5432`**.

If you set PostgreSQL to **3000**, it will conflict with the Vite dev server (also port **3000**). Symptoms:

```text
Error: listen EACCES: permission denied ::1:3000
```

**Fix:** edit `C:\Program Files\PostgreSQL\18\data\postgresql.conf` → set `port = 5432` → restart the `postgresql-x64-18` Windows service.

This app talks to **Supabase in the cloud** for data. Local PostgreSQL is only used for `psql` restore commands.

### Port layout (after fix)

| Service              | Port                        |
| -------------------- | --------------------------- |
| `npm run dev` (Vite) | **3000** (`vite.config.ts`) |
| Local PostgreSQL     | **5432**                    |
| Supabase (remote)    | cloud pooler **5432**       |

---

## Maintenance window order (do not skip steps)

Run these **in this order** during the live migration. **Step 1** and **Step 4** can be done earlier as prep; **Step 2** (close prod) must happen **before Step 3** (dump).

| # | Doc step | Action | Site status |
| - | -------- | ------ | ----------- |
| 1 | Step 1 (+ Step 4 prep) | Link CLI; create new Supabase project; optional dry-run restore | Prod **open** |
| 2 | **Step 2** | **Close prod website manually** — users cannot access `blackrose.asia` | Prod **closed** |
| 3 | Step 2 | **Pause discord-sync Worker** (stops background writes to old DB) | Prod **closed** |
| 4 | **Step 3** | Dump old prod → `supabase/backups/*.sql` | Prod **closed** |
| 5 | Step 5 | Restore dumps into new Supabase project | Prod **closed** |
| 6 | Step 6 | Verify row counts + spot-checks on **new** project | Prod **closed** |
| 7 | Step 7 | Cut over Vercel Production env + Worker to new project; redeploy | Prod **closed** |
| 8 | Step 7d | Smoke test (operators only — site still closed to public) | Prod **closed** |
| 9 | **Step 8** | **Re-open prod website** — users can access `blackrose.asia` again | Prod **open** |
| 10 | Step 8 | Re-enable discord-sync Worker cron if you disabled it in Step 2 | Prod **open** |

---

## Pre-migration checklist

Complete these **before** you close prod:

- [ ] Announce maintenance on Discord / socials (include expected downtime)
- [ ] Confirm no active tournament registration wave or live bracket edits during the window
- [ ] Create the new Supabase project (Step 3) and test restore once in a **dry run** (optional but recommended)
- [ ] Have new project **anon key**, **service role key**, and **database password** ready
- [ ] Export current Vercel Production env vars (backup in password manager)
- [ ] Note current Cloudflare Worker secrets (`SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Decide **how** you will close prod (maintenance page, Vercel protection, Cloudflare rule, etc.) and how you will re-open it
- [ ] Confirm operators know: **do not dump until prod is closed and Worker is paused**

---

## Step 1 — Link the CLI to old production

From the repo root:

```powershell
cd c:\ren-assets\personal\blackrose-arena-main

npx supabase login
npx supabase link --project-ref qupypapvfdhzvmseolhi
```

Confirm the linked project:

```powershell
npx supabase projects list
```

Look for `"linked": true` on **Blackrose-Database** (`qupypapvfdhzvmseolhi`).

---

## Step 2 — Close production website (freeze writes)

**Do this before dumping.** The prod site must not accept user traffic while we copy data.

We close **`blackrose.asia` manually** — there is no automatic switch in this repo. Pick whatever your team already uses:

| Approach | Notes |
| -------- | ----- |
| **Maintenance page** | Replace prod deploy with a static “under maintenance” page |
| **Vercel** | Deployment protection, disable production domain, or pause the project |
| **Cloudflare** | Maintenance rule / “under attack” holding page on `blackrose.asia` |
| **DNS** | Temporary removal of prod record (last resort — slower to revert) |

**Verify prod is closed:**

- `https://blackrose.asia` does not load the app (or shows maintenance only)
- Discord login / registration cannot complete
- Admin console `/admin` is unreachable for normal operators (or only your test account can reach a staging URL)

**Also pause background writes** so the old database stays frozen:

```bash
cd workers/discord-sync
# Option A: undeploy or disable the cron trigger in Cloudflare dashboard
# Option B: temporarily set SYNC_BATCH_SIZE=0 and deploy (if you use that guard)
```

The discord-sync Worker updates `members.status` every 15 minutes. If it keeps running during the dump, verification state can change **after** the backup started.

> Keep prod **closed** through Step 7 (cutover + smoke test). Re-open only in Step 8.

---

## Step 3 — Dump old production to local files

**Prerequisites:** prod website is **closed** and discord-sync Worker is **paused**.

Create a backups folder (gitignored — never commit prod data):

```powershell
mkdir supabase\backups -Force
```

**Start Docker Desktop**, then run all three dumps:

```powershell
npx supabase db dump --linked -f supabase/backups/roles.sql --role-only
npx supabase db dump --linked -f supabase/backups/schema.sql
npx supabase db dump --linked -f supabase/backups/data.sql --use-copy --data-only `
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Expected files:

| File         | Contents                                                         |
| ------------ | ---------------------------------------------------------------- |
| `roles.sql`  | Often empty on Supabase managed projects — OK to skip on restore |
| `schema.sql` | Tables, RLS, functions, publications                             |
| `data.sql`   | All row data                                                     |

You may see a warning about circular FKs on `profile_comments`. That is normal; the restore script handles it with `session_replication_role = replica`.

If dump fails with a Docker pipe error, start Docker Desktop and retry.

This dump is the **authoritative snapshot** of all current user data. Because prod was closed first, nothing new should be written to the old database while `schema.sql` and `data.sql` are generated.

**Data that must be present in `data.sql` after restore:**

| Table / area | What it holds |
| ------------ | ------------- |
| `members` | All registered members, Discord IDs, verification status |
| `member_profiles`, `member_social_links` | Public profiles and socials |
| `teams`, `team_members` | Rosters, captains, invites |
| `tournaments`, `tournament_registrations`, `tournament_registration_players` | Events and sign-ups |
| `tournament_bracket_state`, bracket-related rows | Live and published brackets |
| `tournament_champions` | Hall of Champions |
| `profile_comments` | Profile wall comments |
| `admin_accounts` | Admin console logins |
| `admin_audit_logs` | Admin action history (if present in prod) |

---

## Step 4 — New production Supabase project

> **Prep step:** do this **before** the maintenance window (while prod is still open). You need the new project ready before Step 5 (restore).

**Our new production project ref:** `efchfvreaotskrdlweze`

- Dashboard: `https://supabase.com/dashboard/project/efchfvreaotskrdlweze`
- API URL: `https://efchfvreaotskrdlweze.supabase.co`
- **Session pooler host (restore on Windows):** `aws-1-ap-southeast-1.pooler.supabase.com` — use this if direct `db.efchfvreaotskrdlweze.supabase.co` fails (IPv6-only DNS on some networks)

If you still need to create it from scratch:

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project**
2. Pick a region close to your users (e.g. Southeast Asia / Tokyo if most traffic is PH)
3. Set a strong **database password** and save it in a password manager

Use a **clean empty project** for restore. If you already ran experiments on `efchfvreaotskrdlweze`, wipe all `public` tables first to avoid conflicts.

Record these from **Settings → API** (project `efchfvreaotskrdlweze`):

- Project URL → `VITE_SUPABASE_URL`
- `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server / Worker only)

---

## Step 5 — Restore dumps into the new project

We use `scripts/restore-supabase-db.ps1` instead of a raw `postgresql://` URI because:

- Passwords containing `@` break connection URIs
- Supabase pooler host must be passed separately from credentials

Use project ref `efchfvreaotskrdlweze` and your new database password below.

### Option A — Direct connection (simplest)

```powershell
.\scripts\restore-supabase-db.ps1 `
  -ProjectRef "efchfvreaotskrdlweze" `
  -UseDirectConnection `
  -PoolerHost "unused" `
  -Password "YOUR_NEW_DB_PASSWORD"
```

Connects to `db.efchfvreaotskrdlweze.supabase.co:5432` as user `postgres`.

> **Windows note:** if direct connection fails with `could not translate host name`, use **Option B** below.

### Option B — Session pooler (recommended on Windows)

1. Dashboard → project `efchfvreaotskrdlweze` → **Connect** → **Session pooler**
2. Copy **only the host** — for this project: `aws-1-ap-southeast-1.pooler.supabase.com`
3. Run:

```powershell
.\scripts\restore-supabase-db.ps1 `
  -ProjectRef "efchfvreaotskrdlweze" `
  -PoolerHost "aws-1-ap-southeast-1.pooler.supabase.com" `
  -Password "YOUR_NEW_DB_PASSWORD"
```

**Do not** pass the full URI into `-PoolerHost` unless it starts with `postgresql://` (the script will extract the host).

### Success output

```text
Target: postgres.efchfvreaotskrdlweze @ aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres (project efchfvreaotskrdlweze)
Applying schema.sql ...
Applying data.sql (session_replication_role=replica) ...
Restore finished. Verify row counts in the Supabase SQL editor.
```

### Verify in SQL Editor (new project)

```sql
select 'members' as t, count(*) from members
union all select 'teams', count(*) from teams
union all select 'tournaments', count(*) from tournaments
union all select 'tournament_registrations', count(*) from tournament_registrations
union all select 'admin_accounts', count(*) from admin_accounts;
```

Compare counts to the **old** prod project. They should match (or be within the small delta from activity during the maintenance window).

Spot-check a known member, team, and live tournament:

```sql
select id, username, status from members order by created_at desc limit 5;
select id, name, tag, game from teams order by created_at desc limit 5;
select id, name, status from tournaments order by created_at desc limit 5;
```

---

## Step 6 — Post-restore checks (new project)

Run these on the **new** project before switching traffic.

### Realtime (live bracket / registrations / members)

If live updates do not work, re-run publication SQL from `docs/sql/`:

```sql
alter publication supabase_realtime add table public.tournament_bracket_state;
alter publication supabase_realtime add table public.tournaments;
alter publication supabase_realtime add table public.tournament_registrations;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.team_members;
```

Schema dump usually includes publications; run these only if Realtime subscriptions fail after cutover.

### Admin console

Admin login uses `admin_accounts` from the restored dump — same usernames/passwords as old prod. Optionally rotate staging-style passwords on the new project using [sql/create_admin_account.sql](./sql/create_admin_account.sql).

### RLS smoke test

From the app (after Step 7), verify:

- Public tournament list loads (anon)
- Member Discord login creates/updates `members` row (service role on server)
- Admin console login at `/login?console=1`

---

## Step 7 — Cut over production (site still closed)

Prod remains **closed** during cutover. Keep the old Supabase project running until verification passes — it is your rollback source.

### 7a. Vercel Production env vars

Vercel → Project → **Settings → Environment Variables** → **Production**:

| Variable                    | New value                                              |
| --------------------------- | ------------------------------------------------------ |
| `VITE_SUPABASE_URL`         | `https://efchfvreaotskrdlweze.supabase.co`                |
| `VITE_SUPABASE_ANON_KEY`    | new project anon key                                   |
| `SUPABASE_SERVICE_ROLE_KEY` | new project service role key                           |

Leave **Preview** and **Development** pointed at staging (`xjwugbbrqpwnenmlrkdh`) — see [SUPABASE_STAGING_CLONE.md](./SUPABASE_STAGING_CLONE.md).

Redeploy production (or trigger a deploy from the default branch).

### 7b. Cloudflare discord-sync Worker

Update `workers/discord-sync/wrangler.toml`:

```toml
SUPABASE_URL = "https://efchfvreaotskrdlweze.supabase.co"
```

Rotate the Worker secret and deploy (point at the **new** database). Leave the cron **disabled** if you paused it in Step 2 — re-enable the cron when you re-open prod in Step 8.

```bash
cd workers/discord-sync
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# paste the NEW project's service role key
npx wrangler deploy
```

Without this step, the Worker continues writing member verification status to the **old** database.

### 7c. Discord OAuth

No change required if production URL stays `https://blackrose.asia/auth/callback`. Confirm it remains registered in [Discord Developer Portal](https://discord.com/developers/applications) → OAuth2 → Redirects.

### 7d. Smoke test (before re-opening to users)

While prod is still closed to the public, operators verify:

1. Open `https://blackrose.asia/tournaments` — events load
2. Sign in with Discord — member row resolves, dashboard loads
3. Open admin console — login + tournament list
4. If a tournament was live before maintenance, confirm bracket data matches pre-migration counts

Do **not** re-open the site to all users until these checks pass.

---

## Step 8 — Re-open production website

After smoke tests pass:

1. **Remove** the maintenance block (reverse whatever you did in Step 2)
2. **Re-enable** the discord-sync Worker cron (`wrangler deploy` with normal config)
3. Post in Discord that migration is complete and the site is back
4. Monitor for 30–60 minutes — login, registration, admin console, Worker logs

Members with an active browser session may need to sign in again after cutover. Member UUIDs are preserved in the dump, so existing accounts map to the same rows in the new database.

---

## Step 9 — Decommission old production (after soak period)

Wait at least **24–72 hours** with no issues before touching the old project.

| Action | Recommendation |
| ------ | -------------- |
| Keep old project paused | Supabase → Project Settings → pause (saves cost, keeps backup) |
| Final archive dump | Re-run Step 2 dumps; store `supabase/backups/` offline in a secure location |
| Delete old project | Only after you are confident rollback is not needed |

**Do not** delete `qupypapvfdhzvmseolhi` until Vercel Production, the discord-sync Worker, and any other integrations no longer reference it.

---

## Rollback plan

If something fails after cutover:

1. Revert Vercel Production env vars to the **old** `qupypapvfdhzvmseolhi` URL and keys
2. Redeploy production
3. Revert Worker `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to old values; `wrangler deploy`
4. Investigate on the new project without user traffic

Old prod data is unchanged if you only **read** from it for the dump and did not write to it during cutover.

---

## Re-dump and refresh the new project later

If you need to re-sync new prod from old prod again (before decommissioning old):

1. Link CLI to old prod: `npx supabase link --project-ref qupypapvfdhzvmseolhi`
2. Re-run dump commands (Step 2)
3. Restore into the new project (Step 4) — best on an empty project or after truncating `public` tables

For ongoing dev/staging refreshes, use [SUPABASE_STAGING_CLONE.md](./SUPABASE_STAGING_CLONE.md) instead (prod → staging, prod untouched).

---

## Troubleshooting

### `supabase db dump` — Docker pipe error

```text
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

Start **Docker Desktop**, wait until it is running, then retry.

### `psql` not recognized

Install PostgreSQL client and add to PATH:

```text
C:\Program Files\PostgreSQL\18\bin
```

Restart the terminal, then `psql --version`.

### Restore — password with `@` in a URI

```text
could not translate host name "something@...." to address
```

Do not embed the password in a `postgresql://` string. Use `restore-supabase-db.ps1` with `-Password` (uses `PGPASSWORD` internally).

### Restore — wrong `-PoolerHost`

Pass hostname only: `aws-1-ap-northeast-1.pooler.supabase.com`, port **5432** (not 3000).

### Row counts mismatch after restore

- Confirm prod was **closed** and Worker **paused** before the dump
- Re-dump only after closing prod again (do not dump while users can write)
- Check restore logs for errors on `profile_comments` or large tables
- Confirm you restored to an **empty** project (no leftover tables from a failed partial restore)

### Members can log in but see empty dashboard

- Confirm `VITE_SUPABASE_URL` and anon key match the **new** project in the deployed build (hard-refresh / clear site data)
- Member IDs are UUIDs in `members` — they are preserved by dump/restore; stale `localStorage` session pointing at old IDs is rare but clearing site data fixes it

### Worker still updates old database

- Check `wrangler.toml` `SUPABASE_URL` and redeployed Worker secret for service role key

### Postgres logs — `supabase_migrations.schema_migrations does not exist`

Normal when the project was created via dashboard restore rather than CLI migrations. Safe to ignore unless you adopt Supabase CLI migrations going forward.

---

## Files in this repo

| Path                             | Purpose                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| `scripts/restore-supabase-db.ps1` | Restore `supabase/backups/*.sql` into any project ref      |
| `scripts/restore-staging-db.ps1`  | Wrapper defaulting to staging ref `xjwugbbrqpwnenmlrkdh`   |
| `supabase/backups/`              | Local dump output (gitignored)                             |
| `supabase/.gitignore`            | Ignores `backups/` and dated backup folders                |
| `workers/discord-sync/wrangler.toml` | Update `SUPABASE_URL` at cutover                       |
| `.env.example`                   | Template for Supabase URL + keys                         |

---

## Quick reference commands

```powershell
# === PREP (prod can stay open) ===
npx supabase link --project-ref qupypapvfdhzvmseolhi

# === MAINTENANCE WINDOW (prod CLOSED, Worker PAUSED) ===

# 1. Close blackrose.asia manually (maintenance page / Vercel / Cloudflare)

# 2. Dump old prod (Docker running) — only after site is closed
mkdir supabase\backups -Force
npx supabase db dump --linked -f supabase/backups/schema.sql
npx supabase db dump --linked -f supabase/backups/data.sql --use-copy --data-only `
  -x "storage.buckets_vectors" -x "storage.vector_indexes"

# 3. Restore to NEW prod project (Windows: use pooler host)
.\scripts\restore-supabase-db.ps1 `
  -ProjectRef "efchfvreaotskrdlweze" `
  -PoolerHost "aws-1-ap-southeast-1.pooler.supabase.com" `
  -Password "YOUR_NEW_DB_PASSWORD"

# 4. Cutover — update Vercel Production env vars, then:
cd workers\discord-sync
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler deploy

# 5. Smoke test, then re-open prod manually and re-enable Worker cron
```

---

## Related docs

- [SUPABASE_STAGING_CLONE.md](./SUPABASE_STAGING_CLONE.md) — clone prod → staging for dev/preview (no prod cutover)
- [README.md](./README.md) — Supabase tables and admin setup
- [ADMIN_DATABASE.md](./ADMIN_DATABASE.md) — schema reference
- [workers/discord-sync/README.md](../workers/discord-sync/README.md) — Worker env at cutover
- [Supabase: Backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
