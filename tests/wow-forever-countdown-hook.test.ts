import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import {
  WOW_FOREVER_LAUNCH_MS,
  type LaunchCountdown,
} from "../src/features/game-servers/utils/wow-forever-launch";
const f = {
  value: null as LaunchCountdown | null,
  effect: (() => undefined) as () => void | (() => void),
};
Object.assign(globalThis, { __wowCountdownHook: f });
const hooks = registerHooks({
  resolve(specifier, context, next) {
    return specifier === "react"
      ? {
          url:
            "data:text/javascript," +
            encodeURIComponent(
              `const f=globalThis.__wowCountdownHook;export const useState=()=>[f.value,next=>{f.value=next}];export const useEffect=effect=>{f.effect=effect};`,
            ),
          shortCircuit: true,
        }
      : next(specifier, context);
  },
});
const { useWoWForeverCountdown } =
  await import("../src/features/game-servers/hooks/useWoWForeverCountdown");
hooks.deregister();
function setup() {
  let id = 0;
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const windowListeners = new Map<string, () => void>();
  const documentListeners = new Map<string, () => void>();
  const document = {
    hidden: false,
    addEventListener: (name: string, fn: () => void) => documentListeners.set(name, fn),
    removeEventListener: (name: string) => documentListeners.delete(name),
  };
  const window = {
    setTimeout: (callback: () => void, delay: number) => {
      timers.set(++id, { callback, delay });
      return id;
    },
    clearTimeout: (id: number) => timers.delete(id),
    addEventListener: (name: string, fn: () => void) => windowListeners.set(name, fn),
    removeEventListener: (name: string) => windowListeners.delete(name),
  };
  Object.assign(globalThis, { window, document });
  f.value = null;
  return { timers, windowListeners, documentListeners, document };
}

test("only an enabled promotion starts a timer; crossing expiry stops it and cleanup removes listeners", (t) => {
  const h = setup();
  let now = WOW_FOREVER_LAUNCH_MS - 1500;
  t.mock.method(Date, "now", () => now);
  assert.equal(useWoWForeverCountdown(true), null, "SSR/first hydration stays deterministic");
  const cleanup = f.effect();
  assert.deepEqual(f.value, { days: 0, hours: 0, minutes: 0, seconds: 2 });
  assert.equal(h.timers.size, 1);
  const [id, timer] = [...h.timers][0];
  now = WOW_FOREVER_LAUNCH_MS;
  h.timers.delete(id);
  timer.callback();
  assert.equal(f.value, null);
  assert.equal(h.timers.size, 0);
  if (typeof cleanup === "function") cleanup();
  assert.equal(h.windowListeners.size, 0);
  assert.equal(h.documentListeners.size, 0);
});

test("hidden tabs stop ticking and resume from the absolute clock, including expiry while away", (t) => {
  const h = setup();
  let now = WOW_FOREVER_LAUNCH_MS - 60000;
  t.mock.method(Date, "now", () => now);
  useWoWForeverCountdown(true);
  const cleanup = f.effect();
  h.document.hidden = true;
  h.documentListeners.get("visibilitychange")!();
  assert.equal(h.timers.size, 0);
  now = WOW_FOREVER_LAUNCH_MS + 1;
  h.document.hidden = false;
  h.windowListeners.get("focus")!();
  assert.equal(f.value, null);
  assert.equal(h.timers.size, 0);
  if (typeof cleanup === "function") cleanup();
});

test("non-promoted or already-expired games do not schedule background ticks", (t) => {
  const h = setup();
  t.mock.method(Date, "now", () => WOW_FOREVER_LAUNCH_MS + 1);
  useWoWForeverCountdown(false);
  f.effect();
  assert.equal(h.timers.size, 0);
  assert.equal(h.windowListeners.size, 0);
  useWoWForeverCountdown(true);
  const cleanup = f.effect();
  assert.equal(h.timers.size, 0);
  assert.equal(f.value, null);
  if (typeof cleanup === "function") cleanup();
});
