import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import * as store from "../src/features/notifications/store";
import type { AppNotification } from "../src/features/notifications/types";

const require = createRequire(import.meta.url);
const storage = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};
Object.assign(globalThis, {
  window: new EventTarget(),
  localStorage,
  sessionStorage: localStorage,
});

interface Element {
  type: string | ((props: Element["props"]) => unknown);
  props: {
    children?: unknown;
    onClick?: () => void;
    to?: string;
    href?: string;
    search?: { view: string; focusGame?: string };
    className?: string;
    description?: string;
    "aria-expanded"?: boolean;
    "aria-label"?: string;
  };
}

function nodes(tree: unknown): Element[] {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  const node = tree as Element;
  if (typeof node.type === "function") return nodes(node.type(node.props));
  return [node, ...nodes(node.props?.children)];
}

function harness(notifications: AppNotification[]) {
  storage.clear();
  store.setNotificationMemberId("bell-member");
  storage.set("br_notifications:bell-member", JSON.stringify(notifications));
  const states: unknown[] = [true, store.getNotifications(), store.getUnreadCount(), 0];
  let cursor = 0;
  const source = readFileSync(
    new URL("../src/features/notifications/components/NotificationBell.tsx", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {} as { NotificationBell: () => unknown };
  const mockRequire = (id: string): unknown => {
    if (id === "react")
      return {
        useState(value: unknown) {
          const index = cursor++;
          if (!(index in states)) states[index] = value;
          return [
            states[index],
            (next: unknown) => {
              states[index] = typeof next === "function" ? next(states[index]) : next;
            },
          ];
        },
        useEffect() {},
        useRef: () => ({ current: null }),
      };
    if (id === "react/jsx-runtime") return require(id);
    if (id === "../store") return store;
    if (id === "../utils/relative-time") return { relativeTime: () => "Just now" };
    if (id === "@/hooks/use-mobile") return { useIsMobile: () => false };
    if (id === "@tanstack/react-router") return { Link: "RouterLink" };
    return new Proxy({}, { get: (_, name) => String(name) });
  };
  new Function("require", "exports", compiled)(mockRequire, exports);
  return () => {
    cursor = 0;
    return nodes(exports.NotificationBell());
  };
}

function acceptance(
  href = "/dashboard?view=games&focusGame=123e4567-e89b-12d3-a456-426614174000",
): AppNotification {
  return {
    id: "game-membership-accepted-audit-1",
    type: "game_membership_accepted",
    title: "Game membership accepted",
    body: "You’ve been accepted into Black Rose for Valorant.",
    createdAt: "2026-10-20T01:00:00Z",
    read: false,
    href,
  };
}

test("acceptance uses the green shield and typed dashboard Link; clicking marks read and closes the Bell", () => {
  const render = harness([acceptance()]);
  const rendered = render();
  const link = rendered.find((node) => node.type === "RouterLink");
  assert.ok(link, "acceptance must use the router Link, not a document anchor");
  assert.equal(link.props.to, "/dashboard");
  assert.deepEqual(link.props.search, {
    view: "games",
    focusGame: "123e4567-e89b-12d3-a456-426614174000",
  });
  const icon = rendered.find(
    (node) => node.type === "span" && node.props.className?.includes("text-emerald-400"),
  );
  assert.ok(icon);
  assert.ok(nodes(icon).some((node) => node.type === "ShieldCheck"));
  link.props.onClick!();
  assert.equal(store.getUnreadCount(), 0);
  assert.equal(store.getNotifications()[0].read, true);
  assert.equal(
    render().find((node) => node.props["aria-label"] === "Notifications")?.props["aria-expanded"],
    false,
  );
});

test("game focus parsing handles encoded and malformed percent sequences without double decoding or throwing", () => {
  for (const [query, expected] of [
    ["focusGame=game%252Fid&view=games", "game%2Fid"],
    ["view=games&focusGame=%", "%"],
    ["view=games&focusGame=%E0%A4%A", "\uFFFD%A"],
    ["view=games", undefined],
  ] as const) {
    const rendered = harness([acceptance(`/dashboard?${query}`)])();
    const link = rendered.find((node) => node.type === "RouterLink");
    assert.ok(link);
    assert.deepEqual(link.props.search, { view: "games", focusGame: expected });
  }
});

test("existing team, member and tournament links retain their router targets and read callbacks", () => {
  for (const [href, type, target] of [
    ["/dashboard?view=teams", "team_removed", "/dashboard"],
    ["/teams/team-id", "team_invite", "/teams/$id"],
    ["/br/member-slug", "profile_comment", "/br/$slug"],
    ["/tournaments/cup-id", "tournament_live", "/tournaments/$id"],
  ] as const) {
    const notification = { ...acceptance(href), type };
    const render = harness([notification]);
    const link = render().find((node) => node.type === "RouterLink");
    assert.ok(link);
    assert.equal(link.props.to, target);
    link.props.onClick!();
    assert.equal(store.isNotificationRead(notification.id), true);
    assert.equal(
      render().find((node) => node.props["aria-label"] === "Notifications")?.props["aria-expanded"],
      false,
    );
  }
});

test("empty Bell includes game approvals and mark-all-read persists acceptance IDs", () => {
  const empty = harness([])();
  assert.match(
    empty.find((node) => node.type === "ArenaEmptyState")!.props.description!,
    /Game approvals/,
  );
  const render = harness([acceptance()]);
  const markAll = render().find(
    (node) => nodes(node).some((child) => child.type === "CheckCheck") && node.type === "button",
  );
  assert.ok(markAll);
  markAll.props.onClick!();
  assert.equal(store.getUnreadCount(), 0);
  assert.deepEqual(JSON.parse(storage.get("br_notification_reads:bell-member")!), [
    "game-membership-accepted-audit-1",
  ]);
});
