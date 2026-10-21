import assert from "node:assert/strict";
import test from "node:test";
import {
  isWoWForever,
  getWoWForeverCountdown,
  WOW_FOREVER_LAUNCH_AT,
  WOW_FOREVER_LAUNCH_MS,
  WOW_FOREVER_ANNOUNCEMENT_URL,
} from "../src/features/game-servers/utils/wow-forever-launch";

test("launch deadline matches Blizzard's absolute countdown and Philippine launch time", () => {
  assert.equal(WOW_FOREVER_LAUNCH_AT, "2026-11-04T23:00:00.000Z");
  assert.equal(WOW_FOREVER_LAUNCH_MS, Date.parse("2026-11-05T07:00:00+08:00"));
  assert.equal(
    WOW_FOREVER_ANNOUNCEMENT_URL,
    "https://www.facebook.com/story.php?story_fbid=122143611513152669&id=61584580077731#",
  );
});

test("both approved slugs and canonical game names identify Forever without matching other Warcraft games", () => {
  for (const slug of ["world-of-warcraft-forever", "wow-forever"]) {
    assert.equal(isWoWForever({ name: "World of Warcraft Forever", slug }), true);
    assert.equal(isWoWForever({ name: "Renamed title", slug }), true);
  }
  assert.equal(isWoWForever({ name: "World of Warcraft: Forever", slug: "custom" }), true);
  assert.equal(isWoWForever({ name: "WoW Forever", slug: "custom" }), true);
  for (const name of [
    "World of Warcraft",
    "World of Warcraft Classic",
    "Forever Quest",
    "Warcraft III",
  ]) {
    assert.equal(isWoWForever({ name, slug: "other" }), false);
  }
});

test("countdown uses absolute time, including rollover and the last millisecond", () => {
  assert.deepEqual(
    getWoWForeverCountdown(WOW_FOREVER_LAUNCH_MS - (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000),
    { days: 2, hours: 3, minutes: 4, seconds: 5 },
  );
  assert.deepEqual(getWoWForeverCountdown(WOW_FOREVER_LAUNCH_MS - 1000), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 1,
  });
  assert.deepEqual(getWoWForeverCountdown(WOW_FOREVER_LAUNCH_MS - 1), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 1,
  });
});

test("at/after expiry and invalid clocks have no launch promotion", () => {
  for (const now of [
    WOW_FOREVER_LAUNCH_MS,
    WOW_FOREVER_LAUNCH_MS + 1,
    WOW_FOREVER_LAUNCH_MS + 86400000,
    NaN,
    Infinity,
  ]) {
    assert.equal(getWoWForeverCountdown(now), null);
  }
});
