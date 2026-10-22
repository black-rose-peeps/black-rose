# Game profiles and membership: Dev verification and production rollout

> **Exact Main/Prod replay:** use [main-production-sql-rollout.md](main-production-sql-rollout.md) for the consolidated current-branch runbook. A fresh read-only Dev history check found that the local `20261019_game_membership_backfill.sql` was hardened after the recorded import; it is not identical to the applied statement. The guide links a checksum-verified historical snapshot and requires a production data gate. All-SQL-before-code requires a real maintenance/write-freeze window; the live staged cutover below still applies otherwise.

> **Current application prerequisite:** also apply `sql/20261019_game_workspace_preferences.sql` after the integrity migration and **before deploying the current application**. It separates Main Game and common-detail writes. The approved My Games redesign, accepted public memberships and canonical `/br/` URLs are documented in `game-workspace-redesign.md`; its final integrated QA supersedes the earlier foundation snapshot below.

## Boundaries and current status

- Development branch: `work/local-development`. No Git commit/push or production execution is authorized by this implementation.
- Authorized database: Dev/Preview `xjwugbbrqpwnenmlrkdh`. Production is a separate release decision, not a target for these instructions until explicitly approved.
- The SQL files are additive, versioned deployment artifacts under the repository's existing `docs/sql/` convention. They are not a Dev database dump.
- Dev has expand, integrity, catalog RLS and conservative profile backfill applied and read back. Detailed counts, migration versions and preservation checks are in `game-membership-dev-verification.json`.
- Foundation review findings were corrected and regression-verified. Final integrated workspace QA is recorded in `game-workspace-dev-verification.json`. Do not interpret prepared scripts, applied migrations and verified behavior as interchangeable.

## Feature and authority model

See `../GLOSSARY.md`. One primary profile and one optional Black Rose membership record exist per member/game. Main Game remains preference only. Character/IGN and game role belong to the game profile. Class, server and faction are optional per-game fields configured through the existing Games create/edit forms, not hardcoded requirements for every title.

Members maintain their own information and can express interest, apply, withdraw, or leave. Applying requires a saved nonblank IGN. An administrator controls Accepted and administrative status changes. Saving or importing an IGN never creates a membership or implies acceptance. Inactive games preserve saved information; withdrawal/leaving remain possible while new applications and acceptance are blocked.

**Optional Discord-based acceptance now has a separate implementation and Dev rehearsal.** See `discord-game-membership-automation.md` for its additional migration, approved rules, shared-Worker target risk and manual activation/recovery gates. This foundation website release can still ship with manual acceptance; merging it does not activate automation.

### Catalog integration

- Existing game IDs and `game_roles` remain authoritative. No duplicate game or role catalog is introduced.
- Games administration retains existing identity labels, placeholders, helper text, image/icon settings, active state and sorting. Optional profile-field configuration is persisted in the same create/update operation.
- Removing a referenced role retires it instead of deleting saved assignments. Retired roles/options and disabled fields remain visible as saved historical values and cannot silently disappear on a no-op save.
- Games referenced by teams, tournaments, game profiles, memberships or membership events cannot be deleted; deactivate them instead.
- The Active/Inactive visibility follow-up uses the existing flag to hide inactive games from user selections and current game/profile/membership displays while preserving admin records and existing team/tournament history. See `game-status-visibility.md` for its distinct verification status and no-new-migration rollout; deactivation does not change a member's own membership status.
- Membership rosters are a separate mode in the existing member administration page. Identity presence and Main Game filters remain distinct from an accepted roster. Exports cover all filtered rows, not just one page, and neutralize spreadsheet formulas.

### Compatibility and privacy

Per-game profile saves update their legacy identity projections atomically, preserving unrelated game identity keys. Shared Riot identity changes propagate only to already existing related profiles; they do not create memberships or invent per-title participation. General profile saves cannot overwrite newer per-game data from an older browser draft. Changing Main Game projects the selected game's saved role/identity without assigning a previous game's role to it.

The personal workspace is owner-only; rosters and membership audit information are administrative data. Existing profile privacy remains in place. The approved public projection exposes only accepted game names/icons after that privacy check; other membership states, audit reasons and configurable character details are not added to it. Existing legacy identity display behavior remains unchanged.

## Security prerequisites

