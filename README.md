# Black Rose Arena

A community esports tournament platform for creating, managing, and competing in organized events. Members sign in with Discord, build profiles and teams, register for tournaments, and follow live brackets. Operators run the full lifecycle from the admin console.

Built with **React 19**, **TanStack Start**, **Supabase**, and **Tailwind CSS v4**.

---

## Prerequisites

- **Node.js** `22.12+` — check with `node -v`
- **npm** `10+` — check with `npm -v`
- **Git**
- A **Supabase** project (PostgreSQL + Auth)
- A **Discord** application (OAuth2 for member login)

---

## Getting Started

**1. Clone and install**

```bash
git clone https://github.com/your-org/blackrose-arena.git
cd blackrose-arena
npm install
```

**2. Configure environment**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Purpose |
| -------- | ------- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes (OAuth, profiles) — **never expose in the client** |
| `VITE_DISCORD_CLIENT_ID` | Discord OAuth app client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret (server only) |
| `VITE_SITE_URL` | Public site URL for Open Graph previews (production: `https://blackrose.asia`) |
| `VITE_DISCORD_SERVER_INVITE` | Invite link shown on waitlist / onboarding |

Register each deployment callback in Discord → OAuth2 → Redirects, e.g. `http://localhost:3000/auth/callback`.

**3. Set up the database**

Run the SQL scripts in Supabase SQL Editor. Start with [docs/README.md](./docs/README.md) for the admin flow and table overview, then run scripts under [docs/sql/](./docs/sql/) as needed (members, teams, tournaments, member profiles, admin accounts, etc.).

**4. Start the dev server**

```bash
npm run dev
```

Open **http://localhost:3000**

- **Members:** `/login` → Discord OAuth
- **Admin console:** `/login?console=1` → username/password from `admin_accounts` (see [docs/sql/create_admin_account.sql](./docs/sql/create_admin_account.sql))

---

## Available Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier on all files |

---

## Key Pages

| URL | Description |
| --- | ----------- |
| `/` | Public landing page |
| `/tournaments` | Tournament directory (game & status filters) |
| `/tournaments/:id` | Tournament detail — overview, teams, bracket, rules, results |
| `/champions` | Hall of Champions archive |
| `/community` | Guild values and community info |
| `/login` | Sign in with Discord |
| `/register` | Register with Discord → waitlist if unverified |
| `/auth/callback` | Discord OAuth callback (handled automatically) |
| `/waitlist` | Pending verification after registration |
| `/dashboard` | Member dashboard (verified members) |
| `/dashboard/profile` | Edit profile — identity, player info, Valorant ID, socials |
| `/members/:slug` | Public member profile |
| `/teams` | My teams overview |
| `/teams/create` | Create a team |
| `/teams/:id` | Team detail — roster, invites, tournament registration |
| `/admin` | Admin dashboard |
| `/admin/users` | Member registry & verification |
| `/admin/teams` | Team directory |
| `/admin/tournaments` | Tournament management |
| `/admin/tournaments/:id` | Bracket manager, registrations, seeding |
| `/admin/participants` | Registration approval queue |
| `/admin/announcements` | Broadcast center (UI only — see status below) |
| `/admin/settings` | Console settings |

---

## Project Structure

```text
src/
├── features/           # Feature modules (main source of truth)
│   ├── landing/        # Public home page
│   ├── auth/           # Discord OAuth, session, member auth server fns
│   ├── member/         # Profiles, dashboard, profile comments
│   ├── teams/          # Team creation, roster, invites
│   ├── tournaments/    # Public tournament UI, registration, brackets
│   ├── championships/  # Hall of Champions
│   ├── community/      # Community / guild page
│   ├── notifications/  # In-app notification bell & sync
│   └── admin/          # Admin console (members, teams, tournaments, bracket)
├── routes/             # TanStack Router file-based routes (thin page shells)
├── components/ui/      # shadcn/ui primitives
└── lib/                # Supabase client, shared types, utilities

docs/
├── README.md           # Supabase setup & admin flow
├── ADMIN_DATABASE.md   # Detailed schema reference
├── ADMIN_TOURNAMENTS.md
└── sql/                # Migration scripts
```

Route files stay thin — they compose pages from `features/`. The `@/` alias maps to `src/`.

---

