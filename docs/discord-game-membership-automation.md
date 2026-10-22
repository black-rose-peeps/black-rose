# Discord-based game membership acceptance

## Status

**Dev verification and independent reviews passed; production activation remains gated.** Both ordering defects were reproduced before repair and now pass the Dev regressions. Core security/logic and Worker scheduling reviews found no blocking issues. Original applied migrations remain unchanged.

Implemented locally on `feat/discord-game-membership-automation`; **not activated in production**. Both SQL migrations are installed on Dev `xjwugbbrqpwnenmlrkdh`: expand version `20261021183148`, then observation-ordering version `20261021192946`. The rollback-only rehearsals passed **57 assertion groups** (43 main + 14 ordering). Preservation evidence: `discord-game-membership-dev-verification.json`.

Dev verification did not access production data, start a live bot or deploy the Worker. The subsequent release is explicitly code-only: production Wrangler configuration sets `DISCORD_GAME_MEMBERSHIP_ENABLED=false` and the expected production project reference. Publishing that code does not activate game-membership automation or apply production SQL.

**Environment warning:** the latest effective local application settings select Prod, not Dev. The shared Worker source also targets Prod; its deployed settings are unverified. Connecting the management tool to Dev changes neither runtime. Prepare matching isolated Dev browser/server keys and a Dev Worker endpoint, then restart the processes before a real Dev application/sync test. Do not use current sync buttons or unqualified bot/deploy aliases as Dev tests.

## Rules

| Situation | Result |
| --- | --- |
| Verified Discord-linked member saves valid IGN, applies and already holds the matching game role | Accepted immediately in the same transaction. |
| Valid saved IGN and Apply, but no role or Discord proof unavailable | Applying; normal manual review remains possible. |
| Missing/invalid saved IGN | Apply rejected. Optional class, gameplay role, server and faction remain optional. Riot games require valid Riot ID syntax. |
| Role/profile exists, but no explicit application | No membership invented, including other games sharing a Riot identity. |
| Applying member later receives role | Gateway or rotating recovery sweep can accept. |
| Confirmed role loss/guild departure | Only Discord-managed Accepted becomes Inactive; profile/history retained. |
| Role returns and identity remains valid | Discord-managed Inactive can become Accepted again. |
| Member leaves/withdraws | Left/Interested respected until another explicit Apply. |
| Admin changes or explicitly saves a status | Automation ownership cleared. Manual acceptance and overrides are preserved; a new explicit Apply can release a manual Applying override. |
| Inactive game, deleted role, missing/disabled mapping, timeout, 403, 429, malformed response | No inferred role loss or mass revocation. |

Reconciliation does not alter ROSE verification, admin privileges, Main Game, character details, privacy or unrelated identities. Acceptance notifications use genuine audit transitions. Browser-supplied roles are never evidence.

## Approved mappings

Guild: `1193921905795792906`. All seven roles were confirmed present with a read-only Discord request. IDs remain strings. Catalog UUIDs are resolved per environment; missing/ambiguous games abort installation rather than importing Dev data.

| Owner label | Role ID | Game |
| --- | --- | --- |
| WoW Forever | `1548977405069234256` | World of Warcraft Forever / WoW Forever |
| Aion | `1547101455125577789` | Aion 2 |
| Valorant | `1465129387182522450` | Valorant |
| Palword | `1475345886434295898` | Palworld |
| League of Legends | `1465128743726219287` | League of Legends |
| Marvel Rivals | `1331615176784482306` | Marvel Rivals |
| Wind | `1439483814182129695` | Where Winds Meet |

The reader validates role configuration before member lookup and forces a fresh check before reconciliation. Only Discord `404` / `10007` Unknown Member proves guild absence. Gateway event roles are hints; the adapter fetches current REST evidence. SQL RPCs are service-only; do not submit browser evidence through another service endpoint.

## SQL order and verification

1. Complete the five foundation migrations/authentication cutover in `main-production-sql-rollout.md`.
2. Add `sql/20261021_discord_game_membership_expand.sql`, then the required `sql/20261022_discord_game_membership_observation_ordering.sql` forward repair before any activation. It introduces private mappings, ownership/evidence, updated manual writer, atomic reconciliation and the bounded queue. Existing October 19 SQL is immutable. This is not an idempotent replay script: inspect history/schema first.
3. **Dev only:** run all of `sql/20261021_discord_game_membership_verify.sql` and `sql/20261022_discord_game_membership_ordering_verify.sql`. Synthetic records and actual service/browser privilege checks end in `ROLLBACK`. On error, issue `ROLLBACK` immediately. Never use this fixture as a production migration.
4. Read back mappings, function signatures/grants and preservation checks before deploying callers. New RPCs use invoker security; `anon`/`authenticated` cannot execute them or read private mappings/audits.

Dev results: **57 SQL groups passed**, no persisted fixture members, seven mappings installed. Before/after counts and ordered checksums match for members, legacy/per-game profiles, games, game roles, memberships and events. Legacy checksum comparison excludes the four new membership fields (`discord_managed`, `discord_observed_at`, `membership_decided_at`, `discord_suppressed`) and event `discord_evidence`. Expand matches the recorded statement after trimming outer whitespace; ordering repair matches normalized SQL with comments/whitespace removed, not a raw-byte comparison.

Combined regression suite: **338 passed**, no failures/skips; website build, Worker typecheck and changed-file lint passed. Root TypeScript has the same **18 pre-existing diagnostics** as archived HEAD, with no additions. Repository-wide lint is not clean; unrelated existing findings were not rewritten. Two-session blocking/concurrency and real-account runtime smoke checks remain unexercised rollout gates; single-session SQL and transport fixtures do not prove them.

