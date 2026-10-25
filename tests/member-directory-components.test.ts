import assert from "node:assert/strict";
import test from "node:test";
import { Children, createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberDirectoryFilters } from "../src/features/admin/features/members/components/MemberDirectoryFilters";
import { MemberGameDetails } from "../src/features/admin/features/members/components/MemberGameDetails";
import type { AdminMember } from "../src/features/admin/features/members/types";
import type { GameWithRoles } from "../src/features/admin/features/games/services/games.service";

const game: GameWithRoles = {
  id: "valorant",
  name: "valorant",
  slug: "valorant",
  display_name: "Valorant",
  identity_group: "riot",
  identity_field_label: null,
  identity_field_placeholder: null,
  identity_helper_text: null,
  accent_class: "",
  tournament_header_image: null,
  icon: null,
  is_active: true,
  sort_order: 0,
  created_at: "",
  updated_at: "",
  roles: [],
};
const player: AdminMember = {
  id: "one",
  username: "one",
  displayName: "One",
  discordUsername: "one.discord",
  status: "Verified",
  registeredAt: "",
  createdAt: "",
  avatarUrl: null,
  profileSlug: "one",
  discordNotInGuildStrikes: 0,
  discordSyncPausedAt: null,
  mainGame: "Palworld",
  mainRole: "Builder",
  valorantGameName: "Rose",
  valorantTagline: "SEA",
};

test("shared desktop/mobile game details show honest identity label and unknown secondary role", () => {
  const html = renderToStaticMarkup(createElement(MemberGameDetails, { member: player, game }));
  assert.ok(html.includes("Shared Riot ID: Rose#SEA"));
  assert.ok(html.includes("Role: Unknown / not provided"));
  assert.ok(!html.includes("Builder"));
  assert.equal(
    renderToStaticMarkup(createElement(MemberGameDetails, { member: player, game: null })),
    "",
  );
});

test("directory controls keep secondary filters and semantic help collapsed without hiding export", () => {
  const html = renderToStaticMarkup(
    createElement(MemberDirectoryFilters, {
      games: [game],
      selectedGame: game,
      mode: "identity",
      role: "all",
      verification: "all",
      isLoadingGames: false,
      count: 31,
      exportDisabled: false,
      onGameChange() {},
      onModeChange() {},
      onRoleChange() {},
      onVerificationChange() {},
      onExport() {},
    }),
  );
  assert.ok(html.includes("Export CSV (31)"));
  assert.ok(html.includes('for="member-directory-game"'));
  assert.ok(html.includes('for="member-directory-role"'));
  assert.ok(html.includes('for="member-directory-verification"'));
  assert.ok(html.includes("Secondary-game roles are unknown"));
  assert.ok(html.includes("does not confirm participation in Valorant"));
  assert.ok(html.includes("not just this page"));
  const secondary = html.match(
    /<details[^>]*id="member-directory-more"[^>]*>([\s\S]*?)<\/details>/,
  );
  assert.ok(secondary, "secondary filters have a native keyboard-accessible disclosure");
  assert.ok(!secondary[0].includes(" open="));
  assert.ok(secondary[1].includes("More filters"));
  assert.ok(secondary[1].includes('id="member-directory-mode"'));
  assert.ok(secondary[1].includes('id="member-directory-role"'));
  assert.ok(!secondary[1].includes('id="member-directory-verification"'));
  assert.ok(!secondary[1].includes("Export CSV"));
  const help = html.match(/<details[^>]*id="member-directory-help"[^>]*>([\s\S]*?)<\/details>/);
  assert.ok(help, "semantic cautions remain available as optional help");
  assert.ok(!help[0].includes(" open="));
  assert.ok(help[1].includes("does not confirm participation in Valorant"));
});

test("main-game badge is shown only for the selected main game, including missing IGN", () => {
  const primary = { ...player, mainGame: "Valorant", valorantGameName: "", valorantTagline: "" };
  const html = renderToStaticMarkup(createElement(MemberGameDetails, { member: primary, game }));
  assert.ok(html.includes("Main game"));
  assert.ok(html.includes("Not provided"));
  const secondary = renderToStaticMarkup(
    createElement(MemberGameDetails, { member: player, game }),
  );
  assert.ok(!secondary.includes("Main game"));
});

test("hidden filters stay visible as removable chips and reset preserves callback contracts", () => {
  const calls: unknown[] = [];
  const tree = MemberDirectoryFilters({
    games: [game],
    selectedGame: game,
    mode: "main",
    role: "unknown",
    verification: "Verified",
    isLoadingGames: false,
    count: 31,
    exportDisabled: false,
    onGameChange: (value) => calls.push(["game", value]),
    onModeChange: (value) => calls.push(["mode", value]),
    onRoleChange: (value) => calls.push(["role", value]),
    onVerificationChange: (value) => calls.push(["verification", value]),
    onExport: () => calls.push(["export"]),
  });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /More filters \(2\)/);
  assert.match(html, /aria-label="Remove role filter: Unknown \/ not provided"/);
  assert.match(html, /aria-label="Remove match filter: Main game only"/);
  const controls = new Map<string, () => void>();
  function collect(node: ReactNode) {
    Children.forEach(node, (child) => {
      if (
        !isValidElement<{ children?: ReactNode; "aria-label"?: string; onClick?: () => void }>(
          child,
        )
      )
        return;
      if (child.props["aria-label"] && child.props.onClick)
        controls.set(child.props["aria-label"], child.props.onClick);
      collect(child.props.children);
    });
  }
  collect(tree);
  controls.get("Remove role filter: Unknown / not provided")?.();
  assert.deepEqual(calls, [["role", "all"]]);
  calls.length = 0;
  controls.get("Reset directory filters")?.();
  assert.deepEqual(calls, [
    ["game", "all"],
    ["mode", "identity"],
    ["role", "all"],
    ["verification", "all"],
  ]);
});

test("long game catalogs use the shared searchable picker while preserving the all-games value", () => {
  const games = Array.from({ length: 9 }, (_, index) => ({
    ...game,
    id: `game-${index}`,
    display_name: `Game ${index}`,
  }));
  const html = renderToStaticMarkup(
    createElement(MemberDirectoryFilters, {
      games,
      selectedGame: null,
      mode: "identity",
      role: "all",
      verification: "all",
      isLoadingGames: false,
      count: 0,
      exportDisabled: true,
      onGameChange() {},
      onModeChange() {},
      onRoleChange() {},
      onVerificationChange() {},
      onExport() {},
    }),
  );
  assert.match(html, /aria-label="Game"/);
  assert.match(html, />All games<\/span>/);
  assert.ok(!html.includes("Reset filters"), "default filters need no reset clutter");
  assert.match(html, /disabled="" title="Export all matching members, not just this page"/);
});
