# Discord-based game membership acceptance — deferred implementation

## Status and release boundary

**Planning documentation only. Automatic acceptance is not implemented, enabled, migrated or deployed.** The user explicitly deferred this work while public-profile placement and admin usability are improved. Existing manual acceptance, saved-IGN requirements and member actions remain unchanged.

Merging the current website changes into main does **not** enable Discord-based acceptance. A website release may retain the manual workflow. Before promotion, explicitly choose either **manual membership only** or a **separately implemented, tested and approved automation release**. Do not treat this document as an executable migration or permission to deploy the shared bot.

For the current website's actual schema prerequisites, authentication cutover and preservation checks, follow `game-membership-deployment.md` and `game-workspace-redesign.md` first.

## Intended outcome

An existing website member who holds an approved game-specific role in the official Discord server should be accepted for that game without an administrator repeatedly reviewing the website application. Discord game roles are membership evidence, not gameplay roles, Main Game preferences or global ROSE verification.

Automation must not fill or overwrite IGN, character class, gameplay role, server, faction, region, Main Game, privacy settings or unrelated game identities. A shared Riot ID must not create memberships in every Riot title.

## Role mappings supplied by the owner

Preserve these IDs as **strings**, including in JavaScript and JSON; do not convert them through `Number`. Discord labels below are recorded exactly as supplied. Resolve each target to the existing catalog's stable game ID separately in each environment; do not create another Games catalog or assume Dev and Prod UUIDs match.

| Discord role label supplied | Discord role ID       | Intended existing game                                                                      |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| WoW Forever                 | `1548977405069234256` | World of Warcraft: Forever / WoW Forever — confirm the exact catalog entry, not generic WoW |
| Aion                        | `1547101455125577789` | Aion 2                                                                                      |
| Valorant                    | `1465129387182522450` | Valorant                                                                                    |
| Palword                     | `1475345886434295898` | Palworld                                                                                    |
| League of Legends           | `1465128743726219287` | League of Legends                                                                           |
| Marvel Rivals               | `1331615176784482306` | Marvel Rivals                                                                               |
| Wind                        | `1439483814182129695` | Where Winds Meet                                                                            |

Before activation, verify that every role still exists in the intended guild, is the correct membership signal and is mapped to exactly one intended game. Role names are descriptive only; matching uses role IDs. Multiple mapped roles should support multiple memberships. For several roles mapped to one game, membership evidence must be aggregated before considering removal.

## Existing code and the shared-environment hazard

The inspected implementation currently synchronizes **ROSE verification**, not per-game membership:

- `scripts/discord-role-bot.ts` starts the Gateway listener in `src/features/auth/server/discord-role-bot.server.ts`.
- The listener consumes member-update role arrays and calls `applyVerificationFromRoleIds` in `discord-verification.server.ts`.
- `workers/discord-sync/src/index.ts` exposes scheduled/manual synchronization. `sync-member.ts` creates its own Supabase client from the Worker's environment and updates verification/strike state.
- `src/features/auth/server/discord-worker-sync.server.ts` calls the separately configured Worker. Member verification refresh and admin sync paths can invoke it.

**Local source/configuration inspection found:**

- The local application's browser database is Dev `xjwugbbrqpwnenmlrkdh`.
- Its Worker endpoint points to the existing `blackrose-discord-sync` service.
- `workers/discord-sync/wrangler.toml` names that same service, has no named Dev environment, and its database URL targets Prod `efchfvreaotskrdlweze`.
- **The deployed Worker's current secrets/configuration have not been verified.** Repository configuration is evidence of a cross-environment risk, not proof of a production write or of live configuration parity.

A Dev website database does not isolate an independently configured Worker. UI/browser fixtures must intercept sync calls and mutations; do not use real verification/admin sync buttons as a Dev test until the endpoint's actual target is proven safe. Do not run the existing unqualified Worker dev/deploy aliases assuming they select a Dev database.

Before future testing, provision a separately named Dev Worker or isolated local sync process with Dev-only database credentials and a separate sync secret. Add fail-closed expected-project and guild checks before any writes; the proposed guards are not present yet. Keep production cron, ROSE verification and deployed Worker settings untouched during preparation. Sharing the existing bot identity still shares Discord permissions, credentials and operational limits; a separate test bot/guild gives stronger isolation when practical. Do not rotate the shared token or change its permissions/intents as part of routine Dev testing.

## Policy decisions required before implementation

These are recommendations, **not approved or current behavior**:

| Case                                                              | Recommended future behavior / decision needed                                                                                                                                                                                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Valid mapped role on an existing linked member                    | Accept automatically, including members who already held the role before rollout. Decide whether a website application is unnecessary; that best matches the owner's goal.                                                                                     |
| Role holder has no saved IGN/profile                              | Prefer accepting the affiliation and separately flagging missing profile details. Current SQL rejects acceptance without a saved nonblank IGN; this requires an explicit, versioned policy/schema change, not fabricated profile data or bypassing validation. |
| Role is confirmed removed                                         | Prefer Inactive only for Discord-managed acceptance, preserving profiles and history. Confirm this with the owner before implementing.                                                                                                                         |
| Member leaves Discord                                             | Decide the membership outcome separately from ROSE verification. Require an authoritative absence, not an ambiguous fetch failure.                                                                                                                             |
| Member selects Leave while still holding the role                 | Decide whether Discord-managed games direct them to manage the role in Discord, or an explicit opt-out suppresses reacceptance. Avoid silently reaccepting immediately after a website leave.                                                                  |
| Administrator makes an exception                                  | Define an explicit audited override/suppression and how it is cleared. Do not have periodic sync silently fight manual decisions.                                                                                                                              |
| Existing manually accepted record lacks the role                  | Preserve it by default; do not revoke manual acceptance during initial reconciliation. Decide whether/how records become Discord-managed.                                                                                                                      |
| Catalog game inactive, role deleted or mapping disabled           | Preserve history and surface configuration issues; do not mass-revoke on a broken mapping. Define deliberate deactivation/removal policy.                                                                                                                      |
| Discord timeout, 403, rate limit or malformed/incomplete response | Keep the last known membership state, record the error and retry. An API failure is not proof that a role was removed.                                                                                                                                         |
| Discord user not linked to a website member                       | Do not invent a website account. Reconcile after a legitimate sign-in/link and during subsequent runs.                                                                                                                                                         |

