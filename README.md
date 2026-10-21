# Black Rose Arena

Community esports platform for **Black Rose**. Manage game profiles and memberships, build teams, join tournaments and follow live brackets.

**Stack:** React 19 · TanStack Start · Supabase · Tailwind CSS v4

## Features

- **My Games:** per-game identities, roles and character details, with an independent Main Game preference.
- **Memberships:** member applications, admin rosters and acceptance notifications.
- **Profiles:** privacy controls and public `/br/{slug}` links showing accepted affiliations.
- **Teams and tournaments:** rosters, invites, registrations, brackets and Hall of Champions.
- **Admin console:** manage members, games and the tournament lifecycle.
- **Community:** game servers, guilds and the WoW Forever launch announcement/countdown.

See [patch notes](docs/patch-notes.md) for the latest changes.

## Quick start

Requires Node.js **22.12+**, npm **10+**, a Supabase project and a Discord OAuth application.

1. Install dependencies with `npm install`.
2. Create an ignored `.env.local` with the settings below. Use **Dev/Preview**, not production, for local development.
3. Register `http://localhost:3000/auth/callback` as a Discord OAuth redirect.
4. Run `npm run dev` and open **http://localhost:3000**.

| Setting                      | Purpose                                                   |
| ---------------------------- | --------------------------------------------------------- |
| `VITE_SUPABASE_URL`          | Supabase project URL, shared by browser/server            |
| `VITE_SUPABASE_ANON_KEY`     | Public browser credential                                 |
| `SUPABASE_SERVICE_ROLE_KEY`  | Server-only database credential                           |
| `VITE_DISCORD_CLIENT_ID`     | Public Discord application ID                             |
| `DISCORD_CLIENT_SECRET`      | Server-only OAuth secret                                  |
| `SESSION_SECRET`             | Server-only signing secret, at least 32 random characters |
| `VITE_SITE_URL`              | Site URL for previews/metadata                            |
| `VITE_DISCORD_SERVER_INVITE` | Optional community invite override                        |

Never commit environment files or expose server secrets with a `VITE_` prefix. Members sign in at `/login`; admins use `/login?console=1`. Existing users must sign in again after the trusted-session update.

**Database setup:** start with [docs/README.md](docs/README.md). Before releasing this update to Main/Prod, follow [the SQL rollout guide](docs/main-production-sql-rollout.md)—do not run every SQL file or copy Dev data into production.

## Scripts

| Command                                    | Purpose                  |
| ------------------------------------------ | ------------------------ |
| `npm run dev`                              | Dev server               |
| `npm run build`                            | Production build         |
| `npm run preview`                          | Preview production build |
| `npm run lint`                             | ESLint                   |
| `npm run format`                           | Prettier                 |
| `node --import tsx --test tests/*.test.ts` | Regression tests         |

Discord tooling is documented in [docs/discord-bot.md](docs/discord-bot.md). Automatic Discord-based **game acceptance is deferred**; this update uses manual admin acceptance.

## Key routes

| Path                                   | Purpose                                              |
| -------------------------------------- | ---------------------------------------------------- |
| `/`                                    | Landing                                              |
| `/tournaments`, `/tournaments/$id`     | Directory + detail (overview, teams, bracket, rules) |
| `/champions`                           | Hall of Champions                                    |
| `/dashboard`, `/dashboard/profile`     | Overview / My Games / Teams and profile editing      |
| `/br/$slug`                            | Public profile; old `/members/$slug` links redirect  |
| `/teams`, `/teams/$id`                 | Team list + roster / invites                         |
| `/community`, `/community/wow-forever` | Community and launch announcement                    |
| `/admin/*`                             | Operator console                                     |

## Documentation

| Doc                                                           | When you need it                                      |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| [Patch notes](docs/patch-notes.md)                            | Simple feature summary                                |
| [Production SQL rollout](docs/main-production-sql-rollout.md) | Exact migrations, checks and deployment order         |
| [Database docs](docs/README.md)                               | Schema/setup and feature guides                       |
| [Tournament setup](docs/ADMIN_TOURNAMENTS.md)                 | Tournament and bracket configuration                  |
| [Domain glossary](GLOSSARY.md)                                | Main Game, profiles, roles and membership definitions |

## Contributor notes

Keep feature logic/UI in `src/features/`, route composition in `src/routes/`, and shared primitives in `src/components/ui/`. Do not edit generated `routeTree.gen.ts`. Document schema changes under `docs/sql/` with release/recovery instructions. Riot Sign-On, email notifications and an announcements admin UI remain outside this update.
