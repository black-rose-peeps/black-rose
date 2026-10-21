# Game Active/Inactive status — user visibility and preservation

## Approved behavior

The existing Games management `is_active` flag controls whether a game is offered on user-facing game/profile/membership surfaces. It is not a delete operation and is separate from a member's own Interested/Applying/Accepted/Inactive/Left membership state.

| Surface                                                                             | Game active                                                 | Game inactive                                                                                                                                    |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Admin Games management, member directory and game roster                            | Available                                                   | Remains available for management/history, with its inactive state                                                                                |
| My Games game list/editor and game deep links                                       | Available                                                   | Game editor/list entry hidden; inactive deep link cannot select it                                                                               |
| Main Game selector                                                                  | Available choice                                            | Not a new choice; preserve the stored preference without exposing its inactive title as an option or automatically clearing it                   |
| Public profile and Dashboard Overview current game/identity displays                | Active game's data may display under existing privacy rules | Inactive game's preference/role/identity and accepted affiliation are hidden, not erased                                                         |
| Shared Riot identity display                                                        | Lists only active associated titles                         | Removing one title does not delete the shared identity or hide other active Riot titles                                                          |
| User game pickers, team creation/new game assignment, floating community-game links | Available                                                   | Excluded; an empty/loading/failed catalog must not restore hardcoded legacy options                                                              |
| Game-server entry/content for a disabled game                                       | Available under its existing rules                          | Unavailable on user surfaces; does not stop/delete the actual server or change credentials                                                       |
| Existing teams, tournaments, registrations, championships and historical pages      | Remain accessible                                           | **Remain accessible**, per the owner's explicit choice; do not filter out or delete historical records merely because their game was deactivated |

Reactivation makes eligible game choices and saved game/profile/membership displays available again. It does not create a membership, accept an application, restore a member's Left status to Accepted, or alter a saved Main Game preference.

The dedicated `/guilds` page is current Where Winds Meet guild promotion/application content, not a historical team/tournament record. It also withholds that content while the associated game is inactive, unavailable or the catalog fails; reactivation restores it without changing guild data.

## Implementation boundary

This is an application read/presentation change using an existing column. **No new migration, backfill or database reset is required.** Keep all already-applied game-membership/workspace SQL unchanged. Inactive games still remain in the admin catalog and may remain in the owner workspace response so stored preferences/drafts can be reconciled safely; visibility is not a new access-control or database-privacy boundary.

The public accepted-membership server projection selects catalog `is_active` internally and omits non-active games before returning the same minimal names/icons response. Profile privacy authorization still runs before membership reads. Catalog status is read fresh with that projection, not stored inside the common-profile cache.

User catalog reads use the existing `getActiveGames` filter and normal member query freshness instead of the previous 30-minute active-catalog cache. Successful catalog mutations invalidate member workspace reads as well as catalog queries. Refetches/focus/reloads reconcile status; this does not promise instantaneous broadcast across already-open sessions or add background polling/Discord synchronization.

Filtering affects display/choices only. Preserve raw member game profiles, preference values, memberships, audit events, legacy identities and existing historical records. Avoid sending masked display-only profile objects back through save forms. Keep retired gameplay roles distinct from an inactive game.

## Development verification status

Local integration and isolated verification are complete. `game-status-dev-verification.json` records **221 passing repository tests**, a passing production build, scoped ESLint with zero errors and one pre-existing legacy-form warning, and the same 18 TypeScript diagnostic headers as archived HEAD after normalization. TypeScript itself remains failing on that baseline. No real database status toggle, live server API or authenticated admin save was used as a substitute for fixtures.

Required proof:

- [x] Active → inactive → active changes hide/restore My Games choices, direct focus and public membership display without modifying saved data.
- [x] Inactive saved Main Game is preserved internally, not silently cleared, not offered as a new choice and does not produce an untouched-form reload warning.
- [x] A catalog refresh cannot keep an inactive editor visible merely because it had a draft; pending operations remain safely handled.
- [x] Main Game/game-specific role and identity labels on Overview/public profile follow the catalog, including shared Riot titles and aliases.
- [x] User selectors do not fall back to hardcoded inactive games on an empty, loading or failed catalog. Legacy primary/secondary identity fields also obey the supplied catalog.
- [x] Existing team edit preserves a historical assigned game without offering it as a new active game choice. Team list/detail reads now retain the existing `game_id`; no IDs are invented for rows missing one.
- [x] Direct game-server routes and new polling respect the current user visibility boundary without changing server/backend credentials.
- [x] Existing team/tournament/history readers remain unfiltered; historical profile events stayed visible in browser fixtures.
- [x] Admin catalog readers remain unrestricted by active status and inactive roster management regression tests pass. A live authenticated admin toggle/reactivation remains a release smoke test.
- [x] Focused and combined tests, scoped lint/formatting, production build, TypeScript baseline comparison and isolated desktop/mobile fixtures are recorded.

The My Games browser fixture preserved preference/profile/membership records and write counters across deactivation/reactivation, confirmed the inactive title disappeared from lists/editor/searchable choices, and observed zero visibility-only reload warnings at desktop/mobile widths. The public-profile fixture covered deactivation/reactivation, privacy, sidebar order and retained historical events. Server fixtures covered `/servers` and `/servers/server-1` at both widths: inactive content made no fixture server-function calls; reactivation mounted the expected status/detail reads, and another deactivation hid the content again. These are real-browser rendering checks with isolated services, not live production or game-server verification.

The `/guilds` browser fixture separately verified inactive → active → inactive behavior at desktop/mobile widths, with no page errors or external writes.

Browser mutation tests must use isolated session/service fixtures and block unexpected external calls. Do not exercise the shared Discord Worker or live game-server APIs to test a game-visibility toggle.

## Eventual production release

Read `game-membership-deployment.md` and `game-workspace-redesign.md` for the current branch's earlier migrations/authentication prerequisites. This visibility follow-up itself needs no additional SQL, but that does not remove those earlier release requirements.

Before an authorized production release:

1. Verify actual browser/server targets and the deployed catalog column/type/read permissions; do not assume Dev and Prod are identical.
2. Confirm the intended active flags in the target catalog. Promote application code, not the Dev catalog's rows or flags.
3. Deploy the compatible application only under separate authorization; smoke-test an approved status toggle and then reactivation while confirming saved records are unchanged.
4. Test new choices separately from existing team/tournament/history pages. Inform operators that profile affiliations may disappear from display while their membership rows remain intact.
5. Record actual query-refresh behavior rather than promising immediate live updates in every open tab.

For recovery, roll back to a compatible application version or forward-fix the display logic. If an authorized operator deactivated the wrong game, reactivate that catalog entry rather than reconstructing profiles or accepting memberships again. Keep database contents and audit history intact. A UI rollback may restore the earlier inactive-game display behavior; it should not require deleting any data.

Discord-based automatic acceptance remains **deferred and unimplemented**. See `discord-game-membership-automation.md`; game visibility work neither enables it nor changes the shared bot/Worker.
