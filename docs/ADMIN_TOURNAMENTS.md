# Admin Tournaments & Bracket — Supabase Setup

Step-by-step guide for backing **`src/features/admin/features/tournaments/`** (events + registrations) and **`src/features/admin/features/tournament/`** (bracket manager) on Supabase.

**Prerequisites:** You already wired **Members** and **Teams** (`members`, `teams`, `team_members` tables and `members.service.ts` / `teams.service.ts`). Tournaments depend on those tables.

**Related docs:**

- [README.md](./README.md) — full admin table list
- [ADMIN_DATABASE.md](./ADMIN_DATABASE.md) — deep TypeScript ↔ SQL reference

---

## What each folder does

| Folder                                  | Route / UI                                     | Still mock?                      | Supabase tables                                                 |
| --------------------------------------- | ---------------------------------------------- | -------------------------------- | --------------------------------------------------------------- |
| `features/admin/features/tournaments/`  | `/admin/tournaments`, `/admin/tournaments/$id` | Yes                              | `tournaments`, `tournament_registrations`                       |
| `features/admin/features/participants/` | `/admin/participants`                          | Yes (uses registrations service) | `tournament_registrations` (+ join `tournaments`)               |
| `features/admin/features/tournament/`   | Bracket tab on tournament detail               | Yes                              | `bracket_rounds`, `bracket_matches`, `tournament_bracket_state` |

```text
Members + Teams (done)
        │
        ▼
  tournaments  ──►  tournament_registrations  ──►  participants (approve/reject)
        │
        └──►  bracket_rounds + bracket_matches + tournament_bracket_state
```

---

## 1. Create `tournaments`

Maps to `CreateTournamentModal`, `TournamentsManagement`, `tournaments.service.ts`, and route loader `fetchTournamentById`.

### Columns (match the app today)

| Column                  | Type          | Notes                                                                                |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `id`                    | `uuid`        | PK, default `gen_random_uuid()`                                                      |
| `slug`                  | `text`        | UNIQUE, URL-safe (e.g. `lol-twilight`). Generate from name on insert.                |
| `name`                  | `text`        | NOT NULL                                                                             |
| `game`                  | `text`        | `Valorant`, `League of Legends`, `Teamfight Tactics`                                 |
| `format`                | `text`        | `Single Elimination`, `Double Elimination`                                           |
| `status`                | `text`        | `Draft`, `Registration Open`, `Registration Closed`, `Live`, `Completed`, `Archived` |
| `prize_pool`            | `text`        | Display string, e.g. `₱10,000` (from `formatPrizePool` in the form)                  |
| `prize_currency`        | `text`        | Optional: `PHP`, `USD` (form stores raw amount separately)                           |
| `prize_amount`          | `integer`     | Optional: digits only from form                                                      |
| `region`                | `text`        | NOT NULL                                                                             |
| `team_cap`              | `integer`     | NOT NULL (form allows 4–64)                                                          |
| `teams_registered`      | `integer`     | NOT NULL, default `0` — keep in sync with approved registrations                     |
| `start_date`            | `date`        | NOT NULL                                                                             |
| `registration_deadline` | `date`        | NOT NULL, must be ≤ `start_date`                                                     |
| `created_at`            | `timestamptz` | default `now()`                                                                      |

### SQL (run in Supabase SQL Editor)

```sql
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  game text not null check (game in (
    'Valorant', 'League of Legends', 'Teamfight Tactics'
  )),
  format text not null check (format in (
    'Single Elimination', 'Double Elimination'
  )),
  status text not null default 'Draft' check (status in (
    'Draft', 'Registration Open', 'Registration Closed',
    'Live', 'Completed', 'Archived'
  )),
  prize_pool text not null,
  prize_currency text check (prize_currency in ('PHP', 'USD')),
  prize_amount integer,
  region text not null,
  team_cap integer not null check (team_cap between 4 and 64),
  teams_registered integer not null default 0,
  start_date date not null,
  registration_deadline date not null,
  created_at timestamptz not null default now(),
  check (registration_deadline <= start_date)
);

create index tournaments_status_idx on public.tournaments (status);
create index tournaments_start_date_idx on public.tournaments (start_date);
create index tournaments_game_format_idx on public.tournaments (game, format);
```

