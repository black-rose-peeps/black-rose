# TanStack Start XSS deployment fix

## Scope

Fix Vercel's CVE-2026-102989 deployment block without enabling the dangerous deployment override. Upstream advisory: TanStack/router `GHSA-qx66-fv34-fjm8`.

- Pin `@tanstack/react-start` to the first patched release, `1.168.60`.
- Use its matching `@tanstack/react-router` `1.170.41` and router plugin `1.168.42` cohort.
- Resolve every `@tanstack/start-server-core` copy to patched `1.169.39`.
- Regenerate npm's lockfile, then migrate it with Bun to reconcile the previously stale Bun lockfile.
- Accept the updated router's `unknown` error type in the shared error page and narrow tournament errors before reading `.message`.
- Add regression guards for vulnerable nested copies and both lockfile manifests.

No database migrations, environment credentials, Worker deployment or membership activation flags are changed.

## Verification

- Clean `npm ci --ignore-scripts` succeeded; application production build succeeded.
- Bun 1.3.14 accepted the frozen lockfile without lifecycle scripts.
- Regression suite: 342 passed, including four dependency-security tests.
- Root TypeScript: the same 18 baseline diagnostics; the upgrade's two additional error-boundary diagnostics were corrected.
- Changed-source ESLint with canonical LF input: no errors; one existing tournament hook-dependency warning remains. Windows checkout CRLF also produces existing Prettier line-ending errors when linting raw working files.
- npm audit no longer lists this TanStack XSS advisory. It still reports 14 findings in other packages, including 3 critical; this targeted patch is not a clean overall security audit.

## Release

Merge the security-fix branch into `develop` and deploy the new commit. Redeploying old commit `43bf200` will retain its vulnerable lockfile. Verify Vercel's install/build and preview result; local success is not deployment proof.

Do not add `DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS=1`. If an operator has separately enabled that override, remove it before the patched deployment. This task does not inspect or change Vercel secrets/settings.

The missing `typecheck` script is separate from the CVE block. Do not add a supposedly passing script that hides the baseline errors; address those diagnostics in separate work.
