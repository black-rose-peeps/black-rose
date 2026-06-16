# BlackRose Discord sync (Cloudflare Worker)

Scheduled Worker that syncs the Discord **ROSE** role to `members.status` in Supabase every 2 minutes. Designed for Cloudflare Workers (no long-running Gateway bot).

## Architecture

```text
Cloudflare Cron (every 2 min)
        ↓
Query Supabase members with discord_id
        ↓
Discord REST: GET /guilds/{guild}/members/{user}
        ↓
Update members.status when ROSE role differs
        ↓
Waitlist Realtime → redirect to dashboard
```

Login-time verification (existing ROSE holders) still runs in the main web app via OAuth `guilds.members.read`.

## Prerequisites

1. Discord bot invited to your guild (`bot` scope)
2. **ROSE** role created — set `DISCORD_ROSE_ROLE_ID` on the Worker
3. Supabase service role key (Worker writes to `members`)
4. `members` table in Supabase Realtime publication (`docs/sql/members_realtime.sql`)

## Setup

From the repo root:

```bash
cd workers/discord-sync
npm install
```

### Secrets and vars

```bash
# Required secrets
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Optional secret for manual POST /sync
npx wrangler secret put SYNC_SECRET
```

Set non-secret vars in `wrangler.toml` or the Cloudflare dashboard:

| Var | Example |
|-----|---------|
| `DISCORD_GUILD_ID` | `1193921905795792906` (Black Rose official) |
| `DISCORD_ROSE_ROLE_ID` | `1465647773658517660` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SYNC_BATCH_SIZE` | `22` (Workers Free: each member may use 2 subrequests — Discord + DB update) |

You can also add vars to `wrangler.toml`:

```toml
[vars]
DISCORD_GUILD_ID = "1193921905795792906"
DISCORD_ROSE_ROLE_ID = "1465647773658517660"
SUPABASE_URL = "https://your-project.supabase.co"
SYNC_BATCH_SIZE = "22"
```

### Deploy

```bash
npm run deploy
```

Or from repo root:

```bash
npm run discord-sync:deploy
```

## Local development

```bash
npm run dev
```

Trigger a manual sync (if `SYNC_SECRET` is set):

```bash
curl -X POST http://localhost:8787/sync -H "Authorization: Bearer YOUR_SYNC_SECRET"
```

Health check:

```bash
curl http://localhost:8787/health
```

## Production notes

- **Cron schedule:** every 2 minutes (`*/2 * * * *` in `wrangler.toml`). Waitlist users typically verify within ~2 min of receiving ROSE.
- **Workers Paid** is recommended for production cron (Free tier cron CPU is 10 ms; network `fetch` time does not count toward CPU).
- **Rate limits:** Workers Free allows **50 subrequests per cron run**. Default batch is **22** members per page (Discord fetch + possible DB update = up to 2 subrequests each). Pages rotate every 2 minutes.
- **Guild scope:** the Worker only inspects `DISCORD_GUILD_ID`. Members **not in that server** are treated as **Not Verified** (no ROSE possible).
- **Gateway bot (`npm run discord-bot`)** is optional — use the Worker instead for Cloudflare hosting. The Gateway bot gives ~instant updates; the cron Worker gives ~2 min latency.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| POST | `/sync` | Manual sync run (optional `Authorization: Bearer SYNC_SECRET`) |

Cron runs automatically — no HTTP call needed in production.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| No status updates | Check Worker logs (`npm run tail`); verify secrets and guild/role IDs |
| `ROSE role not found` | Set `DISCORD_ROSE_ROLE_ID` explicitly |
| 404 for all members | Bot not in guild or user not in server |
| Waitlist slow to redirect | Normal — up to ~2 min cron interval; Realtime fires once DB updates |
