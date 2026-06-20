import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const localBaseUrl = "http://127.0.0.1:4173";
const configuredBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const appRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "./playwright-report", open: "never" }],
  ],
  use: {
    baseURL: configuredBaseUrl ?? localBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "desktop-firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "desktop-webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: configuredBaseUrl
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 4173",
        cwd: appRoot,
        url: localBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
