import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const memberId = "11111111-1111-4111-8111-111111111111";
const f = {
  profile: {} as Record<string, unknown> | null,
  memberships: [] as Record<string, unknown>[],
  reads: [] as { table: string; columns: string; filters: [string, unknown][] }[],
  membershipError: false,
};
Object.assign(globalThis, { __publicGameMemberships: f });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "@/features/admin/features/members/utils")
      source = "export const rowToAdminMember=row=>row;";
    if (specifier === "@/lib/supabase-admin")
      source = `const f=globalThis.__publicGameMemberships;
    export function getSupabaseAdmin(){return {from(table){
      const read={table,columns:'',filters:[]};f.reads.push(read);let range;
      function result(){let rows=table==='members'?[{id:'${memberId}',username:'fixture',discordUsername:'fixture',status:'Verified'}]:table==='member_profiles'?(f.profile?[f.profile]:[]):table==='game_memberships'?f.memberships:[];
        rows=rows.filter(row=>read.filters.every(([key,value])=>row[key]===value));
        if(range)rows=rows.slice(range[0],range[0]+Math.min(2,range[1]-range[0]+1));
        return {data:rows,error:table==='game_memberships'&&f.membershipError?{message:'Membership read failed'}:null};}
      const q={select(columns){read.columns=columns;return q},eq(key,value){read.filters.push([key,value]);return q},order(){return q},range(a,b){range=[a,b];return q},maybeSingle:async()=>{const r=result();return {...r,data:r.data[0]??null}},then(resolve,reject){return Promise.resolve(result()).then(resolve,reject)}};return q;
    }}};`;
    return source
      ? { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true }
      : nextResolve(specifier, context);
  },
});
const { fetchMemberProfileBySlug, invalidateMemberProfileCache } =
  await import("../src/features/member/server/profile.server");
hooks.deregister();
function reset() {
  invalidateMemberProfileCache(memberId);
  f.reads = [];
  f.membershipError = false;
  f.profile = {
    id: "profile",
    member_id: memberId,
    slug: "fixture",
    display_name: "Fixture",
    headline: "Player",
    bio: "",
    main_game: "Valorant",
    main_role: "",
    region: "SEA",
    avatar_url: null,
    is_public: true,
    game_identities: {},
  };
  f.memberships = [
    {
      member_id: memberId,
      game_id: "aion",
      status: "accepted",
      reason: "PRIVATE REASON",
      games: {
        id: "aion",
        name: "Aion 2",
        display_name: "Aion 2",
        icon: "/aion.png",
        is_active: true,
      },
    },
    {
      member_id: memberId,
      game_id: "league",
      status: "applying",
      games: { id: "league", display_name: "League of Legends" },
    },
    {
      member_id: memberId,
      game_id: "inactive",
      status: "inactive",
      games: { id: "inactive", display_name: "Inactive game" },
    },
    {
      member_id: memberId,
      game_id: "palworld",
      status: "accepted",
      games: [
        { id: "palworld", name: "Palworld", display_name: "Palworld", icon: null, is_active: true },
      ],
    },
    {
      member_id: memberId,
      game_id: "other",
      status: "left",
      games: { id: "other", display_name: "Left game" },
    },
    { member_id: memberId, game_id: "missing", status: "accepted", games: null },
    {
      member_id: "another-member",
      game_id: "secret",
      status: "accepted",
      games: { id: "secret", display_name: "Other member" },
    },
  ];
}
test("public profiles expose only their owner's accepted game names and icons", async () => {
  reset();
  const profile = await fetchMemberProfileBySlug("fixture");
  assert.deepEqual(profile?.acceptedGameMemberships, [
    { gameId: "aion", gameName: "Aion 2", gameIcon: "/aion.png" },
    { gameId: "palworld", gameName: "Palworld", gameIcon: null },
  ]);
  const reads = f.reads.filter((read) => read.table === "game_memberships");
  assert.ok(reads.length >= 2, "traverse a smaller API row cap");
  assert.ok(
    reads.every(
      (read) => read.columns === "game_id, games(id, name, display_name, icon, is_active)",
    ),
  );
  assert.ok(
    !f.reads.some((read) =>
      ["member_game_profiles", "game_membership_events"].includes(read.table),
    ),
  );
  assert.ok(!JSON.stringify(profile?.acceptedGameMemberships).includes("PRIVATE REASON"));
});
test("a private profile is rejected before any membership projection is read", async () => {
  reset();
  f.profile!.is_public = false;
  assert.equal(await fetchMemberProfileBySlug("fixture"), null);
  assert.ok(!f.reads.some((read) => read.table === "game_memberships"));
});
test("the trusted owner can preview accepted memberships on their private profile", async () => {
  reset();
  f.profile!.is_public = false;
  const profile = await fetchMemberProfileBySlug("fixture", memberId);
  assert.equal(profile?.acceptedGameMemberships?.length, 2);
});
test("a missing profile never triggers a membership lookup", async () => {
  reset();
  f.profile = null;
  assert.equal(await fetchMemberProfileBySlug("fixture"), null);
  assert.ok(!f.reads.some((read) => read.table === "game_memberships"));
});
test("removed acceptance is not retained in the cached common-profile bundle", async () => {
  reset();
  assert.equal((await fetchMemberProfileBySlug("fixture"))?.acceptedGameMemberships?.length, 2);
  f.memberships = [];
  assert.deepEqual((await fetchMemberProfileBySlug("fixture"))?.acceptedGameMemberships, []);
});
test("membership read errors are not represented as confirmed public membership data", async () => {
  reset();
  f.membershipError = true;
  await assert.rejects(fetchMemberProfileBySlug("fixture"), /Membership read failed/);
});

test("inactive accepted games disappear and reappear on reactivation without changing membership", async () => {
  reset();
  const membership = f.memberships.find((entry) => entry.game_id === "aion")!;
  const game = membership.games as Record<string, unknown>;
  const originalStatus = membership.status;
  game.is_active = false;
  assert.deepEqual((await fetchMemberProfileBySlug("fixture"))?.acceptedGameMemberships, [
    { gameId: "palworld", gameName: "Palworld", gameIcon: null },
  ]);
  assert.equal(membership.status, originalStatus);
  game.is_active = true;
  assert.equal((await fetchMemberProfileBySlug("fixture"))?.acceptedGameMemberships?.length, 2);
  assert.equal(membership.status, originalStatus);
});
