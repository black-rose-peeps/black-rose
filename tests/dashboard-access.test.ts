import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { isRedirect } from "@tanstack/react-router";

// Stub view rendering and browser storage, not the actual route guard.
const fixture: { session: { role: string } | null } = { session: null };
Object.assign(globalThis, { __dashboardAccessFixture: fixture });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/features/auth/store/session") {
      return {
        url: "data:text/javascript,export function getSession(){return globalThis.__dashboardAccessFixture.session;}",
        shortCircuit: true,
      };
    }
    const component = {
      "@/features/member/components/MemberShell": "MemberPageLayout",
      "@/features/member/components/DashboardOverview": "DashboardOverview",
      "@/features/teams/components/TeamDirectory": "TeamDirectory",
      "@/features/game-membership/components/MyGamesDashboard": "MyGamesDashboard",
      "@/features/shared/components/HubNavigation": "HubNavigation",
    }[specifier];
    if (component) {
      return {
        url: `data:text/javascript,export function ${component}(){return null;}`,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
const { Route } = await import("../src/routes/dashboard.index");
hooks.deregister();

function withBrowser(run: () => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  try {
    run();
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("dashboard does not reject a stale cached role before the view refreshes membership", () => {
  withBrowser(() => {
    for (const role of ["not_verified", "verified", "admin"]) {
      fixture.session = { role };
      for (const search of [
        { view: "teams", create: true },
        { view: "games", focusGame: "g1" },
      ]) {
        const expected = { ...search };
        assert.doesNotThrow(() => Route.options.beforeLoad!({ search } as never), role);
        assert.deepEqual(search, expected);
      }
    }
  });
});

test("dashboard still rejects missing browser sessions", () => {
  withBrowser(() => {
    fixture.session = null;
    assert.throws(
      () => Route.options.beforeLoad!({} as never),
      (error: unknown) => isRedirect(error) && error.options.to === "/login",
    );
  });
});