### Bracket manager team counts (enforced in UI)

| Format             | Teams required for Bracket tab |
| ------------------ | ------------------------------ |
| Single Elimination | **16** approved registrations  |
| Double Elimination | **8** approved registrations   |

`team_cap` can be higher (e.g. 32); bracket unlocks only when approved count equals the format requirement.

---

## 2. Create `tournament_registrations`

Maps to `tournament-registrations.service.ts`, `AddTeamToTournamentDialog`, **Registered Teams** tab, and `participants/` (global approve/reject).

### Columns

| Column          | Type          | Notes                                             |
| --------------- | ------------- | ------------------------------------------------- |
| `id`            | `uuid`        | PK                                                |
| `tournament_id` | `uuid`        | NOT NULL, FK → `tournaments.id` ON DELETE CASCADE |
| `team_id`       | `uuid`        | NOT NULL, FK → `teams.id`                         |
| `status`        | `text`        | `Pending`, `Approved`, `Rejected`                 |
| `registered_at` | `date`        | NOT NULL, default `current_date`                  |
| `approved_at`   | `timestamptz` | NULL                                              |
| `approved_by`   | `uuid`        | NULL, FK → `members.id` (admin who approved)      |

**Unique:** one row per team per event — `unique (tournament_id, team_id)`.

The mock app builds display ids like `reg-{tournamentId}-{teamId}`; in Supabase use the registration **`id` (uuid)** only.

### SQL

```sql
create table public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete restrict,
  status text not null default 'Pending' check (status in (
    'Pending', 'Approved', 'Rejected'
  )),
  registered_at date not null default current_date,
  approved_at timestamptz,
  approved_by uuid references public.members (id) on delete set null,
  unique (tournament_id, team_id)
);

create index tr_tournament_status_idx
  on public.tournament_registrations (tournament_id, status);
create index tr_team_id_idx on public.tournament_registrations (team_id);
```

### Business rules (mirror mock services)

When **admin adds a team** (`addTeamToTournament`):

1. Insert registration with `status = 'Approved'` (admin path today) or `Pending` if you open public signup later.
2. Reject if `teams_registered >= team_cap` for that tournament.
3. Reject duplicate `(tournament_id, team_id)`.
4. Reject if roster `teams.game` ≠ tournament game (unless `teams.game = 'Multi'`).
5. Reject if `teams.active_tournament_id` points at another event.

On **Approved** (participants page or insert):

1. Increment `tournaments.teams_registered` (or maintain via view/trigger).
2. Set `teams.active_tournament_id` and `teams.active_tournament_name` (already used in `teams.service.ts`).

On **Rejected** or removal:

1. Decrement count if previously approved.
2. Clear `teams.active_tournament_id` when it matched this tournament.

### Optional: roster snapshot

Mock UI shows captain + member list in `TeamModal` from live `team_members`. For historical accuracy after roster changes, add later:

```sql
-- optional column on tournament_registrations
-- members_snapshot jsonb  -- [{ ign, role, discord }]
```

Not required for the first Supabase cut.

---

## 3. Bracket tables (`tournament/` folder)

Maps to `BracketManager.tsx` and `managed-bracket.ts`. State today is **in-memory**; persistence needs rounds, matches, advancement links, and publish lock.

### 3a. `tournament_bracket_state` (one row per tournament)

