import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Reads .e2e/bootstrap.json (produced by `npx convex run e2e:bootstrap`)
// and performs a real UI login per role, saving storageState cookies.
// One login per role per run — specs reuse these cookies via test.use({ storageState }).

const BOOT_FILE = path.join(process.cwd(), ".e2e", "bootstrap.json");
const COOKIE_DIR = path.join(process.cwd(), "tests", "auth");

function loadBootstrap() {
  if (!fs.existsSync(BOOT_FILE)) {
    throw new Error(
      `Missing ${BOOT_FILE}. Run: npx convex run e2e:bootstrap '{"runId":"<id>"}' first.`,
    );
  }
  // Strip BOM — PowerShell Set-Content with utf8 on Win 5.1 writes BOM
  const raw = fs.readFileSync(BOOT_FILE, "utf-8").replace(/^﻿/, "");
  return JSON.parse(raw);
}

const ROLES = ["super_admin", "admin", "enterprise", "viewer", "conductor"] as const;

for (const role of ROLES) {
  setup(`auth: ${role}`, async ({ page }) => {
    const boot = loadBootstrap();
    const { email, password } = boot.users[role];

    await page.goto("/");
    // Login form: input[type=email] + input[type=password] + button.btn--primary
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator("button.btn--primary").click();

    // Wait for either dashboard shell OR auth error
    // Conductor goes to ConductorDashboard, others to AdminDashboard
    await page.waitForFunction(
      () => {
        // Dashboard markers: top-nav (admin) or conductor-dashboard wrapper
        return (
          document.querySelector(".top-nav") !== null ||
          document.querySelector('[class*="conductor"]') !== null ||
          document.querySelector(".main-content") !== null ||
          document.querySelector(".error-message") !== null
        );
      },
      { timeout: 30_000 },
    );

    // Confirm no auth error visible
    const errorVisible = await page.locator(".error-message").isVisible().catch(() => false);
    if (errorVisible) {
      const errText = await page.locator(".error-message").textContent();
      throw new Error(`Login failed for ${role}: ${errText}`);
    }

    // Save state
    fs.mkdirSync(COOKIE_DIR, { recursive: true });
    const stateFile = path.join(COOKIE_DIR, `${role}.cookies.json`);
    await page.context().storageState({ path: stateFile });
    console.log(`✓ saved ${stateFile}`);
  });
}
