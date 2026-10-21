# My Games workspace and public membership follow-up

## Approved scope

- Dashboard order is **Overview | My Games | Teams**. Move Main Game preference and per-game profile/membership editing out of Edit Profile; keep identity, region, socials and privacy there.
- Use a focused selected-game workspace, accessible dropdowns and clearly separate profile saves from membership actions. Preserve drafts and old game-editor deep links.
- Improve admin roster selection/filtering and review one member in a details panel rather than expanding a full status form on every row. Preserve pagination, all-filtered CSV and existing authorization.
- Display accepted game membership names/icons on profiles whose privacy permits the viewer. Do not publish applications, inactive/left status, membership reasons, class, server or faction through this new projection.
- Make `/br/{stored-profile-slug}` canonical. Preserve existing shared `/members/{slug}` links through a permanent redirect, without renaming stored slugs or deriving URLs again from mutable Discord/display names.

Discord-based acceptance is **documentation-only and deferred**, not part of the current UI work. Its exact role mappings, proposed policies and future environment-isolation/release checklist live in `discord-game-membership-automation.md`. Existing manual acceptance and validation remain unchanged.

The subsequent Active/Inactive visibility work is verified separately in `game-status-visibility.md` and `game-status-dev-verification.json`: inactive games leave current user game/profile/membership displays and new choices, but saved data and existing team/tournament/history pages remain available. Its 221-test verification supersedes the earlier UI-only QA snapshot below.

## Public profile contract — implemented and focused-verified

`MemberProfile.acceptedGameMemberships` is an optional backward-compatible field containing only `gameId`, `gameName` and `gameIcon`. Older owner-profile responses and browser fixtures need not provide it.

The profile-by-slug server path checks profile visibility and trusted ownership **before** reading membership summaries. It reads only explicitly Accepted memberships scoped to that profile's member ID, joining the existing game catalog. It never fetches game-character profiles or audit events for this projection, traverses API row caps, handles object/array catalog joins and omits missing catalog rows.

Membership summaries are not stored in the common-profile cache: a later public read reflects removal of acceptance even when that older bundle remains cached. Existing profile privacy cache behavior remains unchanged; this does not claim a new global cache/revocation policy.

Raw profile/membership/audit/admin tables remain private under the prior RLS gate. Public presentation uses a narrow server response; no anonymous SELECT policy or membership-data copy is required. Existing legacy identity information already displayed by the public profile keeps its established behavior; the new membership card does not add character details to that exposure.

The canonical page is `src/routes/br.$slug.tsx`. The old route redirects to it with HTTP 301 and preserves the original slug. Internal member/search/team/comment/admin links and new profile-comment notifications use the new path; previously persisted old notification URLs remain recognized.

The membership card now sits in the right-hand Player Info column, immediately below Player Info and above Social Links. Mobile keeps that same local order. The presentation-only move adds no data fields, query, write or migration.

### Focused evidence

- Public projection/privacy/component and legacy redirect tests: **11 passed**, zero failed/skipped.
- Real local HTTP: `/members/fixture-slug` returned **301** with `Location: /br/fixture-slug`; the canonical URL returned **200**.
- Isolated real-Chrome fixtures passed at desktop and mobile widths, and for a private-profile guest. Checked accepted names/badges, canonical redirect, hidden private memberships, zero horizontal overflow, zero page errors and zero remote writes. Screenshots inspected.
- Browser fixtures prove rendering/navigation, not a real user's OAuth login, administrator acceptance or deployed database save.
- Scratch evidence: `public-memberships-browser-qa.mjs`, `public-memberships-browser-qa.json`, `public-memberships-desktop.png`, `public-memberships-mobile.png`.

## Independent preference/detail writers — Dev migration verified

Separating pages also requires independent persistence. Edit Profile must not resubmit an older Main Game preference after it changes in My Games, and saving Main Game must not resubmit old identity/bio/privacy values.

The additive forward SQL artifact is `sql/20261019_game_workspace_preferences.sql`:

- `set_member_main_game`: derives the chosen game's legacy role/identity projection without editing common details, other game profiles or memberships.
- `update_member_profile_details`: updates only common identity/bio/region/privacy details and preserves the current Main Game and all game-specific fields.

Both must follow the existing member-lock convention and be callable only by the trusted service role. Main Game endpoints must derive a verified member and enforce same-origin writes. Do not edit already-applied migrations to introduce these functions.

Applied on Dev as **`20261019161848 game_workspace_preferences_20261019`**. Read-back function bodies match the repository after comment/whitespace normalization; both are invoker functions executable by the service role, not browser roles. The general profile writer now uses the details-only RPC. Focused guards/transport/SQL-contract tests passed, as did the details-writer RED/GREEN regression.

`sql/20261019_game_workspace_verify.sql` passed a rollback-only Dev rehearsal covering canonical/empty/Riot projections, independent field preservation, invalid/inactive/ambiguous game rejection, explicit clearing, no inferred participation and preserved membership/audit data. All synthetic writes rolled back. Counts/checksums of existing data matched before the migration and after this rehearsal. This later Dev snapshot contains 85 game profiles, two memberships and three events already present before the migration; it is separate from the earlier 84-profile backfill snapshot and does not attribute intervening edits.