1. Configure a random **server-only `SESSION_SECRET` of at least 32 characters** in every deployed runtime before enabling the new authentication endpoints. Never prefix it with `VITE_`, return it to the browser, put it in SQL, or commit it. Dev's value is in ignored `.env.local` with user authorization; generate a different production value using an approved secret manager.
2. Retain the correct environment's Supabase server credential on the server only. Do not use Dev credentials or upload a locally built Dev-bound artifact into production.
3. Member login must complete the actual Discord OAuth proof before the server issues its signed HttpOnly cookie. Admin password verification now happens on the server before an admin cookie is issued. Browser localStorage flags, a username, or an unsigned member-ID cookie are not authentication proof.
4. Existing members and admins must **refresh and sign in again** after deployment. Old browser flags are deliberately not upgraded into trusted sessions.
5. Cookies are HttpOnly, SameSite=Lax, and Secure on HTTPS. Writes enforce same-origin requests and Start's CSRF middleware. The verified-member guard is used for new game-profile/membership writes; acceptance requires a validated admin session.
6. Sign-out clears the server cookie as well as the local UI cache. Signed cookies have bounded lifetimes (member: seven days; admin: eight hours). Keep the secret stable across application instances. Rotating it invalidates all signed sessions. Account removal is checked by guards; admin username changes also require sign-in again. Password rotation alone is not a per-session revocation facility.
7. This is scoped protection for the feature, its catalog administration and authentication integration, **not a claim that every historical endpoint/table in the application has undergone a full security audit**. A production perimeter should also rate-limit password login.
8. The same-origin browser flow is the verified design. Rehearse native/mobile deep-link login and cross-origin deployment separately before enabling those surfaces; do not weaken origin checks or use `SameSite=None` blindly to bypass a failure.

## Versioned SQL and release order

| Order | File                                                                                | Purpose                                                                                                                                                                                                        |
| ----- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `sql/20261019_game_membership_expand.sql`                                           | Add game field configuration, role retirement flag, game profiles, explicit memberships, append-only events, keys/indexes and service-only RPCs.                                                               |
| 2     | `sql/20261019_game_membership_integrity.sql`                                        | Forward fix for stable admin actor IDs, shared identity validation, preserved historical fields and atomic general-profile preferences. Required before deploying the new profile writer.                      |
| 3     | `sql/20261019_game_membership_backfill.sql`                                         | Conservatively import legacy identities into game profiles; no membership/event inserts and no changes to original legacy profile values.                                                                      |
| 4     | **Deploy compatible application + configure secrets; verify member/admin re-login** | Catalog writes and member writes must use their protected server endpoints before public catalog write privileges are removed.                                                                                 |
| 5     | `sql/20261019_game_membership_catalog_rls.sql`                                      | Enable catalog RLS, revoke public/anon/authenticated writes including column grants, retain catalog SELECT, privatize admin account access and restrict legacy admin credential/session RPCs to service calls. |
| 6     | `sql/20261019_game_membership_verify.sql`                                           | Execute rollback-only synthetic verification and inspect preservation, constraints, grants and RPC privileges.                                                                                                 |

Dev applied the RLS gate before its backfill after the server implementation and targeted tests were in place. Production should follow the staged application cutover above to avoid breaking an older browser-only catalog editor. Do not run historical `disable_games_rls.sql` afterward: it contradicts this release's permission model.

The expand file was already installed in Dev as `20261019063253`. Keep its historical artifact; do not edit an already-applied migration and pretend a forward fix was deployed. The integrity file is a separate migration. Migration tracking versions differ per target; the reviewed SQL and prerequisites, not Dev-generated row IDs, are what must be promoted.

## Production preflight — only with separate authorization

- Take an environment-appropriate backup and confirm the actual restore procedure/retention before making changes. A backup without a viable restoration path is not a recovery plan.
- Confirm the explicit production project reference and environment loader outputs. The Supabase CLI cached link previously pointed at production even when local app configuration used Dev: do not use an unchecked `--linked` command.
- Compare existing schema drift: `members`, `member_profiles`, `games`, `game_roles`, `admin_accounts`, their keys, privileges/policies and the admin login RPC signatures. Do not assume Dev and Prod match.
- Check that game and member IDs are UUIDs and legacy identity columns exist. Catalog game aliases and role names may be ambiguous; inspect the backfill skip report before approving imports.
- Record row counts and checksums of existing games, roles, members and member profiles. The verification SQL excludes only the two additive catalog columns when comparing original catalog data.
- Preserve existing settings and data. No reset, truncation, table replacement, Dev-data import, or destructive contraction is part of this release.
- Plan the application rollout and re-login notice so the new database RPCs exist before the corresponding code is served and protected catalog writers work before the RLS gate.
- Explicitly retain manual membership or follow the separately gated Discord acceptance rollout. Verify the actual Worker target independently of the website before exercising verification sync; local Dev app configuration alone does not isolate the shared Worker.

## Backfill behavior and Dev evidence

The backfill matches known aliases conservatively, prefers explicit per-game identities over Main Game fallback, skips ambiguous/conflicting/invalid/unmatched data, and inserts only missing member/game pairs with `ON CONFLICT DO NOTHING`. Existing per-game edits are not overwritten. Only a matching Main Game's legacy role is attributed to its game; secondary-game profiles do not borrow it.

