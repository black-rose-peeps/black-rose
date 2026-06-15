# Discord ROSE role bot

Event-driven verification sync: when an admin assigns or removes the **ROSE** role on Discord, the bot updates `members.status` in Supabase. The waitlist reads Supabase only (via Realtime + optional DB fallback poll).

## Architecture

```text
Admin assigns ROSE on Discord
        ↓
Gateway bot receives GUILD_MEMBER_UPDATE
        ↓
Supabase members.status → Verified
        ↓
Waitlist Realtime subscription → redirect to dashboard
```

The web app does **not** call the Discord API on waitlist polling. On **every Discord sign-in**, the server checks whether the user already has ROSE (OAuth `guilds.members.read`, with bot REST as fallback) and sets `Verified` immediately when they do.

## Login verification (existing ROSE holders)

Many members will already have ROSE before their first website sign-in. That is handled at OAuth completion:

1. User authorizes with scope `guilds.members.read`
2. Server calls `GET /users/@me/guilds/{guild}/member` with their access token
3. If ROSE is present → member row is created/updated as **Verified** → user goes to dashboard
4. If OAuth scope is unavailable, the bot REST API is used as fallback

Users who authorized before this scope was added may need to sign in once more so Discord re-prompts for consent.

## Setup

1. **Discord Developer Portal → Bot**
   - Enable **Server Members Intent** (required for `GUILD_MEMBER_UPDATE`)
   - Copy bot token → `DISCORD_BOT_TOKEN` in `.env.local`

2. **Invite the bot** to your guild (Installation → `bot` scope)

3. **Create the ROSE role** in the guild (or set `DISCORD_ROSE_ROLE_ID`)

4. **Env vars** (see `.env.example`):
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_GUILD_ID`
   - `DISCORD_ROSE_ROLE_ID` (recommended) or `DISCORD_ROSE_ROLE_NAME=ROSE`
   - `SUPABASE_SERVICE_ROLE_KEY` (bot writes via service role)

5. **Supabase Realtime** — ensure `members` is in the Realtime publication:
   ```bash
   # docs/sql/members_realtime.sql
   ```

## Run locally

Two terminals:

```bash
npm run dev
npm run discord-bot
```

You should see:

```text
[discord-bot] Guild … — ROSE role …
[discord-bot] Listening for GUILD_MEMBER_UPDATE…
[discord-bot] Ready
```

Assign ROSE to a waitlisted user on Discord → their waitlist tab should redirect within a second.

## Production hosting

Run `npm run discord-bot` as a **separate long-lived process** (Railway, Fly.io, Render worker, VPS, etc.). It is not part of the Vercel serverless bundle.

The Vite web app does not need the bot token at runtime for waitlist polling — only Supabase.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| Bot connects but no updates | Enable **Server Members Intent**; confirm bot is in the guild |
| Waitlist never redirects | Ensure `npm run discord-bot` is running; check Realtime on `members` |
| `Could not resolve ROSE role` | Set `DISCORD_ROSE_ROLE_ID` explicitly |
| User has ROSE before first login | Should work on first sign-in; re-auth if they authorized before `guilds.members.read` was added |