Exact evidence is in `game-workspace-dev-verification.json`. Two-session lock contention has not been exercised; the common members-row lock was inspected. Local integrated application checks are complete; real-account authentication and production rehearsal remain separate gates.

For eventual separately authorized production release, install the new RPCs before the compatible application. Retain the earlier expand/integrity/catalog-RLS/backfill prerequisites in `game-membership-deployment.md`. Do not copy Dev data or secrets. Keeping the additive functions while rolling back compatible application code is preferable to dropping data or reopening browser writes.

## Final local verification and remaining release gates

### Interaction corrections after user review

- Selected-game query navigation now uses `resetScroll: false`; focus already uses `preventScroll`. A real Dashboard DOM regression failed before the fix and passed after it. Desktop/mobile browser fixtures also confirmed no query-navigation scroll reset.
- Legacy/Riot suggestions are no longer mistaken for user edits. The controller distinguishes a suggested profile that can be explicitly saved from actual unsaved changes that require leave/reload protection. Saving, discarding and shared-identity rebasing update both baselines; genuine edits and pending operations remain guarded.
- The existing neutral `custom-scrollbar` treatment is reused for game-list and searchable-dropdown scrolling. Browser checks confirmed the thin scrollbar and the Overview/My Games/Teams ordering.
- Fresh untouched-prefill reloads produced zero before-unload warnings at desktop/mobile widths. The unit/controller and mounted-route tests retain coverage for real dirty and pending states.
- These interaction/presentation corrections need no additional database migration. The simplified workspace and compact public membership rows passed desktop/mobile browser checks and screenshot inspection. Explanations now use optional details instead of repeated paragraphs; Main Game stays a compact, independently saved preference.

Admin roster component browser fixtures passed at desktop and mobile widths: keyboard game search, status/search filters, export of all 12 filtered rows beyond the visible page, formula-neutralized CSV, member-details drawer, failed-save/retry with reason retention, refreshed acceptance and Escape dismissal. They used fixture services and made no remote writes; settled viewport screenshots were inspected.

### Admin simplification and public sidebar follow-up

- Game Memberships defaults to search/status and a closed More filters control; gameplay role/class/server/faction remain available on demand. Active chips/count/reset/export remain usable when collapsed. Scan rows show identity, membership, IGN and role; full character configuration and status management remain in the details drawer.
- Member Directory defaults to game/verification/export. Match by and role are behind More filters, and matching/CSV caveats are in optional help. Searchable long game catalogs, literal role names such as `all`, unknown secondary-game roles, independent chips and reset preserve the original filtering semantics.
- Shared Command lists, Select scrolling viewports and dropdown menus reuse `custom-scrollbar`. A narrow CSS override counteracts Radix Select's injected scrollbar-hiding rule. Desktop/mobile fixtures checked computed width/color, real overflow/scrolling and last-option selection, not just classes on a portal wrapper.
- The public membership card is now below Player Info and above Social Links in the right column. Status sits below each game name so a desktop sidebar does not force names into fragments. Browser assertions and inspected desktop/mobile screenshots cover placement, privacy and readability.
- Directory browser checks used the real filter component and filter/CSV utilities with an isolated fixture parent. They verified keyboard game search, collapsed active filters, unknown roles, an actual CSV download containing six matches beyond three visible fixture rows, formula neutralization, reset and optional help. They do not prove a real admin login or the full MembersManagement route.
- This pass changed no bot, Worker, database or environment configuration and needs no new migration. Discord automation is documented but remains unimplemented and disabled. Merging the current website does not enable it.

Final combined repository suite: **186 passed**, zero failed/skipped. Production build passed. ESLint and Prettier passed for this UI pass's touched source/test files. TypeScript retains the same **18 diagnostics** as a freshly archived HEAD checkout with the same dependencies; no added/removed diagnostic headers after normalizing checkout positions and equivalent quoted-union ordering. The earlier expanded source lint scope retained **two HEAD-existing explicit-any errors in `RosterTable.tsx` and four warnings**; this is not a claim that whole-repository lint or TypeScript is clean. `git diff --check` passed; HEAD remains `3453afe` with work uncommitted.

My Games browser fixtures also exercised complete preference/profile/application flows, section relocation and region editing, preservation of Main Game during common-profile saves, privacy, cancelled dirty navigation, scroll preservation and clean-versus-edited reload behavior. Untouched suggestions produced zero reload prompts; a real edit produced a prompt, and cancelling retained the draft. See `my-games-browser-qa.json` under Hermes scratch. All browser save/acceptance tests used isolated fixtures, not real-user mutations.

- [x] Finish member My Games/navigation/editor integration and admin roster redesign.
- [x] Apply/read back the new Dev preference migration and prove independent-write preservation.
- [x] Rerun the combined repository suite, scoped lint, production build and TypeScript baseline comparison.
- [x] Exercise new member/admin dropdowns, selected-game views, mobile controls and dirty navigation in browser fixtures.
- [x] Reconcile final review and update the main deployment/evidence files with final combined results.
- [ ] Rehearse real member/admin login and supported native/mobile authentication separately before production.

All work remains on `work/local-development`. No commit, push or production deployment is authorized.
