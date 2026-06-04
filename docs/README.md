# Black Rose Admin — Supabase Database

What you need in **Supabase (PostgreSQL)** to back the admin console flow. The app still uses mock services; these tables replace them.

**Detailed reference (TypeScript types, RLS examples, bracket columns):** [ADMIN_DATABASE.md](./ADMIN_DATABASE.md)

**Tournaments & bracket Supabase setup (step-by-step):** [ADMIN_TOURNAMENTS.md](./ADMIN_TOURNAMENTS.md)

---

## Admin Console Login

The Admin Console (`/login?console=1` → `/admin`) uses a **username + password** flow separate from the Discord OAuth used by regular members.

### How it works (mock / current)

Credentials are stored **in-memory** in `src/features/admin/auth/admin-session.ts`. A default seed account exists for development:

| Username | Password        |
| -------- | --------------- |
| `admin`  | `blackrose2026` |

When you register a new member with the **Admin** role in the Members panel, you set a password at creation time. That credential is registered in the in-memory store immediately and can be used to log in to the console in the same browser session.

> **Note:** The in-memory store is reset on every page refresh. Real credentials must be persisted to Supabase (see below).

### Supabase — what to add for real admin login

Add a `console_password_hash` column to the `members` table (or a separate `admin_credentials` table):

```sql
alter table members
  add column console_password_hash text null;
```

When an Admin member is created, hash the password server-side (bcrypt / Supabase Edge Function) and store it in `console_password_hash`. On login, compare the submitted password against the stored hash. **Never store plain-text passwords.**

Alternatively, use **Supabase Auth email+password** for admin accounts:

1. Create a Supabase Auth user (`auth.users`) with `email = <username>@blackrose.admin` and the chosen password.
2. Link it to the `members` row via the same UUID.
3. Sign in with `supabase.auth.signInWithPassword()` in `AdminConsoleLogin.tsx`.
4. Update `isAdminConsoleAuthenticated()` to check the Supabase session instead of `localStorage`.

Required env vars (already needed for the rest of the app):

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Admin flow

```text
Members → Teams → Tournaments → Participants → Bracket
```

| Step | Admin folder                            | What happens                                                                       |
| ---- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| 1    | `features/admin/features/members/`      | Register players                                                                   |
| 2    | `features/admin/features/teams/`        | Create rosters, add members                                                        |
| 3    | `features/admin/features/tournaments/`  | Create/list events — see [ADMIN_TOURNAMENTS.md](./ADMIN_TOURNAMENTS.md)            |
| 4    | `features/admin/features/participants/` | Approve/reject team sign-ups (same table as registrations)                         |
| 5    | `features/admin/features/tournament/`   | Seed bracket, scores, publish — see [ADMIN_TOURNAMENTS.md](./ADMIN_TOURNAMENTS.md) |

---

## Tables (7 required + 1 optional)

> **Tournaments & bracket:** Full SQL, RLS, triggers, and frontend wiring order → [ADMIN_TOURNAMENTS.md](./ADMIN_TOURNAMENTS.md)

### `members` — members (wired in app)

| Column                  | Type        | Notes                   |
| ----------------------- | ----------- | ----------------------- |
| `id`                    | uuid        | **PK**                  |
| `username`              | text        | unique                  |
| `discord_username`      | text        | unique                  |
| `discord_id`            | text        | nullable, unique        |
| `role`                  | text        | `User` \| `Admin`       |
| `status`                | text        | `Active` \| `Suspended` |
| `console_password_hash` | text        | nullable — Admin only   |
| `registered_at`         | date        |                         |
| `created_at`            | timestamptz |                         |

> The `Moderator` role has been removed. Members are either `User` or `Admin`.

---

### `teams` — teams

| Column                 | Type        | Notes                                                               |
| ---------------------- | ----------- | ------------------------------------------------------------------- |
| `id`                   | uuid        | **PK**                                                              |
| `name`                 | text        |                                                                     |
| `tag`                  | text        | unique                                                              |
| `game`                 | text        | `Valorant` \| `League of Legends` \| `Teamfight Tactics` \| `Multi` |
| `captain_user_id`      | uuid        | **FK → profiles.id**                                                |
| `active_tournament_id` | uuid/text   | nullable **FK → tournaments.id**                                    |
| `created_at`           | timestamptz |                                                                     |

---

### `team_members` — teams

| Column      | Type        | Notes                                           |
| ----------- | ----------- | ----------------------------------------------- |
| `id`        | uuid        | **PK**                                          |
| `team_id`   | uuid        | **FK → teams.id**                               |
| `user_id`   | uuid        | **FK → profiles.id**                            |
| `ign`       | text        |                                                 |
| `role`      | text        | in-game role (IGL, Top, ADC, …)                 |
| `status`    | text        | `captain` \| `active` \| `invited` \| `removed` |
| `joined_at` | timestamptz |                                                 |

Unique active membership per `(team_id, user_id)`.

---

### `tournaments` — tournaments

