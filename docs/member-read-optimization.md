# Member read optimization: Overview and My Teams

## Scope and safety boundary

Reduce repeated reads in the Dashboard Overview, My Teams, championships and member notifications without disabling updates after real changes. Development target remains `xjwugbbrqpwnenmlrkdh`; no production execution, GitHub push, schema migration, data backfill or database write is authorized for this task.

This is an application-only change. Existing administrative reconciliation remains available to admin/mutation paths; passive member reads should not invoke it. Do not copy Dev data or ignored `.env.local` into production.

## Evidence before optimization

The supplied network URL captures contain:

| Capture  | Listed requests | Distinct exact URLs | Repeated exact URL occurrences | Full tournament-list requests |
| -------- | --------------: | ------------------: | -----------------------------: | ----------------------------: |
| Overview |             221 |                  68 |                            153 |                            16 |
| My Teams |             138 |                  67 |                             71 |                             7 |

These are counts of the user's captures, not clean timed-load benchmarks. They do not include HTTP methods/statuses/timings/request bodies, so repeated RPC URLs may represent different payloads. All Supabase hosts in the supplied lists reference Dev.

Root causes traced in source: championship work loaded the full tournament list independently per team; dashboard, championships, teams and notifications separately hydrated overlapping roster data; membership notifications loaded whole teams individually; full admin tournament hydration queried counts for every tournament and could persist counts/deadline status; focus sync broadly invalidated unrelated cached data.

### Signed-in user captures and historical-champion follow-up

The October 19 captures supplied after the first optimization contain:

| View     | Listed requests | Distinct exact URLs | Repeated occurrences | Full tournament lists | Tournament detail reads | Count queries |
| -------- | --------------: | ------------------: | -------------------: | --------------------: | ----------------------: | ------------: |
| My Teams |              25 |                  22 |                    3 |                     0 |                       2 |             2 |
| Overview |              33 |                  31 |                    2 |                     1 |                       2 |             2 |

These captures contain only the Dev Supabase host and the local app host. They are not matched cold-cache timing benchmarks. My Teams' missing list read is consistent with an already cached snapshot, not proof that every cold load needs zero list reads. Repeated bracket RPC URLs may have different request bodies.

Both captures expose a missed championship branch: `fetchTournamentRegistrations` loaded full registration players, called the administrative tournament-detail service (including count reconciliation), then hydrated every historical entrant's live team and profile. The two profile batches contain 8 and 94 member IDs. URL-only captures cannot establish whether reconciliation actually wrote data.

The follow-up replaces that championship-only dependency with `championship-registration.service.ts`: one read of registration ID, roster-team ID, historical name and tag per relevant tournament. It does not request tournament details, counts, players or unrelated live rosters. Already loaded current teams supply rename aliases; the team-detail route passes its loaded team too. Administrative registration loading is unchanged. The counts above describe the supplied captures **before this follow-up**, not a measured final live-account budget.

## Change ledger

| Area                       | Intended behavior                                                                                                                                                                 | Persisted-data impact                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Shared tournament snapshot | One raw, read-only cache entry; public views derive visibility with `select` rather than caching a filtered shape under a shared key                                              | No writes                                           |
| Member teams/registrations | Per-member and per-team query keys with the existing freshness window; share pending/fresh reads across consumers                                                                 | No writes                                           |
| Championships              | One lightweight tournament snapshot per operation; share pending bracket/historical-registration reads per tournament; reuse supplied hydrated teams                              | No writes                                           |
| Notifications              | Coalesce concurrent membership syncs; batch missing invited/removed teams; comment events refresh comments only; focus uses freshness rather than forcing unrelated invalidations | Browser notification state only                     |
| Session refresh            | Share pending reads, queue a fresh read after realtime/manual verification changes, discard signed-out/switched-member responses, and preserve newer local profile edits          | Existing browser session refresh only               |
| Public tournament service  | List/detail exports avoid admin count/deadline reconciliation; derive deadline-based status for display without persisting it                                                     | No writes; admin paths unchanged                    |
| My Teams consumer          | Observe shared member-team data and invalidate/refetch after actual roster mutations; preserve create/invite flows                                                                | Existing user-authorized mutations remain unchanged |

No SQL migration is required. Rollback is the previous application release; no database reversal should be performed for this optimization.

## Verification record

