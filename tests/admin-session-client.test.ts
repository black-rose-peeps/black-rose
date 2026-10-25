import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ensureAdminConsoleSession,
  SESSION_KEY,
} from "../src/features/admin/auth/admin-session.ts";

test("a falsified localStorage admin hint cannot authenticate without a signed server request", async () => {
  const values = new Map([[SESSION_KEY, "staff"]]);
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    },
  });
  try {
    // There is deliberately no HTTP request/cookie context in this client-only test.
    assert.equal(await ensureAdminConsoleSession(), false);
    assert.equal(values.has(SESSION_KEY), false);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldStorage) Object.defineProperty(globalThis, "localStorage", oldStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
