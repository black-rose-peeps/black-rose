import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// GHSA-qx66-fv34-fjm8 / CVE-2026-102989. Check nested copies, not just direct deps.
const patched = {
  "@tanstack/react-start": "1.168.60",
  "@tanstack/start-server-core": "1.169.39",
};
const root = new URL("../", import.meta.url);
const readJson = (file: string) => JSON.parse(readFileSync(new URL(file, root), "utf8"));
const manifest = readJson("package.json");
const npmLock = readJson("package-lock.json");
const parsedBun = ts.parseConfigFileTextToJson(
  "bun.lock",
  readFileSync(new URL("bun.lock", root), "utf8"),
);
assert.equal(parsedBun.error, undefined, "bun.lock must be valid JSONC");
const bunLock = parsedBun.config;

function assertPatched(entries: [string, string][]) {
  for (const [name, minimum] of Object.entries(patched)) {
    const versions = entries.filter(([entry]) => entry === name).map(([, version]) => version);
    assert.ok(versions.length > 0, `${name} must be present`);
    for (const version of versions) {
      assert.match(version, /^\d+\.\d+\.\d+$/, `${name}: require a stable version`);
      const actual = version.split(".").map(Number);
      const required = minimum.split(".").map(Number);
      const different = actual.findIndex((value, index) => value !== required[index]);
      assert.ok(
        different === -1 || actual[different] > required[different],
        `${name}@${version} is vulnerable; requires >=${minimum}`,
      );
    }
  }
}

function npmEntries(lock: typeof npmLock): [string, string][] {
  return Object.entries(lock.packages).flatMap(([path, value]) => {
    const name = Object.keys(patched).find((entry) => path.endsWith(`node_modules/${entry}`));
    return name ? [[name, (value as { version: string }).version] as [string, string]] : [];
  });
}

function bunEntries(): [string, string][] {
  return Object.values(bunLock.packages).flatMap((value) => {
    const identifier = (value as string[])[0];
    const name = Object.keys(patched).find((entry) => identifier.startsWith(`${entry}@`));
    return name ? [[name, identifier.slice(name.length + 1)] as [string, string]] : [];
  });
}

test("security guard rejects the old dependency tree and vulnerable nested copies", () => {
  assert.throws(() => assertPatched([["@tanstack/react-start", "1.168.25"]]), /is vulnerable/);
  assert.throws(
    () =>
      assertPatched([
        ["@tanstack/react-start", "1.168.60"],
        ["@tanstack/start-server-core", "1.169.39"],
        ["@tanstack/start-server-core", "1.169.14"],
      ]),
    /is vulnerable/,
  );
});

test("npm lockfile contains no XSS-affected TanStack Start copies", () => {
  assertPatched(npmEntries(npmLock));
});

test("Bun lockfile contains the same patched Start versions as npm", () => {
  const entries = bunEntries();
  assertPatched(entries);
  assert.deepEqual(
    [...new Set(entries.map(([name, version]) => `${name}@${version}`))].sort(),
    [...new Set(npmEntries(npmLock).map(([name, version]) => `${name}@${version}`))].sort(),
  );
});

test("both lockfile manifests match package.json dependencies", () => {
  for (const section of ["dependencies", "devDependencies"] as const) {
    assert.deepEqual(npmLock.packages[""][section], manifest[section]);
    assert.deepEqual(bunLock.workspaces[""][section], manifest[section]);
  }
});
