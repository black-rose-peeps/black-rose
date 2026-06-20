# Clone production Supabase into a staging / dev project

This guide documents how we duplicated the **production** Black Rose Arena database into a **separate** Supabase project for local development and Vercel preview — without touching production data.

Use this when you want a fresh copy of real schema + data to test against, while keeping production (`blackrose.asia`) isolated.

---

## Overview

| Environment | Supabase project | When to use |
|-------------|------------------|-------------|
| **Production** | `qupypapvfdhzvmseolhi` (Blackrose-Database) | Live site on Vercel **Production** |
| **Staging / dev** | `xjwugbbrqpwnenmlrkdh` (your dev clone) | Local `.env` / `.env.local`, Vercel **Preview** |

```text
Prod DB  ──dump──►  supabase/backups/*.sql  ──restore──►  Staging DB
                                                              │
                    Local (localhost:3000) ◄──────────────────┤
                    Vercel Preview          ◄──────────────────┘
```

**What gets copied:** tables, RLS, functions, triggers, row data (members, teams, tournaments, etc.).

**What does not copy automatically:** Vercel env vars, Discord OAuth redirect URLs, Cloudflare discord-sync worker secrets, Storage bucket files (this app does not rely on Storage for core flows).

---

## Prerequisites

Install and verify before starting:

