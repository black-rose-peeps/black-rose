# Black Rose Arena Playwright E2E

This workspace is intentionally separate from the application dependencies. It gives the project a focused end-to-end automation framework without changing the root `package-lock.json`.

## What is included

- TypeScript Playwright tests
- Page Object Model classes in `pages/`
- Typed custom fixtures in `fixtures/`
- Chromium, Firefox, WebKit, and Pixel 7 projects
- Local Vite/TanStack Start server management
- Support for testing a deployed URL
- HTML reports, traces, screenshots, and retained failure videos
- GitHub Actions execution

## First-time setup

From the repository root:

```bash
npm ci
npm run test:e2e:install
npm run test:e2e:install-browsers
```

On Linux CI, install browser operating-system dependencies with:

```bash
cd e2e
npx playwright install --with-deps chromium firefox webkit
```

## Run the tests

```bash
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:debug
npm run test:e2e:report
```

Run one browser project:

```bash
cd e2e
npx playwright test --project=desktop-firefox
```

Run one file or test title:

```bash
cd e2e
npx playwright test tests/login.spec.ts
npx playwright test -g "legacy registration"
```

## Test a deployed environment

When `PLAYWRIGHT_BASE_URL` is present, Playwright does not start the local app server.

PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://your-deployment.example"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Bash:

```bash
PLAYWRIGHT_BASE_URL=https://your-deployment.example npm run test:e2e
```

## Framework structure

```text
e2e/
├── fixtures/              # Typed dependency injection for page objects
├── pages/                 # Locators and reusable page actions
├── tests/                 # Business-readable test scenarios
├── package.json           # Isolated Playwright dependency
└── playwright.config.ts   # Browsers, retries, reports, and web server
```

The tests prefer accessible locators such as `getByRole()` and `getByLabel()` instead of CSS classes. CSS classes frequently change during UI styling work, while roles and labels reflect how users and assistive technology interact with the application.

## Recommended practice sequence

### 1. Locators and assertions

Add tests for the Champions and Community navigation links. Practice `getByRole`, `getByLabel`, `toHaveURL`, `toHaveTitle`, and `toBeVisible`.

### 2. Forms and negative testing

Extend the admin-console tests to cover username-only and password-only submissions. Confirm the validation message and that no navigation occurs.

### 3. Network mocking

Intercept the tournament-list request with `page.route()` and return controlled test data. Verify the cards, status groups, filters, and empty state without relying on the shared database.

### 4. Authentication state

Create a setup project that authenticates a dedicated test account and saves `storageState`. Never commit passwords or generated authentication-state files. Read credentials from environment variables or GitHub Actions secrets.

### 5. Test-data management

Create data through an API or database test helper before the UI scenario, then delete it during teardown. Generate unique names instead of reusing shared tournament or team records.

### 6. Parallel and cross-browser execution

Run the same scenario in all configured projects. Learn when tests may run in parallel and when a serial workflow is justified because scenarios intentionally share state.

### 7. CI debugging

Open the uploaded HTML report and trace after a failure. The trace contains the action timeline, DOM snapshots, console output, requests, and screenshots.

## How to explain this framework in an interview

**Framework design:** The configuration controls browser projects, retries, parallel workers, diagnostics, and local/deployed environments. Page objects contain reusable UI interactions. Typed fixtures inject those objects into readable test specifications.

**Cross-browser testing:** Playwright projects execute the same suite against Chromium, Firefox, WebKit, and a mobile Chromium device. A single project can be selected from the command line for faster debugging.

**Test data:** Public smoke tests do not mutate shared data. Data-dependent scenarios should create controlled records through APIs or fixtures and clean them afterward.

**Sensitive data:** Secrets belong in local ignored environment files and CI secret storage. Tests read them from `process.env`; credentials and authentication-state files must not be committed.

**Pipeline:** CI installs application and test dependencies, installs browser binaries and Linux dependencies, runs the suite, and uploads the HTML report even when tests fail.

**Parallel execution:** Tests are independent by default, so Playwright can distribute them across workers and browser projects. Shared mutable test data is avoided because it causes flaky parallel runs.

## Current starter scenarios

- Landing-page content and calls to action
- Desktop and mobile tournament navigation
- Member Discord authentication entry point
- Legacy `/register` redirect
- Admin-console required-field validation
- Return from admin console to member access
