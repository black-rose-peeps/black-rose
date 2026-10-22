import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const migrationPath = "docs/sql/20261021_discord_game_membership_expand.sql";
const fixturePath = "docs/sql/20261021_discord_game_membership_verify.sql";
test("additive Discord SQL authority exists with atomic service-only reconciliation", () => {
  assert.ok(existsSync(migrationPath), "new forward migration is missing");
  const sql = readFileSync(migrationPath, "utf8");
  for (const token of [
    "reconcile_discord_game_memberships",
    "get_discord_game_membership_sync_batch",
    "discord_game_role_mappings",
    "discord_managed",
    "discord_observed_at",
    "discord_evidence",
    "for update",
    "order by lm.id",
    "interval '120 seconds'",
    "interval '5 seconds'",
    "p_dry_run",
    "change_game_membership",
    "original_updated_at",
    "security invoker",
    "from public,anon,authenticated",
    "to service_role",
    "matched_role_ids",
  ])
    assert.ok(sql.includes(token), token);
  assert.doesNotMatch(
    sql,
    /(?:update|insert into) public\.(?:members|member_profiles|member_game_profiles)\s/i,
  );
  for (const id of [
    "1548977405069234256",
    "1547101455125577789",
    "1465129387182522450",
    "1475345886434295898",
    "1465128743726219287",
    "1331615176784482306",
    "1439483814182129695",
  ])
    assert.ok(sql.includes(`'${id}'`));
});
test("candidate revalidation locks newly configured game and mapping rows inside the transaction", () => {
  const sql = readFileSync(migrationPath, "utf8");
  assert.match(sql, /select \* into g from public\.games where id=gm\.game_id for share;/);
  assert.match(sql, /d\.game_id=gm\.game_id and d\.enabled for share;/);
  assert.match(sql, /id=any\(locked_member_ids\)/);
});
test("rollback-only fixture exercises safety, privacy, preservation and privileges", () => {
  const sql = readFileSync(fixturePath, "utf8");
  assert.match(sql, /begin;/i);
  assert.match(sql, /rollback;\s*$/i);
  assert.doesNotMatch(sql, /commit;/i);
  for (const label of [
    "immediate acceptance",
    "optional empty",
    "missing IGN",
    "invalid IGN",
    "pending application",
    "no implicit membership",
    "idempotence",
    "stale",
    "future",
    "malformed",
    "role loss",
    "role return",
    "same accepted override",
    "withdrawal",
    "left",
    "missing mapping",
    "inactive game",
    "wrong guild",
    "privacy",
    "preservation",
    "browser denied",
    "profile revalidation",
    "protected existing members",
    "queue rotation",
    "dry run",
  ])
    assert.ok(sql.includes(label), label);
});
const orderingPath = "docs/sql/20261022_discord_game_membership_observation_ordering.sql";
test("ordering authority separates manual decisions from Discord persistence and explicit suppression", () => {
  const sql = readFileSync(orderingPath, "utf8");
  assert.match(sql, /add column membership_decided_at timestamptz/);
  assert.match(sql, /add column discord_suppressed boolean not null default false/);
  assert.match(sql, /membership_decided_at=updated_at/);
  assert.match(sql, /then original_decided_at else gm\.membership_decided_at end/);
  assert.doesNotMatch(
    sql,
    /original_updated_at|else gm\.updated_at|last_actor|order by e\.created_at desc,e\.id desc/,
  );
  assert.match(sql, /oldm\.discord_suppressed/);
  assert.match(sql, /discord_suppressed=excluded\.discord_suppressed/);
  assert.match(sql, /set membership_decided_at=observed/);
  assert.match(sql, /set discord_observed_at=observed\s+where/);
  assert.match(
    sql,
    /public\.change_game_membership\(uuid,uuid,text,text,text,text,text\) from public,anon,authenticated/,
  );
});
test("applied Discord expand retains exact reviewed bytes", () => {
  assert.equal(
    createHash("md5").update(readFileSync(migrationPath, "utf8").trim()).digest("hex"),
    "ec1e4140bf26100ea1dc5fcf67459d05",
  );
});
test("immutable source migrations retain reviewed hashes", () => {
  const expected: Record<string, string> = {
    "20261019_game_membership_expand.sql":
      "d2b464092384cb3f5f29bfc77e0e840d0877e7065cf884e76206eb8f14bbd55c",
    "20261019_game_membership_integrity.sql":
      "01d740faaf0ecb6e3016d455f01777ca78963365a4089d18b9615232bddb2016",
    "20261019_game_membership_backfill.sql":
      "6ef917a0bc2bb2ff9d9e5903ff9bb5177af0844aa8b5a7247df6d510bb9783a1",
    "20261019_game_membership_catalog_rls.sql":
      "dd0cf4e5664f22cfddd782309ae6b5443977557a825d2085f69d1f8ae10a96c9",
    "20261019_game_membership_verify.sql":
      "97850bea3c7bccc86d69dbd58548522ce8b7b1a9b584123ea6d33f9f15197712",
    "20261019120817_game_membership_backfill_dev_applied.sql":
      "ea5dc21d5c222fa5aff88922fb8b7825d4fe8be3351844bdeeaab28b12c4ec11",
    "20261019_game_workspace_preferences.sql":
      "21ab7de65bffe61800905a747f39001fea40c09657a482138d6d0b37cd37af1c",
    "20261019_game_workspace_verify.sql":
      "a14b653a1935d2d9fefbe2222d48b2c2fb3ff15ad23d18ea9a258e0c78606856",
  };
  for (const [file, hash] of Object.entries(expected))
    assert.equal(
      createHash("sha256")
        .update(readFileSync("docs/sql/" + file))
        .digest("hex"),
      hash,
      file,
    );
});