## Tech Stack

- **[React 19](https://react.dev)** — UI
- **[TanStack Start](https://tanstack.com/start)** — Full-stack React with SSR
- **[TanStack Router](https://tanstack.com/router)** — File-based routing
- **[Supabase](https://supabase.com)** — PostgreSQL, RLS, realtime
- **[Tailwind CSS v4](https://tailwindcss.com)** — Styling
- **[shadcn/ui](https://ui.shadcn.com)** — UI primitives
- **[Vite 7](https://vite.dev)** — Build tool

---

## Current Status

The platform is **production-capable** with Supabase as the backend. Shared domain types still live in `src/lib/mock-data.ts` (historical name only — data comes from Supabase services).

### Completed

**Auth & members**

- Discord OAuth2 sign-in and registration (`/auth/callback`, server token exchange)
- Client session in `localStorage` with verification sync from database
- Waitlist for unverified members; admin verification in `/admin/users`
- Separate admin console login (`admin_accounts` + RPC)

**Profiles**

- Member profiles (`member_profiles`, social links) with public `/members/:slug`
- Profile editing — display name, bio, game/role, socials, privacy
- Manual **Valorant IGN + tagline** (shown in Valorant rosters, invites, and tournament views)
- Profile comments on public profiles
- Profile completion score on dashboard

**Teams**

- Create teams, captain roster management, member invites (pending → accept)
- Game-specific roles; Valorant competitive names (`IGN#TAG`) in rosters
- One active team per game per member; roster capacity limits

**Tournaments (public)**

- Tournament directory and detail pages from Supabase
- Team and solo registration flows; captain register from tournament page
- Public bracket view (single/double elimination, Swiss)
- Results board and podium for concluded events

**Tournaments (admin)**

- Create/edit/archive tournaments (Valorant, LoL, TFT, Where Winds Meet)
- Solo vs team participation modes
- Registration queue — approve, reject, bulk approve, veteran (`Previously Competed`) status
- Add teams/players to events; roster sync from live team data
- Bracket manager — seeding, scores, Swiss groups, playoff pairing, publish
- Prize breakdown on tournaments

**Other**

- Hall of Champions (`/champions`) from completed tournament data
- Community page (`/community`)
- In-app notifications (team invites, registration updates) with realtime sync
- Admin dashboard overview

### Not yet / partial

- **Announcements** — admin UI uses static mock data; no database persistence or Discord posting
- **Riot Sign-On (RSO)** — not integrated; Valorant identity is manual IGN + tagline only
- **Discord ROSE role sync** — Cloudflare Cron Worker (`workers/discord-sync`) or optional Gateway bot; see [docs/discord-bot.md](./docs/discord-bot.md)
- **Email notifications** — in-app only today

---

## Documentation

| Doc | Contents |
| --- | -------- |
| [docs/README.md](./docs/README.md) | Supabase tables, admin flow, env checklist |
| [docs/SUPABASE_STAGING_CLONE.md](./docs/SUPABASE_STAGING_CLONE.md) | Clone prod DB to a staging project (local + preview) |
| [docs/SUPABASE_PROD_MIGRATION.md](./docs/SUPABASE_PROD_MIGRATION.md) | Migrate old prod DB to new Supabase (`efchfvreaotskrdlweze`) |
| [docs/ADMIN_DATABASE.md](./docs/ADMIN_DATABASE.md) | Schema detail, TypeScript mappings, RLS notes |
| [docs/ADMIN_TOURNAMENTS.md](./docs/ADMIN_TOURNAMENTS.md) | Tournament & bracket setup step-by-step |
| [docs/sql/](./docs/sql/) | SQL migration scripts |

---

## Notes for Contributors

- **Do not edit `routeTree.gen.ts`** — auto-generated by TanStack Router.
- Add pages by creating files in `src/routes/`.
- Add shadcn components with `npx shadcn@latest add <component>`.
- Never commit `.env` or expose `SUPABASE_SERVICE_ROLE_KEY` / `DISCORD_CLIENT_SECRET` to the client.
- Server functions under `src/features/*/functions/` and `src/features/*/server/` use the service role for writes; browser services use the anon key with RLS.
- When adding DB columns, add a matching script under `docs/sql/` and document it in [docs/README.md](./docs/README.md).
