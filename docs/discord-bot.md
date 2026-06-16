# Discord ROSE role sync

ROSE role changes on Discord are synced to `members.status` in Supabase. The waitlist reads Supabase only (Realtime + DB fallback poll).

## Architecture (production)

```text
Cloudflare Cron Worker (every 2 min)     ← recommended for production
        ↓
Discord REST + Supabase update

        OR (local / instant)

Gateway bot (npm run discord-bot)      ← optional, ~instant updates
        ↓
GUILD_MEMBER_UPDATE → Supabase
```

**Login:** OAuth `guilds.members.read` in the web app verifies existing ROSE holders on first sign-in (no Worker needed).

See **[workers/discord-sync/README.md](../workers/discord-sync/README.md)** for Cloudflare Worker deploy steps.

## Quick start (Cloudflare Worker)

```bash
cd workers/discord-sync
npm install
# set secrets — see workers/discord-sync/README.md
npm run deploy
```

Stop the local Gateway bot if you deploy the Worker — only one sync path is needed.

## Quick start (local Gateway bot — optional)

```bash
npm run dev          # terminal 1
npm run discord-bot  # terminal 2 — instant role updates while testing
```

## Env vars (web app + Worker)

| Variable | Where |
|----------|--------|
| `DISCORD_BOT_TOKEN` | Worker secret (+ `.env.local` for local Gateway bot) |
| `DISCORD_GUILD_ID` | Worker var |
| `DISCORD_ROSE_ROLE_ID` | Worker var (required) |
| `SUPABASE_URL` | Worker var |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker secret |

Web app login sync uses OAuth; it does not need the bot token at runtime on Vercel.

## Supabase Realtime

Ensure `members` is in the Realtime publication:

```bash
# docs/sql/members_realtime.sql
```

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| Waitlist never redirects | Deploy Worker or run Gateway bot; check Realtime on `members` |
| User has ROSE before first login | Re-sign in once for `guilds.members.read` consent |
| Slow verify after ROSE assigned | Cron Worker — expect up to ~2 min; use Gateway bot for instant local dev |