Discord-confirmed acceptance must not grant admin rights or silently change ROSE verification. Keep the existing public profile privacy check; only accepted game names/icons belong in the public membership projection.

## Future implementation work — not prepared yet

1. **Authority and schema:** record the approved policies; add a new forward migration for role mappings, sync provenance/observations, overrides and service-only transactional reconciliation. Keep already-applied SQL immutable. Review the existing acceptance/IGN guards and audit actor constraints together; never impersonate an administrator to get around them.
2. **Atomic writer:** match the trusted guild + Discord user to the existing member and mapped game. Serialize against current membership/profile changes using compatible member-row locking. Record source, role/guild evidence, old/new status, reason and observation time in the audit trail. Keep unrelated profile fields untouched and enforce active-game policy.
3. **Idempotency and ordering:** repeated observations must not create duplicate events or rows. Prevent stale/out-of-order events and concurrent manual actions from overwriting newer decisions; fetch an authoritative current role snapshot when needed. Store enough provenance to distinguish manual from Discord-managed acceptance.
4. **Integration:** reuse the existing bot rather than introducing a conflicting role-management bot. Choose one canonical reconciliation writer, then connect real-time events, first-login reconciliation and periodic recovery as appropriate. Existing verification queues may not cover every already-Verified member; game-role recovery must cover all relevant linked members.
5. **Operational controls:** disabled-by-default activation, dry-run diff, bounded batches, retry/backoff, safe logs, sync health/last observation and explicit mapping errors. Preserve existing ROSE verification behavior. Do not log tokens, sync secrets or full unnecessary Discord payloads.
6. **UI:** show a concise Discord-managed/source indicator and useful incomplete-profile/sync-error state. Adjust member Apply/Leave and admin override controls to the chosen policy; do not show controls that periodic sync will immediately undo.

No schema/RPC names, migration versions, feature flags or deployment commands in this section should be assumed to exist. Author and test the actual artifacts during the future implementation.

## Promotion and activation checklist

### Before any production execution

- [ ] Obtain separate implementation/deployment approval and settle all policy decisions above.
- [ ] Recheck effective browser/server **and Worker** project targets, actual deployed Worker configuration, guild, role IDs, catalog game IDs and Discord permissions. Record facts without exposing secrets.
- [ ] Recheck Prod schema/migration drift read-only under authorization; Dev/Prod equivalence has not been established.
- [ ] Prepare versioned forward SQL, service/RLS grants, tests, application compatibility order and recovery controls. Do not promote Dev data, UUID assumptions or credentials.
- [ ] Rehearse on isolated Dev first. Preserve before/after counts/checksums for existing members, profiles, identities, catalog rows and unrelated memberships.
- [ ] Obtain an appropriate backup/restore point before authorized production migrations and first activation.

### Dev acceptance proof

- [ ] Each supplied role maps to its intended game, including Aion→Aion 2, Wind→Where Winds Meet and the specific WoW Forever entry.
- [ ] Existing role holders reconcile without a new role-change event; newly linked accounts reconcile after sign-in.
- [ ] Duplicate/reordered events, missed events, reconnects and concurrent admin/member actions preserve correct state and audit idempotency.
- [ ] Multi-role members affect only mapped games; ROSE verification, Main Game and character information are unchanged.
- [ ] Missing IGN, applying/inactive/left states, manual acceptance/overrides, inactive games, missing accounts and guild departure follow the explicitly approved policy.
- [ ] Removed roles are distinguished from failed/rate-limited/partial responses; network failure never mass-revokes acceptance.
- [ ] Spoofed browser role IDs and untrusted callers cannot invoke acceptance; only the intended server principal can reconcile.
- [ ] Public privacy and removed-acceptance visibility still work; exports/rosters reflect real membership rather than merely identity presence.
- [ ] Dry-run mode reports changes without writes; wrong-project/guild guards fail closed.

### Separately authorized production rollout

- [ ] Install reviewed additive migrations before deploying new callers; keep automation disabled.
- [ ] Configure production-specific secrets and explicit target checks without replacing the existing shared Worker accidentally.
- [ ] Verify current manual membership, authentication and ROSE verification paths before activation.
- [ ] Run a dry-run reconciliation, inspect proposed changes and approve a small production batch first.
- [ ] Enable bounded reconciliation, verify actual rows/audit and unchanged unrelated data, then broaden gradually.
- [ ] Monitor failed mappings, retries, drift and unintended changes. Record what was actually prepared, applied, deployed and verified separately.

## Recovery

Disable **game-membership automation only** first; keep the existing website and ROSE verification available. Pause new game-membership jobs/events or gate their writer. Preserve mappings, observations and audit history for diagnosis.

Use reviewed compensating changes only for records demonstrably changed by the faulty run, accounting for later legitimate manual/member actions. Disabling automation does not undo prior acceptance; a bulk reversal must not overwrite newer decisions. Prefer a forward fix. Do not drop populated tables, delete profiles, reset Prod, replace Prod with Dev, or roll back unrelated migrations to undo this feature. Document exact disable/compensation commands only after the future implementation provides and tests them.