| Column           | Type          | Notes                                                                  |
| ---------------- | ------------- | ---------------------------------------------------------------------- |
| `tournament_id`  | `uuid`        | PK, FK → `tournaments.id` ON DELETE CASCADE                            |
| `status`         | `text`        | `not_generated`, `draft`, `published`                                  |
| `seeding_locked` | `boolean`     | default `false` — after publish, seeding locked, scores still editable |
| `updated_at`     | `timestamptz` | default `now()`                                                        |

```sql
create table public.tournament_bracket_state (
  tournament_id uuid primary key references public.tournaments (id) on delete cascade,
  status text not null default 'not_generated' check (status in (
    'not_generated', 'draft', 'published'
  )),
  seeding_locked boolean not null default false,
  updated_at timestamptz not null default now()
);
```

### 3b. `bracket_rounds`

One row per column in the bracket UI (e.g. `Round 1`, `Upper — Semifinals`, `Lower — Final`).

| Column          | Type      | Notes                                                          |
| --------------- | --------- | -------------------------------------------------------------- |
| `id`            | `uuid`    | PK                                                             |
| `tournament_id` | `uuid`    | FK → `tournaments.id` ON DELETE CASCADE                        |
| `label`         | `text`    | Display label                                                  |
| `sort_order`    | `integer` | Left-to-right order in UI                                      |
| `bracket_side`  | `text`    | `main` (SE), `upper`, `lower`, `grand`                         |
| `best_of`       | `text`    | `BO1`, `BO3`, `BO5` — per-round format in `ManagedBracketView` |

```sql
create table public.bracket_rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  label text not null,
  sort_order integer not null,
  bracket_side text not null check (bracket_side in (
    'main', 'upper', 'lower', 'grand'
  )),
  best_of text not null default 'BO3' check (best_of in ('BO1', 'BO3', 'BO5')),
  unique (tournament_id, sort_order)
);

create index bracket_rounds_tournament_idx
  on public.bracket_rounds (tournament_id, sort_order);
```

### 3c. `bracket_matches`

Slots reference **registrations**, not `teams` directly, so the same roster is scoped to one event.

| Column                   | Type      | Notes                                              |
| ------------------------ | --------- | -------------------------------------------------- |
| `id`                     | `uuid`    | PK                                                 |
| `round_id`               | `uuid`    | FK → `bracket_rounds.id` ON DELETE CASCADE         |
| `match_number`           | `integer` | Order within round                                 |
| `label`                  | `text`    | e.g. `Match 1`, `Upper Final`                      |
| `registration_a_id`      | `uuid`    | NULL, FK → `tournament_registrations.id`           |
| `registration_b_id`      | `uuid`    | NULL, FK → `tournament_registrations.id`           |
| `score_a`                | `integer` | NOT NULL, default `0`                              |
| `score_b`                | `integer` | NOT NULL, default `0`                              |
| `winner_registration_id` | `uuid`    | NULL, FK → `tournament_registrations.id`           |
| `confirmed`              | `boolean` | NOT NULL, default `false`                          |
| `winner_next_match_id`   | `uuid`    | NULL, FK → `bracket_matches.id`                    |
| `winner_next_slot`       | `text`    | NULL, `team_a` or `team_b`                         |
| `loser_next_match_id`    | `uuid`    | NULL, FK → `bracket_matches.id` (double elim only) |
| `loser_next_slot`        | `text`    | NULL, `team_a` or `team_b`                         |

```sql
create table public.bracket_matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.bracket_rounds (id) on delete cascade,
  match_number integer not null,
  label text not null default 'Match',
  registration_a_id uuid references public.tournament_registrations (id) on delete set null,
  registration_b_id uuid references public.tournament_registrations (id) on delete set null,
  score_a integer not null default 0,
  score_b integer not null default 0,
  winner_registration_id uuid references public.tournament_registrations (id) on delete set null,
  confirmed boolean not null default false,
  winner_next_match_id uuid references public.bracket_matches (id) on delete set null,
  winner_next_slot text check (winner_next_slot in ('team_a', 'team_b')),
  loser_next_match_id uuid references public.bracket_matches (id) on delete set null,
  loser_next_slot text check (loser_next_slot in ('team_a', 'team_b')),
  unique (round_id, match_number)
);

create index bracket_matches_round_idx
  on public.bracket_matches (round_id, match_number);
create index bracket_matches_next_idx on public.bracket_matches (winner_next_match_id);
```

