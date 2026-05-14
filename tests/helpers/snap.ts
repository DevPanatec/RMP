import { Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Full-page screenshot helper. Writes to audit/<role>/<slot>.png with animations
// disabled and waits for networkidle to reduce flakiness from maps/tile loads.

export async function snap(page: Page, role: string, slot: string, project = "headless") {
  // project name = subdir under audit/ (e.g. "iphone-se", "desktop", "headed")
  const dir = path.join(process.cwd(), "audit", project, role);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slot}.png`);

  // Best-effort wait for network — short timeout, don't fail if maps poll forever
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300); // micro-settle for CSS transitions

  await page.screenshot({
    path: file,
    fullPage: true,
    animations: "disabled",
  });
  return file;
}
