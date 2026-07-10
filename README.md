# Black Rose Arena

Community esports platform for **Black Rose** — Discord members create profiles and teams, register for tournaments, and follow live brackets. Operators run the full event lifecycle from an admin console.

**Stack:** React 19 · TanStack Start · Supabase · Tailwind CSS v4

---

## Quick start

```bash
git clone https://github.com/reyowner/black-rose.git
cd black-rose
npm install
cp .env.example .env   # fill in Supabase + Discord values
npm run dev
```

App runs at **http://localhost:3000**

| Who | How to sign in |
| --- | --- |
| Members | `/login` → Discord OAuth |
| Admins | `/login?console=1` → username/password from `admin_accounts` |

> **Database:** New environments need the SQL under [`docs/sql/`](./docs/sql/). Start with [`docs/README.md`](./docs/README.md).

---

## Prerequisites

- Node.js **22.12+** (`node -v`)
- npm **10+**
- A [Supabase](https://supabase.com) project
- A [Discord application](https://discord.com/developers/applications) (OAuth2)

---

## Environment

Copy `.env.example` → `.env`. Minimum to run locally:

| Variable | Where used | Notes |
| -------- | ---------- | ----- |
| `VITE_SUPABASE_URL` | Client + server | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | OAuth / privileged writes — **never** prefix with `VITE_` |
| `VITE_DISCORD_CLIENT_ID` | Client | Discord app ID |
| `DISCORD_CLIENT_SECRET` | Server only | Discord OAuth secret |
| `VITE_SITE_URL` | Client | OG previews (prod: `https://blackrose.asia`) |
| `VITE_DISCORD_SERVER_INVITE` | Client | Invite shown on waitlist |

Register OAuth redirects in Discord → OAuth2 → Redirects, e.g. `http://localhost:3000/auth/callback`.

Full list (bot sync, Capacitor, waitlist channels): see [`.env.example`](./.env.example).

---

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

Optional Discord tooling: `npm run discord-bot`, `npm run discord-sync:dev` — see [`docs/discord-bot.md`](./docs/discord-bot.md).

---

## How the codebase is organized

```text
src/
├── features/     # Domain logic + UI (source of truth)
│   ├── auth/           Discord OAuth, session
│   ├── member/         Profiles, dashboard, comments
│   ├── teams/          Rosters, invites
│   ├── tournaments/    Public tournament UI + brackets
│   ├── championships/  Hall of Champions
│   ├── notifications/  In-app bell + realtime
│   └── admin/          Console (members, teams, events, brackets)
├── routes/       # Thin TanStack Router pages — compose from features/
├── components/ui # shadcn primitives
└── lib/          # Supabase client, shared helpers
```

**Mental model**

1. Put business logic and feature UI in `src/features/<area>/`.
2. Keep `src/routes/` thin — load data, render feature components.
3. `@/` maps to `src/`.
4. Do **not** edit `routeTree.gen.ts` — TanStack Router generates it.

Shared domain types still live in `src/lib/mock-data.ts` (legacy name). Runtime data comes from Supabase services, not mocks.

---

## Key routes

| Path | Purpose |
| ---- | ------- |
| `/` | Landing |
| `/tournaments`, `/tournaments/$id` | Directory + detail (overview, teams, bracket, rules) |
| `/champions` | Hall of Champions |
| `/dashboard`, `/dashboard/profile` | Member home + profile edit |
| `/members/$slug` | Public profile |
| `/teams`, `/teams/$id` | Team list + roster / invites |
| `/admin/*` | Operator console |

---

## What works today

- Discord OAuth for members; separate admin login
- Profiles, teams, invites, tournament registration
- Admin tournament lifecycle: create → approve entries → seed → score → publish bracket
- Bracket formats: single elim, double elim, Swiss
- Round schedules (admin-set, shown on public overview / bracket)
- In-app notifications (invites, registration status)

**Still partial / not built**

- Announcements admin UI (no persistence yet)
- Riot Sign-On (Valorant IGN is manual)
- Email notifications (in-app only)

---

## Docs map

| Doc | When you need it |
| --- | ---------------- |
| [`docs/README.md`](./docs/README.md) | Supabase tables, admin login SQL, env checklist |
| [`docs/ADMIN_DATABASE.md`](./docs/ADMIN_DATABASE.md) | Schema detail, RLS notes |
| [`docs/ADMIN_TOURNAMENTS.md`](./docs/ADMIN_TOURNAMENTS.md) | Tournament + bracket setup |
| [`docs/SUPABASE_STAGING_CLONE.md`](./docs/SUPABASE_STAGING_CLONE.md) | Clone prod → staging |
| [`docs/SUPABASE_PROD_MIGRATION.md`](./docs/SUPABASE_PROD_MIGRATION.md) | Production DB cutover |
| [`docs/sql/`](./docs/sql/) | Migration scripts |
| [`docs/discord-bot.md`](./docs/discord-bot.md) | ROSE role sync worker / bot |

---

## Contributor notes

- Add pages as files under `src/routes/`.
- Add UI primitives with `npx shadcn@latest add <component>`.
- Never commit `.env`. Keep `SUPABASE_SERVICE_ROLE_KEY` and `DISCORD_CLIENT_SECRET` server-only.
- Browser code uses the anon key + RLS; server functions under `features/*/functions/` or `features/*/server/` may use the service role.
- New DB columns → add a script in `docs/sql/` and note it in [`docs/README.md`](./docs/README.md).
- Prefer small, focused PRs. Match existing commit style (`feat:`, `fix:`, `docs:`).
