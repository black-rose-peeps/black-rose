# User experience update: navigation hubs, community, profile editor

## Scope

Local-only user-interface work on `work/local-development`:

- Tournament browsing and Hall of Champions share one tournament hub, with a discoverable in-page switch instead of separate top-level header entries.
- Member Dashboard and My Teams share a dashboard hub, with an in-page switch. Existing team details, invitations and create-team links must remain functional.
- Community Past Events descriptions use justified text on wider screens and left alignment on narrow screens to avoid stretched word spacing.
- Community Magna Carta / Guild Code cards use Roman numerals I–IX, matching the landing-page principle numbering style.
- Profile editing gains clearer section navigation and save-state feedback while preserving existing identity, game, social and privacy behavior.

Retain the existing Black Rose visual identity, mobile layouts, accessible focus/labels and working browser history. Existing Champions/Teams URLs must continue to resolve through compatible redirects or equivalent routing; direct links and query intent must not be silently dropped.

## Database and release boundary

This is an application/UI change, not a database migration. No new tables, columns, functions, policies, data backfills or production data imports are expected. All local application database access must target Dev project `xjwugbbrqpwnenmlrkdh`; database changes and production deployment require separate authorization.

Production release requires review of the application diff, successful build/focused checks, desktop/mobile route and profile smoke tests, and confirmation that production environment variables still reference production. Do not copy ignored `.env.local`, developer test fixtures or Dev data to production. Apply the environment and recovery gates in [member-directory-deployment.md](./member-directory-deployment.md).

## Acceptance checklist

- [x] Tournaments and Champions accessible from one hub; no separate Champions entry in the main header/mobile header menu.
- [x] Dashboard Overview and My Teams accessible from one hub; no separate Teams entry in the main header/mobile header menu.
- [x] Legacy listing/create destinations and query intent pass route integration tests. Real-browser Champions redirect and fixture Teams/create navigation pass; actual remote invite mutations were not exercised.
- [x] Missing sessions are rejected; stale cached roles can refresh before membership is checked by the view.
- [x] Event descriptions: desktop computed alignment `justify`, mobile `left`, with no horizontal overflow at 390px.
- [x] Guild Code cards display I–IX in both their main markers and footers.
- [x] Profile section navigation preserves dirty form state; success/error/saving/unsaved feedback remains visible.
- [x] Fixture saves preserve main role, secondary identities, profile privacy and social visibility; secondary roles are not inferred. Real remote profile saves were not executed.
- [x] Targeted lint, focused tests and combined production build results recorded with limitations below.

## Verification record

Community changes passed targeted ESLint and Prettier. The live local Vite app was checked in a real browser at 1440px and 390px: all three event-description paragraphs use justified text on desktop and left alignment on mobile; mobile page width does not overflow. The Overview DOM contains Roman-numeral Guild Code markers I–IX. Desktop screenshots were visually inspected for paragraph spacing and layout.

Navigation-hub and profile-editor implementations are complete locally:

- Public hub: `/tournaments` and `/tournaments?view=champions`; old `/champions` links redirect into the hub. A real browser confirmed one header/footer, meaningful titles, a selected-view indicator and no horizontal overflow at 390px.
- Member hub: `/dashboard` and `/dashboard?view=teams`; `create=true` opens the existing create-team dialog. Legacy Teams listing/create routes redirect without losing create intent. Team-detail and profile routes remain separate compatible destinations.
- Profile editor: desktop section navigator, mobile section selector, grouped fields, compact persistent save/discard bar, dirty-draft comparison, discard/route-exit confirmation and browser unload protection. The sticky desktop navigator sits below the fixed site header.
- Review found and fixed premature role rejection in the new Dashboard guard. Cached `not_verified` alone no longer redirects before refresh; the existing synced-session hook still checks membership before protected data loads. A browser fixture verified that fresh verification preserves the Teams/create intent.
- An isolated headless Chrome run passed 11 UI checks: unchanged-save disabling, draft retention between sections, canceled navigation, confirmed discard, fixture-save field preservation, failed-save retry, mobile section navigation/overflow, Dashboard-to-Teams switching, stale-role Teams/create intent, admin game-identity filtering and downloaded CSV role content. No uncaught browser errors occurred. Authentication, profile service and database traffic used explicit fixtures; remote writes were blocked. These are not real-login/database-save claims.
- `node --import tsx --test tests/*.test.ts`: 28 passed.
- Final `npm run build`: passed (client and server).
- Changed-file ESLint: zero errors; three existing hook-dependency warnings remain. Whole-repository lint fails on existing formatting/other findings and must not be described as passing.
- `npx tsc --noEmit`: 18 existing diagnostics, identical to a separately extracted unmodified `HEAD` baseline; no new diagnostics.
- `git diff --check`: passed. Generated client assets contain neither the server service-role credential nor the production Supabase host.

Remaining release checks: authenticated end-to-end saves/invite mutations with approved test accounts, authorized production schema/permission drift review, and resolution or explicit acceptance of repository-wide lint/typecheck failures. No production deployment, GitHub push, schema migration or database write was performed.

## Recovery

Restore the previous application release for a UI regression; no database rollback is required for a UI-only release. Preserve member data, existing URLs and production environment settings. If implementation uncovers a schema dependency or data migration requirement, document and approve it separately before execution.
