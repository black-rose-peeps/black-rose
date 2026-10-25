import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GameProfileFieldEditor,
  validateGameProfileFields,
} from "../src/features/admin/features/games/components/GameProfileFieldEditor";

test("optional fields default off and render associated labels without imposing required member values", () => {
  const html = renderToStaticMarkup(
    createElement(GameProfileFieldEditor, { value: {}, onChange() {} }),
  );
  for (const key of ["class", "server", "faction"])
    assert.ok(html.includes(`id="game-field-${key}-enabled"`));
  assert.ok(html.includes("optional"));
  assert.equal(validateGameProfileFields({}), null);
});

test("enabled selects require a label and nonempty options; disabled legacy config is preserved", () => {
  assert.match(
    validateGameProfileFields({ class: { enabled: true, label: "", kind: "text", options: [] } })!,
    /label/i,
  );
  assert.match(
    validateGameProfileFields({
      server: { enabled: true, label: "Realm", kind: "select", options: [" "] },
    })!,
    /option/i,
  );
  assert.equal(
    validateGameProfileFields({
      faction: { enabled: false, label: "", kind: "select", options: [] },
    }),
    null,
  );
  assert.equal(
    validateGameProfileFields({
      class: { enabled: true, label: "Class", kind: "select", options: ["Mage"] },
    }),
    null,
  );
});