### Display names in the UI

`BracketManager` shows **team names**, not registration UUIDs. When loading matches, join:

```sql
select
  m.*,
  ta.team_id,
  t_a.name as team_a_name,
  t_b.name as team_b_name
from bracket_matches m
left join tournament_registrations ra on ra.id = m.registration_a_id
left join teams t_a on t_a.id = ra.team_id
left join tournament_registrations rb on rb.id = m.registration_b_id
left join teams t_b on t_b.id = rb.team_id;
```

### Generate bracket (app flow)

1. Admin seeds **16** (SE) or **8** (DE) approved teams into round-1 slots.
2. **Generate Bracket** runs `buildSingleElimMatches` / `buildDoubleElimMatches` in `managed-bracket.ts`.
3. On save to Supabase: insert `bracket_rounds` + `bracket_matches` with `winner_next_*` / `loser_next_*` links matching that graph.
4. **Publish** sets `tournament_bracket_state.status = 'published'` and `seeding_locked = true`.

Double elim lower path (current app):

```text
Lower R1 (2) → Lower R2 (2) → Lower Semifinals (1) → Lower Final (1) → Grand Final
Upper R1 → Upper SF → Upper Final ────────────────────────────────┘
```

---

## 4. Row Level Security (RLS)

Enable RLS on all new tables. Pattern: **public read** for published brackets; **admin write** for staff.

Adjust the admin check to match your `members` table (same pattern as teams):

```sql
-- Example helper (create once)
create or replace function public.is_tournament_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.id = auth.uid()
      and m.role in ('Admin', 'Moderator')  -- align with your members.role values
  );
$$;

alter table public.tournaments enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.tournament_bracket_state enable row level security;
alter table public.bracket_rounds enable row level security;
alter table public.bracket_matches enable row level security;

-- Admins: full access to tournaments + registrations
create policy "admins manage tournaments"
  on public.tournaments for all
  using (public.is_tournament_admin())
  with check (public.is_tournament_admin());

create policy "admins manage registrations"
  on public.tournament_registrations for all
  using (public.is_tournament_admin())
  with check (public.is_tournament_admin());

-- Bracket: admins write; anyone read when published (optional)
create policy "admins manage bracket state"
  on public.tournament_bracket_state for all
  using (public.is_tournament_admin())
  with check (public.is_tournament_admin());

create policy "admins manage bracket rounds"
  on public.bracket_rounds for all
  using (public.is_tournament_admin())
  with check (public.is_tournament_admin());

create policy "admins manage bracket matches"
  on public.bracket_matches for all
  using (public.is_tournament_admin())
  with check (public.is_tournament_admin());

create policy "public read published brackets"
  on public.bracket_rounds for select
  using (
    exists (
      select 1 from public.tournament_bracket_state s
      where s.tournament_id = bracket_rounds.tournament_id
        and s.status = 'published'
    )
  );

create policy "public read published matches"
  on public.bracket_matches for select
  using (
    exists (
      select 1 from public.bracket_rounds r
      join public.tournament_bracket_state s on s.tournament_id = r.tournament_id
      where r.id = bracket_matches.round_id
        and s.status = 'published'
    )
  );
```

Update `is_tournament_admin()` if you use `Tournament Admin` / `Super Admin` strings from older docs.

---

## 5. Keep `teams_registered` accurate

Option A — **trigger** (recommended):

