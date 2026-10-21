import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = ts.createSourceFile(
  "dashboard.profile.tsx",
  readFileSync(new URL("../src/routes/dashboard.profile.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function sectionNavigation(tag: string, id?: string) {
  let handler: ts.JsxAttribute | undefined;
  function visit(node: ts.Node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(source) === tag &&
      (!id ||
        node.attributes.properties.some(
          (property) =>
            ts.isJsxAttribute(property) &&
            property.name.getText(source) === "id" &&
            property.initializer?.getText(source) === JSON.stringify(id),
        ))
    ) {
      handler = node.attributes.properties.find(
        (property): property is ts.JsxAttribute =>
          ts.isJsxAttribute(property) && property.name.getText(source) === "onValueChange",
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(handler?.initializer && ts.isJsxExpression(handler.initializer));
  const expression = handler.initializer.expression!;
  const javascript = ts.transpile(expression.getText(source), { target: ts.ScriptTarget.ES2022 });
  const navigations: Record<string, unknown>[] = [];
  const callback = new Function(
    "navigate",
    "focusGame",
    `return (${javascript.trim().replace(/;$/, "")})`,
  )((options: Record<string, unknown>) => navigations.push(options), "Palworld");
  return { callback, navigations };
}

for (const [label, tag, id] of [
  ["desktop tabs", "Tabs", undefined],
  ["mobile section picker", "MemberSelect", "profile-section"],
] as const) {
  test(`Edit Profile ${label} preserve scroll for each query-only section change`, () => {
    const { callback, navigations } = sectionNavigation(tag, id);
    for (const section of ["identity", "socials", "privacy"]) {
      callback(section);
      const navigation = navigations.at(-1)!;
      assert.equal(navigation.to, "/dashboard/profile");
      assert.equal((navigation.search as { tab: string }).tab, section);
      assert.equal(
        navigation.resetScroll,
        false,
        `${label}: ${section} must not reset page scroll`,
      );
      assert.notEqual(navigation.replace, true, "keep section history navigable");
    }
  });
}
