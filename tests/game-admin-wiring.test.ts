import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const source = (name: string) =>
  readFileSync(new URL(`../src/features/admin/features/games/${name}`, import.meta.url), "utf8");
test("both game forms keep configuration in their existing catalog mutation payload and validate before saving", () => {
  for (const name of ["CreateGameModal", "EditGameModal"]) {
    const text = source(`components/${name}.tsx`);
    assert.match(text, /profile_field_config: formData.profile_field_config/);
    assert.match(text, /<GameProfileFieldEditor/);
    assert.match(text, /validateGameProfileFields\(formData.profile_field_config\)/);
    assert.match(text, /role|Roles/);
    assert.match(text, /identity_helper_text: formData.identity_helper_text/);
  }
  assert.match(
    source("components/EditGameModal.tsx"),
    /profile_field_config: game.profile_field_config \?\? \{\}/,
  );
  assert.match(source("types/index.ts"), /profile_field_config: GameProfileFieldConfig/);
});
test("Games UI labels retired roles without offering to remove them again", () => {
  const text = source("components/EditGameModal.tsx");
  assert.match(text, /Retired/);
  assert.match(text, /role.is_active === false/);
});
test("member management retains identity directory alongside a separate explicit roster mode", () => {
  const text = readFileSync(
    new URL(
      "../src/features/admin/features/members/components/MembersManagement.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(text, /Game Membership/);
  assert.match(text, /<GameRosterPanel/);
  assert.match(text, /<MemberDirectoryFilters/);
  assert.match(text, /<EditMemberModal/);
});
