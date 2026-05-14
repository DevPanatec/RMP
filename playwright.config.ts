import { defineConfig, devices } from "@playwright/test";

// E2E + audit config — 7 viewports + headed mode running in parallel.
//
// Viewport coverage:
//   - audit-iphone-se   (375x667, iPhone SE)  — smallest realistic phone
//   - audit-iphone-14   (393x852, iPhone 14)
//   - audit-pixel       (412x915, Pixel 7)
//   - audit-ipad-mini   (768x1024, iPad Mini portrait)
//   - audit-ipad-pro    (1024x1366, iPad Pro portrait)
//   - audit-laptop      (1280x720, MacBook 13)
//   - audit-desktop     (1920x1080, FullHD)
//   - audit-headed      (1280x720, VISIBLE Chromium, slowMo 250)
//   - audit-headless    (1280x720, fast CI baseline)
//
// Run all: npx playwright test (sin --project specifica todos)
// Run subset: npx playwright test --project=audit-iphone-se --project=audit-desktop

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 4, // run multiple projects concurrently
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  timeout: 90_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: "http://localhost:8000",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "on",
    serviceWorkers: "block",
  },

  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { headless: true } },

    {
      name: "audit-headless",
      testMatch: /audit\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], headless: true },
      dependencies: ["setup"],
    },
    {
      name: "audit-headed",
      testMatch: /audit\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], headless: false, launchOptions: { slowMo: 250 } },
      dependencies: ["setup"],
    },

    // ---------------- MOBILE (force chromium engine, only viewport+touch matters)
    {
      name: "audit-iphone-se",
      testMatch: /audit\/.*\.spec\.ts/,
      use: { ...devices["iPhone SE"], browserName: "chromium" },
      dependencies: ["setup"],
    },
    {
      name: "audit-iphone-14",
      testMatch: /audit\/.*\.spec\.ts/,
      use: { ...devices["iPhone 14"], browserName: "chromium" },
      dependencies: ["setup"],
    },
    {
      name: "audit-pixel",
      testMatch: /audit\/.*\.spec\.ts/,
      use: { ...devices["Pixel 7"], browserName: "chromium" },
      dependencies: ["setup"],
    },

    // ---------------- TABLET
    {
      name: "audit-ipad-mini",
      testMatch: /audit\/.*\.spec\.ts/,
      use: { ...devices["iPad Mini"], browserName: "chromium" },
      dependencies: ["setup"],
    },
    {
      name: "audit-ipad-pro",
      testMatch: /audit\/.*\.spec\.ts/,
      use: { ...devices["iPad Pro 11"], browserName: "chromium" },
      dependencies: ["setup"],
    },

    // ---------------- LAPTOP / DESKTOP
    {
      name: "audit-laptop",
      testMatch: /audit\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
      dependencies: ["setup"],
    },
    {
      name: "audit-desktop",
      testMatch: /audit\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run dev:nocache",
    url: "http://localhost:8000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
