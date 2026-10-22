import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

async function markup(
  memberships: { gameId: string; gameName: string; gameIcon: string | null }[],
) {
  const { AcceptedGameMemberships } =
    await import("../src/features/member/components/AcceptedGameMemberships");
  return renderToStaticMarkup(createElement(AcceptedGameMemberships, { memberships }));
}
test("accepted membership rows show only game names and optional icons", async () => {
  const html = await markup([
    { gameId: "aion", gameName: "Aion 2", gameIcon: "/aion.png" },
    { gameId: "palworld", gameName: "Palworld", gameIcon: null },
  ]);
  assert.match(html, /Aion 2/);
  assert.match(html, /Palworld/);
  assert.equal((html.match(/Accepted member/g) ?? []).length, 2);
  assert.equal((html.match(/<li\b/g) ?? []).length, 2);
  assert.match(html, /aria-label="Accepted Black Rose game memberships"/);
  assert.match(html, /src="\/aion.png"/);
  assert.match(html, /alt=""/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /referrerPolicy="no-referrer"/);
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.match(html, /lucide-gamepad-2[^>]*aria-hidden="true"/);
  assert.doesNotMatch(html, /Class|Server|Faction|application|reason|IGN/);
});
test("profiles without accepted game memberships do not imply participation", async () => {
  assert.equal(await markup([]), "");
});
test("game labels are escaped, not interpreted as public-profile HTML", async () => {
  const html = await markup([{ gameId: "safe", gameName: "<script>bad</script>", gameIcon: null }]);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
