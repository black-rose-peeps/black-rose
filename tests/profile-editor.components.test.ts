import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileEditorActions } from "../src/features/member/components/ProfileEditorActions";

function actions(overrides = {}) {
  return renderToStaticMarkup(
    createElement(ProfileEditorActions, {
      dirty: false,
      saving: false,
      saved: false,
      initialized: true,
      error: null,
      onDiscard() {},
      ...overrides,
    }),
  );
}

test("save and discard are disabled when unchanged and enabled for a dirty draft", () => {
  assert.equal((actions().match(/disabled=""/g) ?? []).length, 2);
  assert.ok(actions().includes("No unsaved changes"));
  const changed = actions({ dirty: true });
  assert.ok(changed.includes("Unsaved changes"));
  assert.ok(!changed.includes('disabled=""'));
  assert.ok(changed.includes('type="button"'));
  assert.ok(changed.includes('type="submit"'));
});

test("save status and errors are accessible regardless of the active section", () => {
  assert.ok(actions({ saved: true }).includes("Changes saved"));
  const saving = actions({ dirty: true, saving: true });
  assert.equal((saving.match(/disabled=""/g) ?? []).length, 2);
  assert.ok(saving.includes("Saving changes…"));
  const error = actions({ dirty: true, error: "Connection lost. Try again." });
  assert.ok(error.includes('role="status"'));
  assert.ok(error.includes('aria-live="polite"'));
  assert.ok(error.includes('role="alert"'));
  assert.ok(error.includes("Connection lost. Try again."));
});
