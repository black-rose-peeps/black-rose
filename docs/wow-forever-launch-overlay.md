# WoW Forever launch page and temporary overlay destination

## Approved behavior

The floating Community Games widget keeps the normal catalog order, active-only visibility and existing destinations. Only World of Warcraft Forever receives a temporary launch destination. The original gold floating timer/direct Facebook popup was superseded by the approved understated dedicated page: quiet white numbers, small labels and minimal dividers, without decorative effects.

Before the deadline:

- The overlay keeps its normal icon/tooltip without a floating timer or gold ring. The catalog's Display Name is preserved.
- Clicking the icon opens **`/community/wow-forever` in the same tab**. The page uses the existing site header/footer, a restrained four-unit countdown, explicit Philippine launch date, a welcome for new/experienced players, Horde/PvP details and Join Discord using the existing shared invite/handoff component.
- The supplied Facebook announcement is embedded on the page. An independent View on Facebook link opens the original post in a new tab with `noopener noreferrer`.
- Both `world-of-warcraft-forever` and `wow-forever` are recognized. Canonical `World of Warcraft Forever` / `WoW Forever` names are also recognized without matching ordinary retail/Classic Warcraft entries.

At or after the deadline:

- The icon returns to the original `/community` destination and normal tooltip, with no new-tab target.
- Open pages update automatically; fresh visits after expiry also use the normal destination.
- The dedicated page remains accessible for an active game. Its countdown becomes **Now live**, retaining the announcement and Discord joining information. Fresh post-expiry visits also show Now live.
- Expiry itself never navigates or reloads the user's page. Only a later user click follows the destination.

Inactive games, unavailable catalogs and catalog failures withhold the icon and page campaign content, Discord action and iframe, including direct page visits. Failed page reads offer Retry. Palworld and Where Winds Meet destinations, Palworld query gating and Show more ordering are preserved. Visiting this page or Discord does not grant website membership; deferred Discord acceptance automation is untouched.

## Exact deadline and provenance

Source inspected in the live browser on **2026-10-21**: [Blizzard's WoW Forever reference](https://worldofwarcraft.blizzard.com/en-us/forever). Its embedded countdown configuration contains:

```text
countdown_to: 2026-11-04T23:00:00.000Z
```

That is **November 5, 2026 at 7:00 AM Philippine time (UTC+08:00)**. The reference's November 4 headline uses a different calendar/timezone context; this feature matches the absolute countdown timestamp, not midnight on November 4 in the Philippines. The user explicitly approved matching this timestamp.

Announcement destination, preserved exactly as supplied:

```text
https://www.facebook.com/story.php?story_fbid=122143611513152669&id=61584580077731#
```

The public Facebook page and native post-plugin endpoint were readable and identify the Black Rose WoW Forever announcement. Facebook's [official Embedded Posts guidance](https://developers.facebook.com/documentation/plugins/embedded-posts) was inspected, and the actual local page was viewed with the real public embed, not only fixtures. No Facebook authentication, posting or account actions were performed.

## Implementation and maintenance

- `src/routes/community.wow-forever.tsx`: public file route and metadata, generated into the router by the existing TanStack plugin.
- `src/features/game-servers/utils/wow-forever-launch.ts`: one source of truth for the deadline, internal destination, exact announcement URL, encoded embed URL, matching and remaining-time arithmetic.
- `hooks/useWoWForeverCountdown.ts`: client-mounted absolute-clock countdown, at most one pending timeout for an enabled icon, hidden-tab pause, focus/visibility resynchronization, cleanup, and no periodic ticking after expiry.
- `components/WoWForeverCountdown.tsx`: page-only, unboxed countdown with `role="timer"` and `aria-live="off"` so it does not announce every second.
- `components/WoWForeverLaunchPage.tsx`: existing site shell, active-catalog boundary, loading/live states, minimal joining copy and shared Discord action.
- `components/WoWForeverAnnouncement.tsx`: lazy native iframe, bounded measured width, observer cleanup and independent original-post fallback. A light canvas keeps Facebook's dark text readable separately from the site's dark theme; Facebook controls the post styling and See more behavior.
- `components/GameServersOverlay.tsx`: quiet same-tab campaign link. Click, auxiliary click and context-menu guards recheck actual time so a delayed/sleeping tab cannot follow an expired campaign link. Normal browser modifier/new-tab behavior is preserved.

The hook uses the normal destination during SSR and first hydration, then activates the campaign link from the client clock. The page initially shows Loading launch time rather than incorrectly claiming Now live before its clock effect runs. This avoids a time-dependent hydration mismatch or stale cached server markup leaving an expired campaign link. The clock relies on the visitor's device time, as a display/navigation feature, not an authorization control. There is no recurring backend job or runtime request to Blizzard/Facebook for the countdown.

Facebook may require cookies/sign-in or be blocked by browser settings/extensions/network conditions. A cross-origin iframe load event cannot prove usable content, so the original-post link is always present and the summary/countdown/join action work independently. Below the plugin's documented 350px minimum, show the original-post fallback instead of scaling/cropping the post or overflowing the page; resizing to a supported width restores the iframe. A bounded-height iframe allows normal browser scrolling for longer/expanded content. No SDK, Graph API token or new dependency is added.

If the official schedule changes, update the single absolute timestamp and displayed Philippine date together, adjust tests/documentation, and deploy the application code. A new promotion for another game should not reuse the Forever matcher or destination accidentally. The original Facebook post does not need to be deleted when the timer expires.

## Verification

- **278 repository tests passed**; zero failures or skips.
- Production build and scoped ESLint/format checks passed.
- TypeScript remains at the existing **18 baseline diagnostics**, with no normalized diagnostic additions/removals. This is not a clean repository-wide typecheck.
- Pure tests cover both aliases/names, the exact Philippine/UTC conversion, day/hour/minute/second arithmetic and the last millisecond, plus at/after-expiry and invalid clocks.
- Hook tests cover first hydration, scheduling, expiry, hidden tabs, focus recovery, disabled icons and cleanup.
- Rendered-component tests cover same-tab internal overlay routing, no floating timer/gold ring, active-only and failed-catalog filtering, preserved labels/data, page loading/live states, encoded exact post URL, safe external fallback and unchanged other-game destinations.
- Four actual-route browser fixtures cover both catalog variants at desktop 1440px and mobile 390px: same-tab page navigation, exact post iframe, independent fallback, automatic page expiry without navigation, fresh expired visits, restored community destination, inactive direct-route gating/reactivation, failed catalog Retry, stale-link guard, readable in-bounds countdown and no overflow. A 320px fallback/resizing recovery and blocked-embed independence also passed. All four scenarios had zero page errors and zero remote writes. Desktop/mobile long-label captures were visually inspected.

Current scratch evidence: `wow-forever-page-browser-qa.mjs`, `wow-forever-page-browser-qa.json`, `wow-page-tests.log`, `wow-page-build.log` and `wow-page-typecheck.log`. Fixtures isolate catalog/server reads and Facebook content; they verify client behavior, not production data or an authenticated account. The older `wow-forever-overlay-browser-qa.*` describes the superseded floating-timer prototype.

## Deployment and recovery

This is an application-only change: no new migration, database write, catalog rewrite, environment change, bot/Worker change, commit, push or production deployment was performed. Deploy the compatible application code through a separately authorized release. No production data should be replaced with development data.

Rollback the application change if needed; leave the existing game record, icon, slug and user/team/membership data untouched. Automatic expiry requires no manual database cleanup.
