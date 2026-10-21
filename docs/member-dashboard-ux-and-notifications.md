# Member dashboard UX and game acceptance notifications

## Scope

- Overview and My Teams retain the existing feature-page design: shared `MemberHeroBanner`, the familiar Overview stat/card grid, branded team cards, typography and actions. Refinements are limited to wrapping/spacing, role-aware team links and preserving existing content on invitation errors. The experimental compact header/sidebar redesign was rejected and removed. See [dashboard-ui-refinement.md](./dashboard-ui-refinement.md).

- Preserve page scroll when switching Identity, Social Links and Privacy inside Edit Profile. Both desktop tabs and the mobile section selector use query-only navigation without resetting scroll. Real route exits and dirty/pending-save guards retain their established behavior. A shorter section can naturally clamp the position to the page's new maximum scroll offset; it does not deliberately reset the page to the top.
- Overview initially shows up to three active, configured identity summaries. A small muted **N more** action and chevron blend into the list; **Show less** restores the compact list. There is no boxed footer, background or visible showing/total counter. The count remains available to assistive technology. Additional rows fade in and the chevron rotates; reduced motion disables both effects. Keyboard focus remains on the control, with a visible keyboard-focus indicator and a 44px-high invisible hit area. A shared Riot ID is one summary, not a duplicate row for each associated game. Main-game ordering and inactive-game masking are unchanged; expanding is display-only.
- A member's existing notification bell displays a game-membership acceptance alert and links to that game's My Games editor. This is an in-app notification, not a Discord DM, email or OS push notification.

## Acceptance source and authorization

The source is the existing append-only `game_membership_events` history. An actual transition to `accepted` produces an event; setting an already Accepted membership to the same status must not create a second acceptance event. Leaving and later being accepted again is a new event and can produce a new unread notification.

The new `fetchMyGameMembershipAcceptances` POST server function accepts no member ID. Its server helper calls `requireMemberSession()` before obtaining the privileged client, then filters every query by that signed member ID and `new_status = accepted`. Only event ID, game ID, public game label and timestamp leave the server. Reasons, actor identities and other members' audit records are not returned. Inactive/missing catalog games, invalid timestamps and no-op transitions are withheld.

The feed inspects at most the latest 100 acceptance events, ordered by timestamp and ID. It traverses smaller API row caps within that bound. This is a bounded recent-history inbox, not a full audit export. Existing older acceptance events can appear when the feature is first opened; their original timestamps are preserved rather than announcing them as newly approved today.

The browser verifies the server response's owner against the requesting account before merging it into that member's inbox. Concurrent reads for one account share a request. A failed read never becomes an authoritative empty result and never clears saved notifications.

## Delivery and read behavior

- Fetch on authenticated mount and window focus, using the existing notification sync coalescing.
- While a tab is visible, check only this private approval feed every 60 seconds. Hidden tabs skip the interval. Focus resumes a fresh check; delivery is not guaranteed to be instantaneous.
- Private audit history is **not** exposed to anonymous Realtime subscriptions. No new browser policy, channel, database write or notification table is introduced.
- Event-based IDs prevent duplicate notifications from polling/reloading. Existing member-scoped read IDs and timestamps are preserved. A later distinct acceptance for the same game is separately unread.
- An authoritative empty/changed active feed replaces only the game-acceptance category. Team, tournament and comment alerts remain intact. Existing read IDs survive an inactive/active catalog cycle.
- A newly observed event invalidates only that member's My Games workspace, preserving established dirty-editor rebasing. An unchanged poll does not invalidate team/tournament/profile caches.
- An unavailable approval feed does not stop the other notification categories, and the next scheduled/focus check can retry.
- Clicking the alert uses a typed client-side link to `/dashboard?view=games&focusGame={stored-game-id}`, marks it read and retains the route's normal unsaved-change protections.

Read/unread state remains browser-local and member-scoped, matching the existing notification system. The acceptance itself remains durable server history and can be rediscovered on another device, but a read on one device is not synchronized to another device. This change does not claim durable multi-device notification delivery.

## Deployment and recovery

No **new** SQL migration is required for this follow-up. The earlier additive game-membership migrations and trusted session configuration in `game-membership-deployment.md` remain prerequisites. Deploy compatible client and server application code together. Do not copy Dev database contents into production.

A read-only Dev inspection found the existing audit table and game foreign key present, RLS enabled, service-role SELECT allowed, anonymous SELECT denied and no browser policies. No audit or membership rows were inserted, updated or deleted by this follow-up's verification.

