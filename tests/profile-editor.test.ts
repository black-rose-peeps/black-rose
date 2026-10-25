import assert from "node:assert/strict";
import test from "node:test";
import {
  profileEditorHasChanges,
  shouldGuardProfileExit,
} from "../src/features/member/utils/profile-editor";
import type { ProfileFormState } from "../src/features/member/utils/profile-form-state";

const draft: ProfileFormState = {
  displayName: "Rose",
  headline: "Member",
  bio: "Hello",
  mainGame: "Palworld",
  mainRole: "Builder",
  region: "SEA",
  valorantGameName: "Rose",
  valorantTagline: "SEA",
  gameIdentities: { Palworld: "Rose", "Custom title": "Keep me" },
  isPublic: false,
  socials: {
    discord: { url: "https://discord.com/users/fixture", isPublic: false },
  } as ProfileFormState["socials"],
};

test("unchanged and reverted drafts do not need saving, regardless of identity key order", () => {
  assert.equal(profileEditorHasChanges(draft, structuredClone(draft)), false);
  assert.equal(
    profileEditorHasChanges(draft, {
      ...draft,
      gameIdentities: { "Custom title": "Keep me", Palworld: "Rose" },
    }),
    false,
  );
  assert.equal(profileEditorHasChanges(draft, { ...draft, displayName: "Changed" }), true);
  assert.equal(profileEditorHasChanges(draft, { ...draft, displayName: "Rose" }), false);
});

test("privacy, per-social flags and off-catalog identities are part of the draft", () => {
  assert.equal(profileEditorHasChanges(draft, { ...draft, isPublic: true }), true);
  assert.equal(
    profileEditorHasChanges(draft, {
      ...draft,
      socials: { ...draft.socials, discord: { ...draft.socials.discord, isPublic: true } },
    }),
    true,
  );
  assert.equal(
    profileEditorHasChanges(draft, { ...draft, gameIdentities: { Palworld: "Rose" } }),
    true,
  );
  assert.deepEqual(draft.gameIdentities, { Palworld: "Rose", "Custom title": "Keep me" });
});

test("dirty drafts guard exits but not section and legacy deep-link navigation", () => {
  assert.equal(shouldGuardProfileExit(true, "/dashboard/profile"), false);
  assert.equal(shouldGuardProfileExit(true, "/dashboard/profile/"), false);
  assert.equal(shouldGuardProfileExit(true, "/dashboard"), true);
  assert.equal(shouldGuardProfileExit(false, "/members/rose"), false);
});
