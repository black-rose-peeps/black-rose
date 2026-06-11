# Riot Account Linking (RSO) — Setup Guide

Step-by-step guide to run **Link Riot Account** locally on a **work-in-progress branch**.  
Do **not** merge this to production or preview until Riot approves your Valorant production key and RSO client.

---

## What this feature does

1. A verified member opens **Dashboard** or **Profile → Player** tab.
2. They expand **Riot data opt-in**, read the disclaimer, and check the consent box.
3. They click **Link Riot Account** → redirect to Riot Sign On (RSO).
4. After login, Riot redirects to `/auth/riot/callback`.
5. The **server** exchanges the code for tokens, calls `/riot/account/v1/accounts/me`, and stores `gameName#tagline` in Supabase.
6. The member can toggle **Show Riot ID on public profile** (default: off).

Secrets (`RIOT_RSO_CLIENT_SECRET`, `RIOT_API_KEY`) never go to the browser.

---

## Before you start

| Requirement                     | Notes                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| Discord login working           | Member must be signed in (`br_session` in localStorage).                             |
| Supabase + `members` table      | Same as the rest of the app.                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Required for server functions that write `riot_accounts`.                            |
| Riot **RSO client** credentials | **Not** the same as the `RGAPI-…` development API key.                               |
| Valorant production approval    | Riot typically issues RSO client ID + secret **after** Valorant production approval. |

**Development API key (`RGAPI-…`):**

