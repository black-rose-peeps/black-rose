# Admin Database Guide (Supabase)

> **Start here:** [README.md](./README.md) — short table list and flow for the five admin feature folders.  
> This file adds TypeScript mappings, enum literals, RLS notes, and wiring details.

Reference for implementing the Black Rose **admin console** on **Supabase** (PostgreSQL + Auth + RLS). The frontend currently uses in-memory mock services; this doc lists **only what the admin feature folders define today**.

---

## Supabase setup (quick)

1. Create a Supabase project.
2. Enable **Auth** (email or Discord OAuth later).
3. Run the SQL migrations for the tables below (use `uuid` PKs with `gen_random_uuid()`).
4. Add **Row Level Security** policies — admin writes require `profiles.role` in `('Tournament Admin', 'Super Admin')`.
5. Replace mock services with `@supabase/supabase-js` calls (see [Files to wire](#files-to-wire-at-the-end)).

**Suggested client env:**

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Use the **service role key** only in Edge Functions / server jobs, never in the browser.

---

## Admin flow

```text
Members → Teams → Tournaments → Participants (registrations) → Bracket (tournament/)
```

---

## 1. Members

**Code:** `src/features/admin/features/members/`

### TypeScript (strict)

```ts
type AdminMemberRole = "User" | "Tournament Admin" | "Super Admin";
type AdminMemberStatus = "Active" | "Suspended" | "Banned";

interface AdminMember {
  id: string;
  username: string;
  discordUsername: string;
  discordId: string | null;
  role: AdminMemberRole;
  status: AdminMemberStatus;
  registrationDate: string; // ISO date "YYYY-MM-DD"
  email?: string | null;    // legacy mock only
}

interface CreateMemberInput {
  username: string;
  discordUsername: string;
  discordId?: string;
  role: AdminMemberRole;
}
```

### Supabase table: `profiles`

| Column | Postgres type | Constraints |
|--------|---------------|-------------|
| `id` | `uuid` | **PK**, **FK → `auth.users(id) ON DELETE CASCADE`** (same UUID as Auth user; no separate default) |
| `username` | `text` | NOT NULL, UNIQUE |
| `discord_username` | `text` | NOT NULL, UNIQUE |
| `discord_id` | `text` | NULL, UNIQUE |
| `email` | `text` | NULL |
| `role` | `text` | NOT NULL, CHECK in (`User`, `Tournament Admin`, `Super Admin`) |
| `status` | `text` | NOT NULL, CHECK in (`Active`, `Suspended`, `Banned`) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

**Auth linkage:** `profiles.id` is the same UUID as the Supabase Auth user (`auth.users.id`). Create a profile row when a user signs up (database trigger on `auth.users` insert, or admin create flow). There is no separate profile UUID — `AdminMember.id` maps directly to `auth.uid()` for RLS.

**Maps to:** `AdminMember` (`id` ← `profiles.id`, `registrationDate` ← `created_at::date`). When a profile is created by an admin without Auth, either provision an Auth user first or defer until the member signs in.

---

## 2. Teams

**Code:** `src/features/admin/features/teams/`  
**Shared types:** `src/features/teams/types/index.ts`

### TypeScript (strict)

```ts
type TeamMemberStatus = "captain" | "active" | "invited" | "removed";

type TeamMemberRole =
  | "IGL" | "Duelist" | "Controller" | "Initiator" | "Sentinel" | "Flex"
  | "AWPer" | "Rifler" | "Support" | "Lurker" | "Top" | "Mid" | "ADC" | "Jungle"
  | "Roam" | "EXP" | "Gold" | "Sub" | "TBD";

interface TeamMember {
  userId: string;
  username: string;
  displayName: string;
  avatarInitials: string;
  ign: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joinedAt: string; // ISO datetime
}

interface Team {
  id: string;
  name: string;
  tag: string;
  game: "Valorant" | "League of Legends" | "Teamfight Tactics" | "Multi";
  captainUserId: string;
  members: TeamMember[];
  createdAt: string;
  activeTournamentId: string | null;
  activeTournamentName: string | null;
}

interface CreateTeamInput {
  name: string;
  tag: string;
  game: Team["game"];
  captainMemberId: string;
}

interface AddTeamMemberInput {
  teamId: string;
  memberId: string;
  role?: TeamMemberRole;
}
```

### Supabase table: `teams`

| Column | Postgres type | Constraints |
|--------|---------------|-------------|
| `id` | `uuid` | **PK** |
| `name` | `text` | NOT NULL |
| `tag` | `text` | NOT NULL, UNIQUE |
| `game` | `text` | NOT NULL, CHECK in (`Valorant`, `League of Legends`, `Teamfight Tactics`, `Multi`) |
| `captain_user_id` | `uuid` | NOT NULL, **FK → `profiles.id`** |
| `active_tournament_id` | `uuid` | NULL, **FK → `tournaments.id`** |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

### Supabase table: `team_members`

| Column | Postgres type | Constraints |
|--------|---------------|-------------|
| `id` | `uuid` | **PK** |
| `team_id` | `uuid` | NOT NULL, **FK → `teams.id` ON DELETE CASCADE** |
| `user_id` | `uuid` | NOT NULL, **FK → `profiles.id`** |
| `ign` | `text` | NOT NULL |
| `role` | `text` | NOT NULL (see `TeamMemberRole`) |
| `status` | `text` | NOT NULL, CHECK in (`captain`, `active`, `invited`, `removed`) |
| `joined_at` | `timestamptz` | NOT NULL, default `now()` |

**Unique (partial index):** one active membership per user per team. Implement as a PostgreSQL partial unique index (not a table-level UNIQUE constraint):

```sql
create unique index unique_active_team_member
  on team_members (team_id, user_id)
  where status <> 'removed';
```

This allows multiple `removed` rows for the same pair while preventing duplicate active/captain/invited memberships.

`username`, `displayName`, `avatarInitials` can be joined from `profiles` at query time.

---

## 3. Tournaments

**Code:** `src/features/admin/features/tournaments/`

### TypeScript (strict)

```ts
type TournamentStatus =
  | "Draft"
  | "Registration Open"
  | "Registration Closed"
  | "Live"
  | "Completed"
  | "Archived";

type TournamentGame = "Valorant" | "League of Legends" | "Teamfight Tactics";
type TournamentFormat = "Single Elimination" | "Double Elimination";
type PrizeCurrency = "PHP" | "USD";

interface AdminTournament {
  id: string;
  name: string;
  game: TournamentGame;
  status: TournamentStatus;
  prizePool: string;           // display, e.g. "₱10,000"
  startDate: string;
  registrationDeadline: string;
  teamsRegistered: number;
  teamCap: number;
  format: string;              // TournamentFormat at create time
  region: string;
}

interface CreateTournamentInput {
  name: string;
  game: TournamentGame;
  format: TournamentFormat;
  prizePool: string;
  startDate: string;
  registrationDeadline: string;
  teamCap: number;
  region: string;
  status?: TournamentStatus;
}

// Form-only (not stored as-is):
interface CreateTournamentFormValues {
  prizeCurrency: PrizeCurrency;
  prizeAmount: string;         // digits only in UI, formatted to prizePool on save
  teamCap: string;
  // ...same fields as CreateTournamentInput
}
```

### Supabase table: `tournaments`

| Column | Postgres type | Constraints |
|--------|---------------|-------------|
| `id` | `uuid` | **PK**, default `gen_random_uuid()` |
| `slug` | `text` | NULL, UNIQUE (human-readable URL, e.g. `lol-twilight`) |
| `name` | `text` | NOT NULL |
| `game` | `text` | NOT NULL, CHECK in (`Valorant`, `League of Legends`, `Teamfight Tactics`) |
| `format` | `text` | NOT NULL, CHECK in (`Single Elimination`, `Double Elimination`) |
| `status` | `text` | NOT NULL, CHECK (see `TournamentStatus`) |
| `prize_pool` | `text` | NOT NULL |
| `prize_currency` | `text` | NULL, CHECK in (`PHP`, `USD`) |
| `prize_amount` | `integer` | NULL (raw digits from form) |
| `region` | `text` | NOT NULL |
| `team_cap` | `integer` | NOT NULL |
| `teams_registered` | `integer` | NOT NULL, default `0` |
| `start_date` | `date` | NOT NULL |
| `registration_deadline` | `date` | NOT NULL |
| `created_at` | `timestamptz` | default `now()` |

**Bracket team counts (app logic today — required by bracket manager UI):**

- Single Elimination → **16** teams (validate at registration close)
- Double Elimination → **8** teams (validate at registration close)

> **Note:** The bracket manager UI expects exactly 16 teams for SE and 8 for DE. Tournaments with different team counts require bracket generation logic updates before publish.

---

## 4. Participants (registrations)

**Code:** `src/features/admin/features/participants/`  
**Store:** `tournament-registrations.service.ts`

### TypeScript (strict)

Uses `MockTeam` from `src/lib/mock-data.ts`:

```ts
interface MockPlayer {
  ign: string;
  role: string;
  discord: string;
}

interface MockTeam {
  id: string;
  rosterTeamId?: string;       // FK to admin Team.id
  name: string;
  tag: string;
  captain: string;
  members: MockPlayer[];
  registrationDate: string;
  status: "Pending" | "Approved" | "Rejected";
  tournamentId: string;
  history: string[];
}

type ParticipantRegistration = MockTeam;

interface ParticipantRow extends MockTeam {
  tournamentName: string;      // joined from tournaments.name
}
```

### Supabase table: `tournament_registrations`

| Column | Postgres type | Constraints |
|--------|---------------|-------------|
| `id` | `uuid` | **PK** |
| `tournament_id` | `uuid` | NOT NULL, **FK → `tournaments.id`** |
| `team_id` | `uuid` | NOT NULL, **FK → `teams.id`** |
| `status` | `text` | NOT NULL, CHECK in (`Pending`, `Approved`, `Rejected`) |
| `registered_at` | `date` | NOT NULL |
| `approved_at` | `timestamptz` | NULL |
| `approved_by` | `uuid` | NULL, **FK → `profiles.id`** |

**Unique:** `(tournament_id, team_id)`.

Roster players at registration time: either join `team_members` live or snapshot in `tournament_registration_members` (not in frontend types yet — optional JSON column `members_snapshot jsonb` if you want parity with mock).

On **Approved**: set `teams.active_tournament_id = tournament_id`.

---

## 5. Tournament bracket (admin)

**Code:** `src/features/admin/features/tournament/`  
**UI:** `BracketManager.tsx`, `ProfessionalMatchCard.tsx` (unchanged location)

### TypeScript (strict)

From `src/features/admin/types/index.ts`:

```ts
type BracketStatus = "not_generated" | "draft" | "published";

interface AdminBracketMatch {
  id: string;
  round: string;
  teamA: string | null;        // team name string in UI
  teamB: string | null;
  scoreA: number | "";
  scoreB: number | "";
  winner: string | null;
  confirmed: boolean;
}

interface AdminBracketRound {
  label: string;
  matches: AdminBracketMatch[];
}
```

**UI ↔ SQL mapping (`AdminBracketMatch`):**

- `teamA` / `teamB` — display names resolved by joining `tournament_registrations` → `teams` (DB stores `team_a_registration_id` / `team_b_registration_id` as UUID FKs).
- `scoreA` / `scoreB` — integers in the DB (`score_a`, `score_b`); the UI type allows `number | ""` for empty inputs. Transform at the service layer when reading/writing.
- `winner` — registration team name in the UI; DB uses `winner_registration_id`.
- Bracket engine `nextMatchSlot` uses camelCase (`"teamA" | "teamB"`) in TypeScript; persist as snake_case (`team_a`, `team_b`) in `next_match_slot`.

From `src/features/admin/features/tournament/types/bracket-engine.ts`:

```ts
interface BracketMatch {
  matchId: string;
  roundNumber: number;
  matchNumber: number;
  teamA: string | null;
  teamB: string | null;
  scoreA: number | "";
  scoreB: number | "";
  winner: string | null;
  confirmed: boolean;
  nextMatchId: string | null;
  nextMatchSlot: "teamA" | "teamB" | null;
  position: { x: number; y: number };
}

interface BracketRound {
  roundNumber: number;
  roundName: string;
  matches: BracketMatch[];
}

interface BracketStructure {
  totalTeams: number;
  totalRounds: number;
  rounds: BracketRound[];
}
```

**Double elimination preview columns (8 teams):**

```text
Upper R1 → Upper Semifinals → Grand Final ← Lower R1 ← Lower Final
                              (center)
```

Grand Final slots: **Upper bracket winner** vs **Lower bracket winner**.

### Supabase tables (bracket persistence)

#### `bracket_rounds`

| Column | Postgres type | Constraints |
|--------|---------------|-------------|
| `id` | `uuid` | **PK** |
| `tournament_id` | `uuid` | NOT NULL, **FK → `tournaments.id`** |
| `label` | `text` | NOT NULL |
| `sort_order` | `integer` | NOT NULL |
| `bracket_side` | `text` | CHECK in (`upper`, `lower`, `main`, `grand_final`) |
| `round_number` | `integer` | NULL |

#### `bracket_matches`

| Column | Postgres type | Constraints |
|--------|---------------|-------------|
| `id` | `uuid` | **PK** |
| `round_id` | `uuid` | NOT NULL, **FK → `bracket_rounds.id` ON DELETE CASCADE** |
| `match_number` | `integer` | NOT NULL |
| `team_a_registration_id` | `uuid` | NULL, **FK → `tournament_registrations.id`** |
| `team_b_registration_id` | `uuid` | NULL, **FK → `tournament_registrations.id`** |
| `score_a` | `integer` | NULL |
| `score_b` | `integer` | NULL |
| `winner_registration_id` | `uuid` | NULL, **FK → `tournament_registrations.id`** |
| `confirmed` | `boolean` | NOT NULL, default `false` |
| `next_match_id` | `uuid` | NULL, **FK → `bracket_matches.id`** |
| `next_match_slot` | `text` | NULL, CHECK in (`team_a`, `team_b`) |

#### `tournament_bracket_state` (optional, 1 row per tournament)

| Column | Postgres type | Notes |
|--------|---------------|--------|
| `tournament_id` | `uuid` | **PK**, **FK → `tournaments.id`** |
| `status` | `text` | `not_generated`, `draft`, `published` |
| `bracket_locked` | `boolean` | default `false` |
| `updated_at` | `timestamptz` | |

---

## Entity relationships

```text
profiles
  ├── team_members ──► teams
  │                      │
  │                      └── active_tournament_id ──► tournaments
  │
  └── tournament_registrations ◄── teams
            │
            └── tournament_id ──► tournaments
                      │
                      ├── bracket_rounds
                      │       └── bracket_matches
                      └── tournament_bracket_state
```

---

## RLS (Supabase) — minimal

**Prerequisites:** Supabase Auth must be enabled. `auth.uid()` returns the authenticated user's UUID (matches `profiles.id`). Unauthenticated requests fail these policies — that is expected; use the anon key only for public read paths you explicitly allow.

```sql
-- Example: only admins insert tournaments
create policy "admins manage tournaments"
on tournaments for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('Tournament Admin', 'Super Admin')
  )
);
```

Repeat similar policies for `profiles`, `teams`, `team_members`, `tournament_registrations`, `bracket_*`.

---

## Mock tournament IDs (testing)

| ID | Name | Game | Format |
|----|------|------|--------|
| `vlr-nightfall` | Valorant Nightfall Cup | Valorant | Single Elimination (16) |
| `lol-twilight` | Twilight Clash | League of Legends | Double Elimination (8) |

---

## Files to wire at the end

| Mock service | Supabase tables |
|--------------|-----------------|
| `members/services/members.service.ts` | `profiles` |
| `teams/services/teams.service.ts` | `teams`, `team_members` |
| `tournaments/services/tournaments.service.ts` | `tournaments` |
| `tournaments/services/tournament-registrations.service.ts` | `tournament_registrations` |
| `tournament/components/BracketManager.tsx` | `bracket_rounds`, `bracket_matches`, `tournament_bracket_state` |
| `participants/services/participants.service.ts` | `tournament_registrations` (+ join `tournaments`) |

Public tournament page types (`TournamentDetail`, `BracketRound` in `src/features/tournaments/types`) can read the same bracket tables with a read-only Supabase view.

---

## Recommended indexes

PostgreSQL auto-indexes primary keys and UNIQUE constraints; foreign keys are **not** auto-indexed — add these for typical admin and public queries:

| Table | Index columns |
|-------|---------------|
| `profiles` | `(username)`, `(discord_username)` |
| `teams` | `(captain_user_id)`, `(active_tournament_id)` |
| `team_members` | `(team_id, status)`, `(user_id)` |
| `tournaments` | `(game, status)`, `(start_date)`, `(slug)` |
| `tournament_registrations` | `(tournament_id, status)`, `(team_id)` |
| `bracket_matches` | `(round_id, match_number)`, `(next_match_id)` |