Before a separately authorized production release:

1. Finish the existing member/admin authentication release gates on the intended environment, including server-only signing/service credentials. Never put them in browser-prefixed variables.
2. With approved test accounts, apply for an active game, accept through the normal admin action, then confirm the member sees one alert on focus or the next visible-tab check and can open the correct My Games editor.
3. Mark it read, refresh and confirm it remains read. Check a separate signed account cannot retrieve that member's feed. Leave/reaccept should produce a distinct event; repeated same-status saves should not.
4. Temporarily make the feed unavailable in an isolated rehearsal and confirm existing inbox items and unrelated notification categories remain usable; restore and retry.
5. If application rollback is necessary, revert the compatible application release. Keep existing game profiles, memberships and append-only events; do not drop tables, delete history or reopen browser writes.

Discord-role automatic acceptance remains **deferred and disabled**. No bot/Worker changes are part of this work. A future automation writer must use the approved status-transition/audit path so its genuine acceptance events can feed the same notification mechanism; see `discord-game-membership-automation.md`.

## Verification boundary

Repository regression tests cover server ownership/denials, minimal projections, active-game filtering, bounded reads, transport claim rejection, deduplication, account changes, failure preservation, polling/focus isolation, read persistence, section navigation and identity expansion. Browser checks use isolated fixtures and reject real remote mutations. They are not a real Discord login or a real admin acceptance/save rehearsal. The production gates above remain separate.

### Local verification, 2026-10-20

- `node --import tsx --test tests/*.test.ts`: **249 passed**, zero failures or skips.
- `npm run build`: passed. Scoped ESLint for the affected profile, Overview, notification code and regression tests: passed.
- `tsc --noEmit`: still exits with the existing **18 baseline diagnostics**. Comparing normalized diagnostic headers against archived HEAD found no additions or removals; this is not a clean repository typecheck.
- Desktop (1440px) and mobile (390px) browser fixtures exercised the actual Edit Profile route, Overview and notification bell. They verified all three section switches, retained unsaved headline, cancelled dirty exits (including an approval link), acceptance text and game target, read persistence after reload, and three collapsed/five expanded identity rows with working collapse. No page errors, horizontal overflow or remote writes were observed.
- A separate actual React DOM check verified focus retention, a stable disclosure target, shared Riot identity grouping, and disclosure reset after catalog shrink/account changes.
- Browser harness and report are scratch-only: `member-followup-browser-qa.mjs` and `member-followup-browser-qa.json` under the Hermes scratch directory. They mock session/remote transport, not a genuine signed-in admin/member approval exchange.

### Earlier identity disclosure visual follow-up (superseded design)

- Repository suite: **251 tests passed**. Production build and scoped ESLint passed. The disclosure regressions cover accurate singular/plural counts, native button semantics, associated count text, and withholding the footer when no expansion is needed.
- `identity-footer-browser-qa.mjs` and `identity-footer-browser-qa.json` in Hermes scratch verify the actual Overview with isolated remote fixtures at 1440px, 390px and 320px: three/five collapsed/expanded rows, full-width 44px target, Enter/Space operation, retained focus, unchanged URL, and no remote writes or page errors. The mobile scenario verifies computed reduced-motion styling. Collapsed desktop and expanded mobile card screenshots were visually reviewed.
- The identity card has no horizontal overflow at those widths. At 320px the overall page measured 325px wide; this separate page-level observation is not counted as a clean whole-dashboard narrow-screen result, and no unrelated layout changes were made.

### Subtle disclosure revision

The user rejected the prominent footer. The current design uses a compact, borderless, muted control rather than a full-width action. `identity-subtle-browser-qa.mjs` / `identity-subtle-browser-qa.json` in Hermes scratch replace the earlier visual harness for this revision. At 1440px, 390px and 320px, they verify compact control width, hidden visual count, three/five collapsed/expanded rows, Enter/Space, retained focus, no navigation or writes, and no identity-card overflow. Mobile reduced motion disables the chevron transition and additional-row animation. Desktop/mobile card screenshots were inspected. The earlier page-level 320px overflow observation remains; it is outside this card's scope.

Verification: **251 repository tests passed**, production build passed, scoped ESLint and formatting passed, and actual React DOM focus/catalog/account-switch checks passed. This revision is presentation-only: no new database migration or bot/Worker changes.