| Column                  | Type         | Notes                                                                                          |
| ----------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| `id`                    | uuid or text | **PK**                                                                                         |
| `name`                  | text         |                                                                                                |
| `game`                  | text         | `Valorant` \| `League of Legends` \| `Teamfight Tactics`                                       |
| `format`                | text         | `Single Elimination` \| `Double Elimination`                                                   |
| `status`                | text         | `Draft` \| `Registration Open` \| `Registration Closed` \| `Live` \| `Completed` \| `Archived` |
| `prize_pool`            | text         | display string, e.g. `₱10,000`                                                                 |
| `region`                | text         |                                                                                                |
| `team_cap`              | integer      |                                                                                                |
| `teams_registered`      | integer      |                                                                                                |
| `start_date`            | date         |                                                                                                |
| `registration_deadline` | date         |                                                                                                |
| `created_at`            | timestamptz  |                                                                                                |

Bracket manager expects **16 teams** (single elim) or **8 teams** (double elim).

---

### `tournament_registrations` — participants + add team on tournament detail

| Column          | Type      | Notes                                 |
| --------------- | --------- | ------------------------------------- |
| `id`            | uuid      | **PK**                                |
| `tournament_id` | uuid/text | **FK → tournaments.id**               |
| `team_id`       | uuid      | **FK → teams.id**                     |
| `status`        | text      | `Pending` \| `Approved` \| `Rejected` |
| `registered_at` | date      |                                       |

Unique `(tournament_id, team_id)`.

When **Approved**: increment `tournaments.teams_registered`, set `teams.active_tournament_id`.

---

### `bracket_rounds` — tournament / BracketManager

| Column          | Type      | Notes                                         |
| --------------- | --------- | --------------------------------------------- |
| `id`            | uuid      | **PK**                                        |
| `tournament_id` | uuid/text | **FK → tournaments.id**                       |
| `label`         | text      | e.g. `Upper — Semifinals`, `Grand Final`      |
| `sort_order`    | integer   | column order in UI                            |
| `bracket_side`  | text      | `upper` \| `lower` \| `main` \| `grand_final` |

---

### `bracket_matches` — tournament / BracketManager

| Column                   | Type    | Notes                                         |
| ------------------------ | ------- | --------------------------------------------- |
| `id`                     | uuid    | **PK**                                        |
| `round_id`               | uuid    | **FK → bracket_rounds.id**                    |
| `match_number`           | integer |                                               |
| `registration_a_id`      | uuid    | nullable **FK → tournament_registrations.id** |
| `registration_b_id`      | uuid    | nullable **FK → tournament_registrations.id** |
| `score_a`                | integer | nullable                                      |
| `score_b`                | integer | nullable                                      |
| `winner_registration_id` | uuid    | nullable **FK → tournament_registrations.id** |
| `confirmed`              | boolean |                                               |

Optional: `next_match_id` **FK → bracket_matches.id**, `next_match_slot` (`teamA` \| `teamB`).

---

### `tournament_bracket_state` — optional

| Column           | Type      | Notes                                     |
| ---------------- | --------- | ----------------------------------------- |
| `tournament_id`  | uuid/text | **PK**, **FK → tournaments.id**           |
| `status`         | text      | `not_generated` \| `draft` \| `published` |
| `bracket_locked` | boolean   |                                           |

---

## Relationships

```text
profiles
  ├── team_members ──► teams
  │                      └── active_tournament_id ──► tournaments
  └── (approver) tournament_registrations

teams ◄── tournament_registrations ──► tournaments
                                              ├── bracket_rounds
                                              │     └── bracket_matches
                                              └── tournament_bracket_state
```

Bracket matches point at **registrations**, not `teams` directly, so the same roster team is scoped to one event.

---

## Folder → Supabase

| Code path                                                  | Read                                            | Write                               |
| ---------------------------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| `admin/auth/admin-session.ts`                              | `members` (password hash)                       | verify console login                |
| `members/services/members.service.ts`                      | `members`                                       | insert `members`                    |
| `teams/services/teams.service.ts`                          | `teams`, `team_members`, `profiles`             | insert/update teams & members       |
| `tournaments/services/tournaments.service.ts`              | `tournaments`                                   | insert `tournaments`                |
| `tournaments/services/tournament-registrations.service.ts` | `tournament_registrations`                      | insert registrations, update counts |
| `participants/services/participants.service.ts`            | `tournament_registrations` + join `tournaments` | update registration `status`        |
| `tournament/` (BracketManager)                             | registrations, `bracket_*`                      | seeding, scores, publish state      |

---

## Supabase checklist

1. Create project, enable **Auth**.
2. Create tables above (uuid PKs, `gen_random_uuid()`).
3. Add **foreign keys** as listed.
4. Enable **RLS** — admin mutations for `Admin` role on `members.role`.
5. Add `console_password_hash` column to `members` for Admin accounts (or use Supabase Auth — see Admin Console Login section above).
6. Set env vars and swap mock services for `@supabase/supabase-js`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Never expose the **service role** key in the browser.

---

## Mock IDs (for local testing)

| ID              | Event                                          |
| --------------- | ---------------------------------------------- |
| `vlr-nightfall` | Valorant Nightfall Cup — Single Elim, 16 teams |
| `lol-twilight`  | Twilight Clash — Double Elim, 8 teams, LoL     |