```sql
create or replace function public.sync_tournament_team_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tournaments t
  set teams_registered = (
    select count(*)::integer
    from public.tournament_registrations r
    where r.tournament_id = coalesce(new.tournament_id, old.tournament_id)
      and r.status = 'Approved'
  )
  where t.id = coalesce(new.tournament_id, old.tournament_id);
  return coalesce(new, old);
end;
$$;

create trigger trg_sync_team_count
after insert or update of status or delete
on public.tournament_registrations
for each row execute function public.sync_tournament_team_count();
```

Option B — update count in application code inside `tournament-registrations.service.ts` (like the mock `syncTournamentTeamCount` today).

---

## 6. Wire the frontend (after tables exist)

Replace mock stores with Supabase calls, in this order:

| Step | File                                                       | Operations                                                                                |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | `tournaments/services/tournaments.service.ts`              | `select/insert` on `tournaments`; map rows ↔ `AdminTournament`                            |
| 2    | `tournaments/services/tournament-registrations.service.ts` | CRUD on `tournament_registrations`; join `teams` + `team_members` for roster display      |
| 3    | `participants/services/participants.service.ts`            | List registrations with `tournaments.name`; `update status`                               |
| 4    | New `tournament/services/bracket.service.ts` (suggested)   | Load/save rounds, matches, state; run same advancement rules as `recomputeAdvancements()` |

### Row mapping (tournaments)

| DB column               | TypeScript (`MockTournament` / `AdminTournament`)              |
| ----------------------- | -------------------------------------------------------------- |
| `id`                    | `id`                                                           |
| `slug`                  | use for public URLs; can mirror `id` in routes after migration |
| `name`                  | `name`                                                         |
| `game`                  | `game`                                                         |
| `format`                | `format`                                                       |
| `status`                | `status`                                                       |
| `prize_pool`            | `prizePool`                                                    |
| `region`                | `region`                                                       |
| `team_cap`              | `teamCap`                                                      |
| `teams_registered`      | `teamsRegistered`                                              |
| `start_date`            | `startDate`                                                    |
| `registration_deadline` | `registrationDeadline`                                         |

### Row mapping (registrations → `MockTeam` for UI)

| DB column                        | UI field           |
| -------------------------------- | ------------------ |
| `id`                             | `id`               |
| `team_id`                        | `rosterTeamId`     |
| `tournament_id`                  | `tournamentId`     |
| `status`                         | `status`           |
| `registered_at`                  | `registrationDate` |
| join `teams.name`, `teams.tag`   | `name`, `tag`      |
| join captain from `team_members` | `captain`          |
| join active members              | `members[]`        |

---

## 7. Supabase checklist

1. **Members + Teams** tables live and working in the app.
2. Run SQL in sections **1 → 3** (tournaments → registrations → bracket).
3. Add **RLS** policies (section 4).
4. Add **team count** trigger or app sync (section 5).
5. Confirm `teams` has `active_tournament_id` and `active_tournament_name` (already updated by `assignTeamActiveTournament`).
6. Set env vars (if not already):

   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

7. Replace mock services file by file (section 6).
8. Seed one test event: 16 teams (SE) or 8 teams (DE), generate bracket, publish, verify public `BracketTab` can read published rows.

---

## 8. What you do **not** need in Supabase yet

- Separate table for **participants** — it is the same as `tournament_registrations`.
- Mock slug ids (`vlr-nightfall`) — use `tournaments.slug` + uuid `id`; update routes to load by slug if desired.
- `mock-tournament-details.ts` — replace with DB reads for bracket seeding once bracket tables are wired.

---

## 9. Suggested migration order

```text
1. tournaments
2. tournament_registrations (+ trigger for teams_registered)
3. tournament_bracket_state
4. bracket_rounds
5. bracket_matches
6. RLS policies
7. Frontend: tournaments.service.ts
8. Frontend: tournament-registrations.service.ts
9. Frontend: bracket.service.ts + BracketManager persistence
```

After step 8, **Participants** and **Registered Teams** work without further schema changes.
