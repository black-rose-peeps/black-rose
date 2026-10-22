# Member directory: game and role filters (Phase 1)

## Scope and environment boundary

This release adds admin member-directory filters and export using existing profile data. It does not add per-game guild registration, activity tracking, class/playstyle collection, or a new per-game role model.

- Authorized database for development: `blackrose-testing-dev`, organization `for testing`, project `xjwugbbrqpwnenmlrkdh`.
- Production project: `efchfvreaotskrdlweze`. Production execution and GitHub pushes require separate authorization; none are part of this work.
- Application environment and MCP authorization are independent. Verify both before testing. `.env.local` is ignored by Git and must never be committed or copied to production.
- The local Supabase CLI link was observed pointing at production. Do not use `--linked` database commands during this development work. Database-tool calls must specify the Dev project explicitly. This feature does not require CLI database commands.
- Dev/Prod schema equivalence has **not** been established. Successful Dev verification does not prove production readiness.

## Matching rules

The default game match is **Has game identity**: a trimmed nonempty in-game name/character name for the selected game. This is an identity directory, not proof of current game activity, confirmed guild membership, or a specific event registration.

The optional **Main game only** match uses the member's saved main-game selection. Main-game members without an IGN remain visible in this mode and must show that the identity is missing.

Game options come from the configured game catalog. Legacy aliases and saved display-name identity keys must be handled without requiring changes to member data. Riot titles share an identity: a Riot ID is not proof that a member actively plays every Riot title.

Verification status is an independent filter (all, Verified, Not Verified) and combines with game, role, search, and sync queue filters. Selected-game details show a Main game badge only when the saved main game matches. Changing any directory filter resets pagination.

### Role boundary

The existing profile schema stores `main_role` with `main_game`. The configured `game_roles` catalog defines available roles; it does not assign roles to members. A member's main role is known for the selected game **only when that game matches their main game**. A secondary-game IGN must not inherit the main game's role. Missing role is shown as unknown/not provided rather than guessed. Per-game role assignments require a separately approved model and migration.

### Export boundary

CSV export must reflect the entire filtered result set, not just the visible pagination page. It must preserve CSV quoting and protect against spreadsheet-formula injection. Export only directory fields needed by officers; exclude credentials, tokens, private profile text, and unrelated data.

## Database change ledger

| Change                                                                  | Migration status         | Data impact                                       | Recovery                                                                                        |
| ----------------------------------------------------------------------- | ------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Read existing profile identity/main-role fields for the admin directory | No migration required    | Read-only feature; no profile rewrite or backfill | Revert the application change                                                                   |
| Read existing game and role catalog for filter choices                  | No migration required    | Read-only                                         | Revert the application change                                                                   |
| Switch ignored local `.env.local` to Dev                                | Local-only configuration | No database data changed                          | Restore the intended local environment from a secure source; do not change production variables |

No DDL, DML, RLS changes, seeds, or migrations have been applied for this feature. Do not create an empty migration solely to record an application-only change. Future database changes must be versioned and documented before execution, including prerequisites, safe retry behavior, verification, and recovery limits.

## Dev baseline and verification

Verified using read-only queries against Dev:

- `member_profiles` has `main_game`, `main_role`, `game_identities` (JSONB), `ingame_display_name`, `valorant_game_name`, and `valorant_tagline`.
- `games` and `game_roles` exist with the game identity configuration and role names.
- Browser and server Supabase clients can read the member/profile relationship and game/role relationship (HTTP 200). The browser uses a valid Dev publishable key held only in ignored local configuration; the service-role credential remains server-only.
- The API OpenAPI root is not a sufficient browser-key health check; verify actual table requests through the same client the application uses.
- Exact baseline counts at inspection: 261 members, 261 profiles, 10 games, 38 game roles. These are reference observations, not permanent expected counts. Catalog estimates returned by table-listing tools may be stale.
- Production baseline and permission checks: not executed.
- Existing Dev security observation: RLS is disabled on `games` and `game_roles`. This feature does not change policies. Review effective grants and the intended catalog access separately before a production release.

### Application verification

- `node --import tsx --test tests/*.test.ts`: 28 tests passed across the directory, hubs, dashboard access and profile editor. Directory coverage includes alias/legacy identity handling, main-role attribution, shared Riot identity labeling, CSV quoting/formula safety/completeness, API row-cap traversal and failure handling, mutation response preservation, accessible verification controls and main-game badges.
- `npm run build`: passed (client and server bundles). Existing chunk/dynamic-import warnings remain. This is a local build using the Dev environment, not a production deployment artifact to upload unchanged.
- Changed-source/test ESLint checks: zero errors; three existing hook-dependency warnings remain. Repository-wide lint remains blocked by existing errors, predominantly formatting/line-ending issues outside the changed files; no repo-wide formatting was performed.
- `tsc --noEmit`: blocked by 18 existing diagnostics. An isolated `HEAD` snapshot produced the exact same 18 diagnostic lines; added diagnostics: none.
- `git diff --check`: passed.
- Browser checks used synthetic member fixtures and a stubbed admin-session check in an isolated QA tab, not a real administrator login. Database mutations and non-Dev Supabase requests were blocked by the harness. Separately, real browser-key/server-key Dev table reads passed as described above.
- Desktop (1440px) and mobile (390px) layouts were visually inspected. Mobile document width did not overflow the viewport.
- Parent-reproduced browser checks selected Aion 2, displayed its character name, filtered the Healer role and downloaded a CSV containing the matching character/role. Full-result export and role/verification logic also have focused fixture-test coverage; these are not claims of real-admin or real-credential testing.
- Independent standards/correctness review found missing legacy abbreviations in matching. Fixed by reusing canonical game normalization; regression tests cover `WWM`, `LoL`, `TFT` and `MR` identities, main-game roles and CSV fields.
- Generated client assets were checked: the server service-role credential and production Supabase host are absent. Effective development environment resolves to the Dev host. No database writes, production deployment or GitHub pushes were performed.

## Production promotion checklist (not executed)

1. Obtain explicit approval for production access and deployment. Confirm the production project independently of the CLI link and local environment.
2. Review the application diff and this ledger. For this Phase 1 release, there should be no schema migration, data backfill, or data import.
3. With authorized read-only production access, check that required columns and relationships exist and that the actual application role can read them. Check schema and permission drift; do not run old setup or full-database restore scripts to fix a missing prerequisite.
4. Confirm a suitable backup/recovery point under the team's production policy. If drift requires a new database migration, stop and prepare/review that separately before deployment.
5. Verify production credentials remain configured for production and local/preview credentials remain configured for Dev. Do not promote `.env.local` or Dev test data.
6. Deploy the reviewed application code using the approved production process. No database execution is expected for this feature.
7. Smoke-test the member directory, game matching modes, role attribution, missing-identity/role states, search/sync filter combinations, pagination resets, mobile layout, and complete filtered CSV export.
8. Confirm existing registration/profile editing and member-management actions still work. Validate existing data-preservation checks against the pre-release snapshot; allow for legitimate concurrent activity rather than assuming counts are static.

## Recovery

For an application-only regression, restore the previous application release. No database rollback is needed because this feature does not change persisted data. Do not reset, truncate, restore over, or copy Dev data into production. Any future destructive migration or restoration requires separate approval and a tested recovery procedure; this checklist does not guarantee zero risk.