## Runtime controls

Set server-only controls separately in website, optional Node bot and Worker:

- `DISCORD_GAME_MEMBERSHIP_ENABLED=true`: exact opt-in; missing/other values keep manual/legacy ROSE behavior.
- `DISCORD_GAME_MEMBERSHIP_EXPECTED_PROJECT_REF`: exact intended project reference. Enabled wrong-project/guild checks reject before database work.
- `DISCORD_GUILD_ID=1193921905795792906` and existing authorized `DISCORD_BOT_TOKEN`.
- Worker optional `DISCORD_GAME_MEMBERSHIP_BATCH_SIZE`: default/max `8`.

Website/Node uses `VITE_SUPABASE_URL` (fallback `SUPABASE_URL`) and matching server credential. Worker has independent `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SYNC_SECRET`. All keys must match the selected project. Keep secrets out of `VITE_` variables, chat and Git. Restart/redeploy after settings changes rather than relying on cached clients switching targets.

## Request budget

Apply's membership data layer uses **one indexed saved-profile/member/game join plus one atomic RPC**, with existing authentication reads additional. Concurrent identical Applies share the work. Recovery uses one bounded queue RPC and at most one batch reconciliation RPC, not per-member/game Supabase queries. Empty queue needs one read. The ordering repair keeps unchanged status, membership `updated_at` and audit events untouched while advancing a necessary private observation checkpoint; this adds no RPC/request.

The combined Worker preserves its 50-request budget and two-request margin. Enabled ROSE work is capped at 36; 12 are reserved for a cold game batch: queue + initial metadata + eight member reads + fresh metadata + reconciliation. Selected Verified-member removal checks run before the hot queue when that reservation is active, so the smaller ROSE allowance cannot consume their reserved slots first. Legacy OFF order and explicit Not Verified priority mode are unchanged. Attempts are charged before fetching, including failures/retries. Budgeted requests reject redirects so hidden redirect hops cannot bypass the counter. Tests exercise the 48-request boundary. Existing recovery cadence is reused; rotation delay depends on population/batch size, not instant all-member backfill.

These controls are not a billing guarantee. Monitor actual Supabase compute/egress and Worker CPU/requests. References: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [Supabase egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

## Manual CLI rollout

### Isolated Dev

`workers/discord-sync/wrangler.dev.toml` names `blackrose-discord-membership-dev`, targets Dev, has no cron/secrets and disables automation by default. From `workers/discord-sync`, with dependencies installed:

```bash
npx --no-install wrangler deploy --dry-run --config wrangler.dev.toml
```

This bundles without deploying. Before an authorized Dev deployment, securely provision `SUPABASE_SERVICE_ROLE_KEY`, `SYNC_SECRET` and `DISCORD_BOT_TOKEN` through Wrangler's interactive `secret put <NAME> --config wrangler.dev.toml` flow. Verify Dev key pairing/schema, then explicitly enable the Dev flag and deploy with that same Dev config. Do not use the unqualified root deploy alias.

Authenticated `POST /sync/game-memberships` accepts only optional boolean `dryRun`. `{}` defaults to dry-run; `{"dryRun":false}` explicitly writes a bounded batch. It returns aggregate counts only. Use `Authorization: Bearer <environment SYNC_SECRET>` via secure operator tooling; never use the shared production endpoint as a Dev test.

Optional Gateway process, after preparing a complete ignored Dev environment file:

```bash
node --env-file=.env.discord-membership-dev.local --import tsx/esm scripts/discord-role-bot.ts
```

That environment file is an operator prerequisite, not created here. The Worker recovery path does not require a continuously running Gateway process; Gateway adds faster role-change wake-ups.

### Production: separate authorization required

1. Inspect production schema/catalog drift and deployed targets under separate approval. Save suitable backup and before-state checks. All intended games must exist unambiguously.
2. Freeze member/admin membership writes and all bot jobs, drain in-flight actions, then install both reviewed additional SQL files after the foundation migrations. Keep activation disabled until checks and compatible callers are ready. Promote source/SQL, never Dev data, fixture rows, keys or UUID assumptions.
3. Deploy compatible website and Worker with production settings. The production Worker configuration now explicitly includes disabled activation and expected project `efchfvreaotskrdlweze`; preserve its existing name, database target, secrets and cron. Set the activation flag to `true` only after database and smoke-test prerequisites pass.
4. After authorization, from `workers/discord-sync`, run `npx --no-install wrangler deploy --config wrangler.toml`. Read back actual deployed name/target/flags; repository configuration is not deployment proof.
5. Complete real member/admin/ROSE smoke tests, two-session locking rehearsal, a game-membership dry-run and a reviewed small batch. Enable required runtimes only after these gates pass; verify persisted status/audit, notification and preservation before broadening.

Manual SQL Editor changes need an operator log/history reconciliation; they do not automatically reproduce Dev migration history. Do not run unchecked `supabase db push` over installed objects.

## Disable/recover

Set `DISCORD_GAME_MEMBERSHIP_ENABLED=false` in every active website/bot/Worker environment, then restart/redeploy. Website manual membership and legacy ROSE behavior remain available. Retain additive schema and audit history.

Disable does not undo past acceptance. Use reviewed compensating manual decisions for specific audited changes, respecting newer legitimate actions. Do not delete profiles/audits, drop populated tables, reset production or replace production with Dev. Backup restoration is a separate decision that can lose later writes.