Dev's preflight found 88 legacy source rows, 84 importable pairs and two unmatched source rows. The actual migration produced **84 game profiles, zero memberships and zero membership events**. Unmatched legacy data remains untouched for review; it was not discarded or interpreted as membership. Shared account data is not automatically expanded to every related title.

Before and after the migrations and rollback-only fixtures, the original **261 members, 261 member profiles, 10 games and 38 roles** retained matching original-data checksums. This is evidence for this Dev rehearsal, not a guarantee that an uninspected production database cannot contain incompatible data.

The rollback-only SQL tests exercised saved-IGN requirements, role/game foreign keys, profile-only saves, legacy synchronization, disabled/retired value preservation, invalid aliases/options, membership transitions, no self-acceptance, stable admin UUIDs, audit insertion and tamper denial, inactive-game behavior, shared Riot propagation/clearing, Main Game changes and protected general-form fields. `anon` and `authenticated` calls to private RPCs/tables were rejected. All synthetic records were rolled back.

## Release verification checklist

### Foundation automated verification (before the workspace follow-up)

- Combined repository tests: **142 passed, zero failed/skipped**, using `node --import tsx --test tests/*.test.ts`.
- Production build: `npm run build` passed. Local development and production-build modes both resolve to **Dev**, not production. Rebuild with the proper target-specific configuration for an eventual authorized deployment.
- Scoped ESLint: 85 changed/new source files, zero errors and four warnings. This is not a claim that whole-repository lint is clean.
- TypeScript still reports 18 existing baseline diagnostics. Diagnostic multisets match after normalizing checkout locations and equivalent quoted-union ordering; no new diagnostic was introduced. TypeScript itself does **not** pass.
- The actual mounted profile route and real React Query passed DOM checks for independent common/game drafts, save isolation, section navigation, leave guards, Enter handling, retry, pending-click protection, privacy, membership separation, approval refresh on focus and a read-only Main Game role projection. Session/remote services were fixtures, not real authenticated saves. The standalone script is `game-profile-ui-tests/profile-route-check.mjs` under Hermes scratch; this is not browser visual verification.
- `git diff --check` passed. Branch remains `work/local-development` at `3453afe`, with changes uncommitted and no push performed.
- Independent final review is still pending. Real OAuth/admin re-login, visual browser review of the new UI and supported native/mobile authentication remain explicit manual release checks.

The checklist below is for each target release; Dev evidence does not mark a future production step complete.

- [ ] Record preflight schema, exact counts/checksums, backup/restore prerequisites and target.
- [ ] Apply expand and integrity scripts and read back RPC definitions/permissions.
- [ ] Review/import legacy data and reconcile every skip category without overwriting sources.
- [ ] Verify a member can edit a secondary game's profile without changing Main Game.
- [ ] Verify applying uses a saved IGN; forged member IDs/admin statuses and unsigned cookies fail.
- [ ] Verify admin acceptance changes an explicit membership and writes an event with its stable actor ID.
- [ ] Verify changing Main Game, saving ordinary profile details, or editing shared identity does not silently change membership.
- [ ] Verify disabled fields/retired selections survive later saves and inactive games retain history.
- [ ] Verify accepted-roster filters and all-filtered CSV, including mobile controls and unsafe spreadsheet strings.
- [ ] Verify independent common/game drafts, section switches, leave guards, error/retry and pending-click protection.
- [ ] Verify member/admin real sign-in and server-cookie sign-out on each supported deployment surface.
- [ ] Apply catalog RLS only after the protected writer cutover; test public reads and rejected direct writes.
- [ ] Execute rollback-only SQL verification; compare original-data checksums and confirm no synthetic data remains.
- [ ] Run regression suite, scoped lint, production build and TypeScript comparison against baseline; record pre-existing failures honestly.

## Recovery and rollback limits

- If application behavior fails, stop new writes and prefer a forward fix. Retain additive schema and all imported/member-entered data.
- A rollback binary must still understand trusted sessions and protected server catalog writes after the RLS gate. An older browser-only writer will be denied; that is not a reason to re-open anonymous writes.
- Do not drop the new tables/columns or delete membership events to undo the application UI. Those operations discard new information and are not a data-preserving rollback.
- A backfill retry does not erase existing rows. To reverse an incorrect import later, reconcile the specifically reviewed rows against a pre-import snapshot and subsequent edits; there is no blanket safe DELETE script.
- Database restore is a separately authorized recovery action and may lose writes newer than the backup/restore point. Reconcile that trade-off explicitly.
- Rotating `SESSION_SECRET` forces re-login but does not remove profile, membership or audit data.

## Remaining before production

Production is not deployed. Local integration, review reconciliation and automated/browser-fixture evidence are complete in `game-workspace-redesign.md`. Rehearse real OAuth/admin re-login and supported native/mobile authentication on Dev, resolve skipped legacy identities as appropriate, and perform the separately authorized production preflight above. Never promote Dev data or its secrets.