| Tool | Purpose | Verify |
|------|---------|--------|
| [Supabase CLI](https://supabase.com/docs/guides/cli) | Dump from linked project | `npx supabase --version` |
| [Docker Desktop](https://docs.docker.com/desktop/) | Required by `supabase db dump` | Docker running before dump |
| [PostgreSQL client](https://www.postgresql.org/download/windows/) | `psql` for restore | `psql --version` |
| Supabase login | CLI auth | `npx supabase login` |

### Local PostgreSQL port (important on Windows)

During PostgreSQL install, use the **default port `5432`**.

If you set PostgreSQL to **3000**, it will conflict with the Vite dev server (also port **3000**). Symptoms:

```text
Error: listen EACCES: permission denied ::1:3000
```

**Fix:** edit `C:\Program Files\PostgreSQL\18\data\postgresql.conf` → set `port = 5432` → restart the `postgresql-x64-18` Windows service.

This app talks to **Supabase in the cloud** for data. Local PostgreSQL is only used for `psql` restore commands.

### Port layout (after fix)

| Service | Port |
|---------|------|
| `npm run dev` (Vite) | **3000** (`vite.config.ts`) |
| Local PostgreSQL | **5432** |
| Supabase (remote) | cloud pooler **5432** |

---

## Step 1 — Link the CLI to production

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

## Step 2 — Dump production to local files

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

| File | Contents |
|------|----------|
| `roles.sql` | Often empty on Supabase managed projects — OK to skip on restore |
| `schema.sql` | Tables, RLS, functions, publications |
| `data.sql` | All row data |

You may see a warning about circular FKs on `profile_comments`. That is normal; the restore script handles it with `session_replication_role = replica`.

If dump fails with a Docker pipe error, start Docker Desktop and retry.

---

## Step 3 — Create the staging Supabase project

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project**
2. Pick a region (any is fine for dev)
3. Set a strong **database password** and save it in a password manager
4. Note the **project ref** from the URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`

Our staging ref: **`xjwugbbrqpwnenmlrkdh`**

Staging URL: `https://xjwugbbrqpwnenmlrkdh.supabase.co`

Use a **clean empty project** for restore. If you already ran experiments on it, create a new project or wipe tables first to avoid conflicts.

---

## Step 4 — Restore dumps into staging

We use `scripts/restore-staging-db.ps1` instead of a raw `postgresql://` URI because:

- Passwords containing `@` break connection URIs
- Supabase pooler host must be passed separately from credentials

### Option A — Direct connection (simplest)

No pooler hostname needed:

```powershell
.\scripts\restore-staging-db.ps1 `
  -UseDirectConnection `
  -PoolerHost "unused" `
  -Password "YOUR_DATABASE_PASSWORD"
```

Connects to `db.xjwugbbrqpwnenmlrkdh.supabase.co:5432` as user `postgres`.

### Option B — Session pooler

1. Dashboard → staging project → **Connect** → **Session pooler**
2. Copy **only the host**, e.g. `aws-1-ap-northeast-1.pooler.supabase.com`
3. Run:

```powershell
.\scripts\restore-staging-db.ps1 `
  -PoolerHost "aws-1-ap-northeast-1.pooler.supabase.com" `
  -Password "YOUR_DATABASE_PASSWORD"
```

**Do not** pass the full URI into `-PoolerHost` unless it starts with `postgresql://` (the script will extract the host). Wrong:

```powershell
# BAD — entire URI as PoolerHost (before script fix) caused DNS errors
-PoolerHost "postgresql://postgres.xjwug:pass@aws-1-....pooler.supabase.com:5432/postgres"
```

Correct:

```powershell
-PoolerHost "aws-1-ap-northeast-1.pooler.supabase.com"
```

### Custom project ref

If your staging ref is not `xjwugbbrqpwnenmlrkdh`, pass `-ProjectRef`:

```powershell
.\scripts\restore-staging-db.ps1 `
  -ProjectRef "your-staging-ref" `
  -UseDirectConnection `
  -PoolerHost "unused" `
  -Password "YOUR_DATABASE_PASSWORD"
```

### Success output

```text
Target: postgres @ db.xjwugbbrqpwnenmlrkdh.supabase.co:5432/postgres
Applying schema.sql ...
Applying data.sql (session_replication_role=replica) ...
Restore finished. Verify row counts in the Supabase SQL editor.
```

### Verify in SQL Editor (staging project)

```sql
select 'members' as t, count(*) from members
union all select 'teams', count(*) from teams
union all select 'tournaments', count(*) from tournaments;
```

Compare counts to production if you want a sanity check.

---

## Step 5 — Point the app at staging

### Local development

Use **`.env.local`** (or `.env`) with staging credentials. Vite loads `.env.local` over `.env`.

```env
VITE_SUPABASE_URL=https://xjwugbbrqpwnenmlrkdh.supabase.co
VITE_SUPABASE_ANON_KEY=<staging anon key — Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<staging service role — server only, never commit>
```

Get keys from: Supabase Dashboard → staging project → **Settings → API**.

Keep production keys **only** on Vercel Production — not in local files you use daily.

### Vercel preview / development

In Vercel → Project → **Settings → Environment Variables**:

| Variable | Production | Preview + Development |
|----------|------------|------------------------|
| `VITE_SUPABASE_URL` | `https://qupypapvfdhzvmseolhi.supabase.co` | `https://xjwugbbrqpwnenmlrkdh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | prod anon key | staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | prod service role | staging service role |

This keeps preview deploys off the live database.

---

## Step 6 — Discord OAuth (local + preview)

Register redirect URLs in [Discord Developer Portal](https://discord.com/developers/applications) → your app → **OAuth2 → Redirects**:

```text
http://localhost:3000/auth/callback
https://your-preview-url.vercel.app/auth/callback
https://blackrose.asia/auth/callback
```

Local dev runs on **port 3000** (`vite.config.ts`). The app derives the callback from the browser origin; ensure the URL you log in from matches a registered redirect.

---

## Step 7 — Optional post-restore checks

### Realtime (live bracket / registrations)

If live updates do not work on staging, re-run the publication SQL from `docs/sql/` on the **staging** project, for example:

```sql
-- See docs/sql/tournament_bracket_state.sql, members_realtime.sql, etc.
alter publication supabase_realtime add table public.tournament_bracket_state;
alter publication supabase_realtime add table public.tournaments;
alter publication supabase_realtime add table public.tournament_registrations;
alter publication supabase_realtime add table public.members;
```

Schema dump usually includes publications; run these only if Realtime subscriptions fail.

### Cloudflare discord-sync worker

The Worker has its own `SUPABASE_URL` and service key. If preview still uses the **production** worker, Discord role sync may write to **prod**.

For true isolation, deploy a separate preview worker bound to staging credentials, or disable worker sync while testing.

### Admin console

Admin login uses `admin_accounts` in the cloned DB — same usernames/passwords as prod after restore. Change staging passwords if needed (`docs/sql/create_admin_account.sql`).

---

## Re-clone production later (refresh staging data)

When you want a fresh copy of prod again:

1. Ensure CLI is linked to prod: `npx supabase link --project-ref qupypapvfdhzvmseolhi`
2. Re-run the three `db dump` commands (Step 2)
3. Restore into staging again (Step 4) — best on an empty project or after truncating staging tables
4. No Vercel env change needed if staging project ref stays the same

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

Do not embed the password in a `postgresql://` string. Use `restore-staging-db.ps1` with `-Password` (uses `PGPASSWORD` internally).

### Restore — wrong `-PoolerHost`

Pass hostname only: `aws-1-ap-northeast-1.pooler.supabase.com`, port **5432** (not 3000).

### `npm run dev` — port 3000 in use

PostgreSQL and Vite both on 3000 → move PostgreSQL to **5432** (see Prerequisites).

### Script parameter `-DbUrl` not found

The restore script was updated. Use `-Password` + `-PoolerHost` or `-UseDirectConnection`, not `-DbUrl`.

### Postgres logs — `supabase_migrations.schema_migrations does not exist`

Normal if the project was created manually / via dashboard rather than CLI migrations. Safe to ignore unless you adopt CLI migrations.

---

## Files in this repo

| Path | Purpose |
|------|---------|
| `scripts/restore-staging-db.ps1` | Restore `supabase/backups/*.sql` into staging |
| `supabase/backups/` | Local dump output (gitignored) |
| `supabase/.gitignore` | Ignores `backups/` |
| `vite.config.ts` | Dev server port **3000** |
| `.env.example` | Template — use staging keys in `.env.local` for dev |

---

## Quick reference commands

```powershell
# Link prod
npx supabase link --project-ref qupypapvfdhzvmseolhi

# Dump prod (Docker running)
mkdir supabase\backups -Force
npx supabase db dump --linked -f supabase/backups/schema.sql
npx supabase db dump --linked -f supabase/backups/data.sql --use-copy --data-only `
  -x "storage.buckets_vectors" -x "storage.vector_indexes"

# Restore to staging
.\scripts\restore-staging-db.ps1 `
  -UseDirectConnection `
  -PoolerHost "unused" `
  -Password "YOUR_STAGING_DB_PASSWORD"

# Dev
npm run dev
# → http://localhost:3000
```

---

## Related docs

- [README.md](./README.md) — Supabase tables and admin setup
- [ADMIN_DATABASE.md](./ADMIN_DATABASE.md) — schema reference
- [Supabase: Backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
