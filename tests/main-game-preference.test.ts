import assert from "node:assert/strict";
import test from "node:test";
import { createMainGamePreference } from "../src/features/game-membership/components/main-game-preference";

test("Main Game saves only a preference and retains failed drafts for retry", async () => {
  const writes: (string | null)[] = [];
  let fail = true;
  const preference = createMainGamePreference("g1", async (gameId) => {
    writes.push(gameId);
    if (fail) throw new Error("Offline");
  });
  preference.edit("g2");
  preference.reconcile("g1");
  assert.equal(preference.getSnapshot().value, "g2");
  await preference.save();
  assert.equal(preference.getSnapshot().error, "Offline");
  assert.equal(preference.getSnapshot().dirty, true);
  fail = false;
  await preference.save();
  assert.deepEqual(writes, ["g2", "g2"]);
  assert.equal(preference.getSnapshot().dirty, false);
  preference.edit(null);
  await preference.save();
  assert.equal(writes[2], null);
});

test("pending preference prevents duplicate writes and dirty refreshes; discard restores saved preference", async () => {
  let finish!: () => void;
  let writes = 0;
  const preference = createMainGamePreference("g1", async () => {
    writes++;
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
  });
  preference.edit("g2");
  const pending = preference.save();
  await preference.save();
  preference.edit("g3");
  preference.reconcile("g4");
  assert.equal(writes, 1);
  assert.equal(preference.getSnapshot().value, "g2");
  assert.equal(preference.getSnapshot().busy, true);
  finish();
  await pending;
  preference.reconcile("g4");
  assert.equal(preference.getSnapshot().value, "g4");
  preference.edit("g3");
  preference.discard();
  assert.equal(preference.getSnapshot().value, "g4");
  assert.equal(preference.getSnapshot().dirty, false);
});