- For **local development only** — do not use on Vercel production/preview.
- Expires on a schedule; regenerate in the [Riot Developer Portal](https://developer.riotgames.com) when needed.
- Does **not** replace RSO credentials for account linking.

---

## Recommended branch workflow

```bash
git checkout main
git pull
git checkout -b feature/riot-account-linking
```

- Develop and test **only on localhost** (`npm run dev`).
- Keep Riot env vars in **local `.env` only** — do not add them to Vercel production/preview until approved.
- Merge to `main` / deploy when Riot credentials are live and you are ready to ship.

---

## Step 1 — Create the database table (This is already in the Supabase Database, currently empty, locked-down table waiting for the feature)

In **Supabase → SQL Editor**, run:

```text
docs/sql/riot_accounts.sql
```

This creates `public.riot_accounts` with RLS enabled and **no public policies** (service role only).

Verify:

```sql
select * from public.riot_accounts limit 1;
```

---

## Step 2 — Register with Riot (one-time)

1. Go to [developer.riotgames.com](https://developer.riotgames.com).
2. **Register your product** (Black Rose Arena) with game focus **VALORANT**.
3. Apply for a **production** API key (personal keys are not offered for Valorant).
4. After approval, Riot will help you set up **Riot Sign On (RSO)** and provide:
   - **Client ID**
   - **Client Secret**

Until you have those, the UI will show: _“Riot linking is not configured.”_

---

## Step 3 — Configure redirect URIs in Riot Portal

For **local WIP testing**, register:

```text
http://localhost:5173/auth/riot/callback
```

When you later deploy a staging URL, add that origin too. The path must be exactly `/auth/riot/callback`.

The app builds the redirect URI from `window.location.origin` — no separate redirect env var.

---

## Step 4 — Local environment variables

Copy `.env.example` → `.env` and set:

```env
# Already required for the app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...

# Riot — WIP / local only
VITE_RIOT_RSO_CLIENT_ID=your-rso-client-id
RIOT_RSO_CLIENT_ID=your-rso-client-id
RIOT_RSO_CLIENT_SECRET=your-rso-client-secret
RIOT_API_KEY=RGAPI-your-development-key
RIOT_ACCOUNT_CLUSTER=asia
```

| Variable                  | Where it runs | Purpose                                                                    |
| ------------------------- | ------------- | -------------------------------------------------------------------------- |
| `VITE_RIOT_RSO_CLIENT_ID` | Browser       | Build Riot authorize URL only (public in OAuth).                           |
| `RIOT_RSO_CLIENT_ID`      | Server        | Token exchange (same value as above).                                      |
| `RIOT_RSO_CLIENT_SECRET`  | Server only   | Token exchange — **never** prefix with `VITE_`.                            |
| `RIOT_API_KEY`            | Server only   | Future Valorant API calls; optional for basic link flow.                   |
| `RIOT_ACCOUNT_CLUSTER`    | Server        | `americas`, `europe`, or `asia` for `/accounts/me`. Use `asia` for PH/SEA. |

**Security**

- Never commit `.env`.
- Never put `RIOT_RSO_CLIENT_SECRET` or `RIOT_API_KEY` in client code or `VITE_*` vars.
- Do not add Riot secrets to Vercel until you intentionally ship linking.

---

## Step 5 — Run the app locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Sign in with Discord as a **verified** member (ROSE role).

---

## Step 6 — Test linking end-to-end

### A. Profile page (full opt-in UI)

1. Go to **Dashboard → Edit Profile** (or `/dashboard/profile?tab=player`).
2. Under **Riot Account**, click **Riot data opt-in** to expand the disclaimer.
3. Check the consent checkbox.
4. Optionally enable **Show Riot ID on public profile**.
5. Click **Link Riot Account**.
6. Complete Riot login/consent.
7. You should land back on the profile with a success message and your `GameName#TAG`.

### B. Dashboard (compact panel)

1. Go to `/dashboard`.
2. Use the **Riot Account** section (same link flow, compact disclaimer).

### C. Unlink

1. Click **Unlink** on the Riot panel.
2. Row is removed from `riot_accounts`.

### D. Public profile visibility

- `is_public = false` (default): other members do **not** see your Riot ID on `/members/your-slug`.
- `is_public = true`: `GameName#TAG` appears on your public profile.

---

## How the flow works (architecture)

```text
Browser                         Server (TanStack Start)              Riot / Supabase
   |                                    |                                  |
   |-- Link Riot Account -------------->|                                  |
   |   startRiotOAuth()                 |                                  |
   |-- redirect to auth.riotgames.com ->|                                  |
   |<- callback ?code=... --------------|                                  |
   |   completeRiotAuth() -------------->|-- POST /token (client secret) -->|
   |                                    |<- access_token ------------------|
   |                                    |-- GET /accounts/me ------------->|
   |                                    |<- puuid, gameName, tagLine ------|
   |                                    |-- upsert riot_accounts ---------> Supabase
   |<- success -------------------------|                                  |
```

### Key files

| Path                                                | Role                                     |
| --------------------------------------------------- | ---------------------------------------- |
| `src/features/riot/services/riot-rso.ts`            | Client OAuth helpers, `startRiotOAuth()` |
| `src/routes/auth.riot.callback.tsx`                 | Callback page after Riot redirect        |
| `src/features/riot/functions/complete-riot-auth.ts` | Server function: code → identity → DB    |
| `src/features/riot/server/riot-rso.server.ts`       | Token exchange + `/accounts/me`          |
| `src/features/riot/server/riot-accounts.server.ts`  | Supabase read/write                      |
| `src/features/riot/components/RiotAccountPanel.tsx` | Link / unlink / visibility UI            |
| `src/lib/riot-url.ts`                               | Allowed redirect URIs                    |
| `docs/sql/riot_accounts.sql`                        | Database migration                       |

---

## Troubleshooting

| Symptom                                    | Likely cause                      | Fix                                                                |
| ------------------------------------------ | --------------------------------- | ------------------------------------------------------------------ |
| “Riot linking is not configured”           | Missing `VITE_RIOT_RSO_CLIENT_ID` | Set env var; restart `npm run dev`.                                |
| “Invalid or expired linking session”       | CSRF `state` mismatch             | Start link again from dashboard; don’t open callback URL manually. |
| “RIOT_RSO_CLIENT_SECRET is not configured” | Secret missing on server          | Add to `.env`; restart dev server.                                 |
| “riot_accounts table is missing”           | SQL not run                       | Run `docs/sql/riot_accounts.sql`.                                  |
| “This Riot account is already linked…”     | Same PUUID on another member      | Unlink from other account or use different Riot login.             |
| Redirect URI error from Riot               | Portal mismatch                   | Register exact `http://localhost:5173/auth/riot/callback`.         |
| 401/403 on `/accounts/me`                  | Wrong cluster or bad token        | Try `RIOT_ACCOUNT_CLUSTER=asia` (or region that matches player).   |

Check the terminal running `npm run dev` for server-side error details.

---

## What is **not** included yet

These need **production** Valorant API access and/or extra work:

- **Current rank / peak rank** — no dedicated Riot endpoint; requires `VAL-MATCH-V1` + match history parsing.
- **Production / preview deploy** — wait for Riot approval; use localhost only on WIP branch.
- **Required Riot ID for tournament registration** — can be wired after linking is stable.

---

## Policy checklist (before public launch)

- [ ] Riot production key + RSO client approved
- [ ] Opt-in disclaimer visible before link (implemented)
- [ ] Valorant tournament non-affiliation text on event pages (implemented)
- [ ] General Riot legal boilerplate in site footer (add before launch)
- [ ] RSO live within 30 days of Valorant key approval (Riot requirement)
- [ ] Redirect URIs registered for each deployed origin

---

## When you are ready for production

1. Merge WIP branch after review.
2. Add Riot env vars to Vercel **production** (and preview only if you intend to test linking there).
3. Register production redirect URI: `https://your-domain/auth/riot/callback`.
4. Re-test link, unlink, and public visibility on the live URL.
5. Do **not** use the development `RGAPI-…` key on the public site.

---

## Related docs

- [solution-design.md](./solution-design.md) — §9 Riot / Valorant account linking
- [Riot Valorant Developer Policy](https://developer.riotgames.com/docs/valorant)