- Baseline focused suite before this pass: 28 tests. At inspection, optimization edits already in the working tree brought the suite to 66 passing tests; existing work was preserved and reviewed rather than overwritten.
- Parent added failing tests for public list/detail administrative reconciliation, observed both failures, switched those exports to read-only implementations, then reran successfully.
- Final combined suite including historical-champion follow-up: **84 passed**, zero failed/skipped, with `node --import tsx --test tests/*.test.ts`.
- Controlled, no-network championship probe with four fixture teams and no registrations: tournament snapshot loads reduced from **4 to 1**. Four team-registration reads remain appropriate for distinct team inputs in this probe; do not describe this as one total request.
- Championship regression tests cover shared brackets/history, historical roster matching, stored/managed/public/fallback champion detection, completed/archived eligibility, ordering, no-data cases and rejected-read recovery.
- Shared-read and notification fixtures cover raw-cache shape, per-member isolation, profile-comment/read-state preservation, duplicate sync coalescing and selective invalidation. These are synthetic I/O tests, not real database mutations.
- Final combined `npm run build`: passed. ESLint passed for optimization services/hooks, My Teams, public tournament exports, shared query keys and all test files. `git diff --check` passed.
- TypeScript is not repository-wide green: `npx tsc --noEmit` reports the same **18 diagnostics** as unmodified HEAD. Comparing normalized source paths, diagnostic codes and messages (ignoring line positions) found **zero new or resolved diagnostics**. Existing repository-wide lint failures are separate from the passing optimization-scoped lint run.
- My Teams regression tests cover fresh-cache reuse, externally updated query data, accept/decline/create refreshes, synchronized-session gating, working retry, realtime invalidation and an in-flight pre-mutation read not restoring a stale invitation.
- Follow-up tests first failed on administrative history hydration and current-name alias matching, then passed after the fix. Direct reader tests verify the actual four-column query, null roster/tag handling, empty history and failure recovery. Follow-up build and scoped ESLint passed; TypeScript remains at the same 18 baseline diagnostics.

### Independent review findings and resolution

1. **An authoritative access change could join an older pending snapshot.** Added failing session/access tests, then queued one fresh read for pending same-member reads when realtime or manual verification requests freshness. Ordinary simultaneous mount/focus reads still coalesce. Both verification hooks now explicitly request freshness on authoritative changes, and profile-edit comparisons use the beginning of each read attempt.
2. **Realtime invalidation could be cleared by an older background query response.** Added a failing hook test using an actual TanStack QueryClient: an old `Upcoming` response previously remained fresh after a `Live` event. Affected pending query results are now cancelled before selective invalidation/refetch, preventing pre-change results from satisfying the refresh. The test now passes without broad focus invalidation or disabling realtime.

All three new regression cases were observed failing before their fixes and passing afterward. The final browser fixture below was rerun after these fixes.

### Controlled browser fixture

The first fixture rendered four teams and one concluded tournament but returned no bracket payload, so it did not exercise historical championship hydration. Its 18/19 totals below are retained as earlier evidence, not coverage of that branch. Session/profile services and remote database responses were explicit fixtures; methods other than GET/HEAD and the read-only bracket RPC were blocked. OPTIONS/preflight and static asset requests are not included in the counts.

| View     | API requests | Tournament-list reads | Per-tournament count reads | Additional reads in quiet window |
| -------- | -----------: | --------------------: | -------------------------: | -------------------------------: |
| Overview |           18 |                     1 |                          0 |                                0 |
| My Teams |           19 |                     1 |                          0 |                                0 |

Both views rendered without uncaught browser errors or attempted database mutations. The fixture stubs session/profile server-function calls, so these totals are not production request budgets. A matching unmodified-HEAD browser baseline could not be completed because Nitro failed to resolve its dev-entry through the scratch snapshot's linked dependencies. The earlier four-to-one championship operation probe is the directly measured before/after comparison; do not calculate a page-wide percentage against the user's different capture.

A claim of a precise page-wide percentage reduction requires a new controlled capture: same member fixture/data, fresh cache, same navigation, no preserved prior network log, and a recorded observation window. The original 221/138 counts alone cannot establish that percentage.

The expanded fixture now returns a published bracket with a champion and nonempty tournament-wide registrations. After the follow-up, it rendered **19 Overview / 20 My Teams** API requests, one historical identity query per view, zero count queries, zero tournament-detail reads, one own-team/profile hydration per view, zero additional quiet-window reads, no uncaught errors and no attempted mutations. Those are fixture totals, not authenticated live-account totals. Ordinary per-team registration/player reads remain for dashboard activity and are not the removed historical full-roster expansion.

## Freshness requirements and release checklist

1. Verify concurrent and sequential consumers reuse the same fresh data while distinct member IDs remain isolated.
2. Verify actual roster changes invalidate team/registration/dashboard/championship reads. A cached query is not a substitute for observing updates in the mounted Teams view.
3. Verify tournament changes refresh statuses/results; comment-only events must not reload the full roster/tournament graph.
4. Keep save/accept/decline authorization and authoritative validation intact. Optimization of a read must not weaken a mutation guard.
5. Confirm public list/detail reads neither reconcile counts nor write deadline state. Cached counts rely on approved administrative/mutation paths to maintain them.
6. Run focused tests, build, changed-file lint, TypeScript comparison to baseline, and browser checks. Record existing lint/typecheck failures separately rather than claiming repository-wide gates are green.
7. With separate production authorization, verify prerequisite schema/permissions and review application rollback/backup policy. Deploy source with production credentials; never upload a Dev-bound local build unchanged.

## Remaining release validation

Local implementation and expanded fixture verification are complete. A new live-account capture after the historical-champion follow-up is still needed. Real credential-based invite/profile mutations and a same-member, same-data before/after network benchmark were not performed. Before a separately authorized production release, exercise those authenticated flows on Dev and apply the release checklist above. No schema changes, database reset, production deployment, Git commit or GitHub push was performed for this optimization.
