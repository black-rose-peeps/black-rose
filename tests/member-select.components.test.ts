import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberSelect } from "../src/features/member/components/MemberSelect";

test("member dropdowns label their value, disabled saved choices and searchable long lists consistently", () => {
  const short = renderToStaticMarkup(
    createElement(MemberSelect, {
      id: "role",
      label: "Game role",
      value: "old",
      onValueChange() {},
      options: [
        { value: "old", label: "Previous role (retired; saved)", disabled: true },
        { value: "new", label: "Builder" },
      ],
    }),
  );
  assert.match(short, /role="combobox"/);
  assert.match(short, /aria-label="Game role"/);
  assert.match(short, /Previous role \(retired; saved\)/);
  const long = renderToStaticMarkup(
    createElement(MemberSelect, {
      id: "server",
      label: "Server",
      value: "5",
      onValueChange() {},
      disabled: true,
      options: Array.from({ length: 20 }, (_, i) => ({ value: String(i), label: `Server ${i}` })),
    }),
  );
  assert.match(long, /role="combobox"/);
  assert.match(long, /aria-label="Server"/);
  assert.match(long, /Server 5/);
  assert.match(long, /disabled/);
});
