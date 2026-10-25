import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const url = new URL("../docs/sql/20261019_game_workspace_preferences.sql", import.meta.url);
function sql() {
  return readFileSync(url, "utf8")
    .replace(/--[^\n]*/g, "")
    .toLowerCase();
}
function body(name: string) {
  const match = sql().match(
    new RegExp(
      `create or replace function public\\.${name}\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`,
    ),
  );
  assert.ok(match, `Missing ${name} function`);
  return match[1];
}
function updatedColumns(source: string) {
  const updates = [
    ...source.matchAll(/update public\.(\w+) set\s+([\s\S]*?)\s+where member_id=p_member_id/g),
  ];
  assert.equal(updates.length, 1, "one explicitly scoped common-profile write");
  assert.equal(updates[0][1], "member_profiles");
  return [...updates[0][2].matchAll(/(?:^|,)\s*(\w+)\s*=/g)].map((m) => m[1]).sort();
}

test("forward SQL adds exactly two service-only writers and preserves the backward-compatible RPC", () => {
  const source = sql();
  assert.deepEqual(
    [...source.matchAll(/create or replace function public\.(\w+)/g)].map((m) => m[1]).sort(),
    ["set_member_main_game", "update_member_profile_details"],
  );
  assert.doesNotMatch(
    source,
    /drop function|update_member_profile_preferences|security definer|\b(insert into|delete from|alter table)\b/,
  );
  for (const signature of [
    "set_member_main_game(uuid,uuid)",
    "update_member_profile_details(uuid,text,text,text,text,boolean)",
  ]) {
    const escaped = signature.replace(/[()]/g, "\\$&");
    assert.match(
      source,
      new RegExp(`revoke all on function public\\.${escaped} from public,anon,authenticated`),
    );
    assert.match(
      source,
      new RegExp(`grant execute on function public\\.${escaped} to service_role`),
    );
  }
  assert.match(source, /begin;/);
  assert.match(source, /commit;/);
  assert.equal(
    (source.match(/security invoker set search_path = pg_catalog,public/g) ?? []).length,
    2,
  );
});
test("both independent writers serialize on the same members row before reading or updating profiles", () => {
  for (const name of ["set_member_main_game", "update_member_profile_details"]) {
    const source = body(name);
    const lock = source.indexOf("perform 1 from public.members where id=p_member_id for update;");
    assert.ok(lock >= 0);
    assert.ok(lock < source.indexOf("from public.member_profiles"));
    assert.match(source, /member not found/);
    assert.match(source, /legacy member profile required/);
  }
});
test("Main Game has a nullable UUID contract and only writes legacy preference projections", () => {
  assert.match(sql(), /set_member_main_game\(\s*p_member_id uuid,p_game_id uuid\s*\) returns void/);
  const source = body("set_member_main_game");
  assert.deepEqual(updatedColumns(source), [
    "ingame_display_name",
    "main_game",
    "main_role",
    "updated_at",
  ]);
  assert.match(source, /if p_game_id is not null then/);
  assert.match(source, /from public.games where id=p_game_id for share/);
  assert.match(source, /not found or not g.is_active/);
  assert.match(source, /game_membership_aliases\(g.name,g.display_name,g.slug\)/);
  assert.match(source, /ambiguous catalog aliases/);
  assert.match(source, /game_membership_key\(a\)=public.game_membership_key\(b\)/);
  assert.match(
    source,
    /from public.member_game_profiles\s+where member_id=p_member_id and game_id=p_game_id/,
  );
  assert.match(source, /target_main text:=null/);
  assert.match(source, /target_role text:=''/);
  assert.match(source, /target_ign text:=null/);
  assert.match(source, /target_main:=g.name/);
  assert.match(source, /target_role:=coalesce\(saved.role_label,''\)/);
  assert.match(
    source,
    /when public.game_membership_is_riot\(g.identity_group,g.name,g.slug\) then null else saved.ign end/,
  );
});
test("common details writer cannot receive or overwrite Main Game, identities or roles", () => {
  assert.match(
    sql(),
    /update_member_profile_details\(\s*p_member_id uuid,p_display_name text,p_headline text,p_bio text,p_region text,p_is_public boolean\s*\) returns public.member_profiles/,
  );
  const source = body("update_member_profile_details");
  assert.deepEqual(updatedColumns(source), [
    "bio",
    "display_name",
    "headline",
    "is_public",
    "region",
    "updated_at",
  ]);
  assert.doesNotMatch(
    source,
    /main_game|main_role|ingame_display_name|game_identities|valorant_|game_memberships|member_game_profiles/,
  );
  assert.match(source, /returning \* into result/);
  assert.match(source, /return result/);
});
