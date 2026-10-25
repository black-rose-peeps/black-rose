import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
const memberId = "11111111-1111-4111-8111-111111111111";
const f = { rpcs: [] as { name: string; args: Record<string, unknown> }[], directUpdates: 0 };
Object.assign(globalThis, { __profileCompatibility: f });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    let source: string | undefined;
    if (specifier === "@/lib/supabase-admin")
      source = `const f=globalThis.__profileCompatibility;
    const member={id:'${memberId}',username:'fixture'};
    const profile={id:'profile',member_id:'${memberId}',slug:'fixture',main_game:'Aion 2'};
    export function getSupabaseAdmin(){return {
      from(table){const q={select(){return q},eq(){return q},update(){if(table==='member_profiles')f.directUpdates++;return q},upsert(){return q},
        maybeSingle:async()=>({data:table==='members'?member:profile,error:null}),
        then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)}};return q},
      rpc:async(name,args)=>{f.rpcs.push({name,args});return {data:profile,error:null}}
    }}`;
    if (specifier === "@/features/admin/features/members/utils")
      source = `export function rowToAdminMember(row){return row}`;
    if (specifier === "../utils/build-member-profile")
      source = `export function buildMemberProfile(member,profile,socials){return {...profile,memberId:member.id,socialLinks:socials}}`;
    if (source)
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { updateMemberProfile } = await import("../src/features/member/server/profile.server");
hooks.deregister();
test("ordinary profile edits use an atomic details-only RPC and cannot resubmit stale Main Game or game fields", async () => {
  // Deliberately invalid old IDs must not prevent saving a headline or clear newer game data.
  await updateMemberProfile({
    memberId,
    displayName: "Fixture",
    headline: "New headline",
    bio: "bio",
    mainGame: "Aion 2",
    mainRole: "old previous game's role",
    region: "SEA",
    valorantGameName: "x",
    valorantTagline: "!",
    gameIdentities: { "unlisted-game": "x" },
    isPublic: true,
    socialLinks: [],
  });
  assert.equal(f.directUpdates, 0);
  assert.equal(f.rpcs.length, 1);
  assert.equal(f.rpcs[0].name, "update_member_profile_details");
  assert.deepEqual(f.rpcs[0].args, {
    p_member_id: memberId,
    p_display_name: "Fixture",
    p_headline: "New headline",
    p_bio: "bio",
    p_region: "SEA",
    p_is_public: true,
  });
});
