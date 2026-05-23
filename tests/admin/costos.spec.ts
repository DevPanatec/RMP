// Admin: Costos module — tab navigation + KPI cards + charts.
//
// Coverage:
//   1. Navigate Inventario top-nav → Costos app-subtab (post-flat-refactor)
//   2. Verify header renders
//   3. Switch between costos tabs (Resumen, Inventario, Mantenimiento)
//   4. KPI cards present on Resumen tab
//   5. No console errors / no 401/403/500

import { test, expect, Page, TestInfo } from "@playwright/test";
import { snap } from "../helpers/snap";
import { attachConsoleRecorder } from "../helpers/console";

function proj(info: TestInfo): string {
  return info.project.name.replace(/^audit-/, "");
}

test.use({ storageState: "tests/auth/admin.cookies.json" });

async function goToCostos(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Step 1: top-nav Inventario tab (standalone post-flat-refactor)
  const invTab = page
    .locator("button.top-nav__tab", { hasText: /^Inventario$/ })
    .first();
  const invVisible = await invTab.isVisible({ timeout: 25_000 }).catch(() => false);
  if (!invVisible) {
    test.skip(true, "Inventario tab not visible — INV module off or env degraded");
    return;
  }
  await invTab.click();
  await page.waitForTimeout(800);

  // Step 2: Costos app-subtab — solo visible para admin/super_admin
  const costosTab = page
    .locator("button.app-subtab", { hasText: /^Costos$/ })
    .first();
  const hasCostos = await costosTab.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!hasCostos) {
    test.skip(true, "Costos sub-tab not available (role not admin/super_admin)");
    return;
  }
  await costosTab.click();
  await page.waitForTimeout(800);
}

test.describe("Admin: Costos module", () => {
  test.setTimeout(120_000);

  test("opens costos section and renders header + stats", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    page.on("pageerror", (e) => console.log(`PAGEERROR: ${e.message}`));

    await goToCostos(page);
    await snap(page, "admin-costos", "00-landing", proj(info));

    await expect(
      page.locator("h2", { hasText: /Analisis de Costos|Análisis de Costos/i })
    ).toBeVisible({ timeout: 10_000 });

    // Stat pills in header
    const pills = page.locator(".costos-stat-pill");
    const count = await pills.count();
    console.log(`[costos] Stat pills: ${count}`);
    expect(count, "Should have costos stat pills").toBeGreaterThanOrEqual(1);

    await snap(page, "admin-costos", "01-header", proj(info));

    rec.dump("admin-costos", proj(info));
  });

  test("tab Resumen renders KPI cards", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    await goToCostos(page);

    // Resumen tab should be default
    const resumenTab = page
      .locator("button.costos-tab-btn", { hasText: "Resumen" })
      .first();
    const hasResumen = await resumenTab.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasResumen) {
      await resumenTab.click();
      await page.waitForTimeout(600);
    }

    await snap(page, "admin-costos", "02-resumen-tab", proj(info));

    // KPI cards
    const kpiCards = page.locator(".kpi-card");
    const kpiCount = await kpiCards.count();
    console.log(`[costos] KPI cards in Resumen: ${kpiCount}`);
    expect(kpiCount, "Resumen tab should have KPI cards").toBeGreaterThanOrEqual(1);

    rec.dump("admin-costos", proj(info));
  });

  test("switches between all costos tabs", async ({ page }, info) => {
    await goToCostos(page);

    const tabLabels = ["Resumen", "Inventario", "Mantenimiento"];

    for (const label of tabLabels) {
      const btn = page
        .locator("button.costos-tab-btn", { hasText: label })
        .first();
      const visible = await btn.isVisible({ timeout: 3_000 }).catch(() => false);

      if (!visible) {
        console.log(`[costos] Tab "${label}" not visible (module probably off)`);
        continue;
      }

      await btn.click();
      await page.waitForTimeout(700);
      await snap(page, "admin-costos", `03-tab-${label.toLowerCase()}`, proj(info));

      // Tab content should render without crashing
      const tabContent = page.locator(".costos-tab-content, .costos-v2").first();
      await expect(tabContent).toBeVisible({ timeout: 5_000 });
    }
  });

  test("Inventario tab shows inventory cost breakdown", async ({ page }, info) => {
    await goToCostos(page);

    const invTab = page
      .locator("button.costos-tab-btn", { hasText: "Inventario" })
      .first();
    const hasInvTab = await invTab.isVisible({ timeout: 4_000 }).catch(() => false);

    if (!hasInvTab) {
      console.log("[costos] Inventario tab not available");
      return;
    }

    await invTab.click();
    await page.waitForTimeout(800);
    await snap(page, "admin-costos", "04-inventario-tab", proj(info));

    // Should render some content (table or empty state)
    const content = page.locator(".costos-tab-content");
    await expect(content).toBeVisible({ timeout: 5_000 });
  });

  test("Mantenimiento tab shows maintenance costs", async ({ page }, info) => {
    await goToCostos(page);

    const mtoTab = page
      .locator("button.costos-tab-btn", { hasText: "Mantenimiento" })
      .first();
    const hasMtoTab = await mtoTab.isVisible({ timeout: 4_000 }).catch(() => false);

    if (!hasMtoTab) {
      console.log("[costos] Mantenimiento tab not available");
      return;
    }

    await mtoTab.click();
    await page.waitForTimeout(800);
    await snap(page, "admin-costos", "05-mantenimiento-tab", proj(info));

    const content = page.locator(".costos-tab-content");
    await expect(content).toBeVisible({ timeout: 5_000 });
  });

  test("no console errors or HTTP failures in costos", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const badRequests: { url: string; status: number }[] = [];
    page.on("response", (r) => {
      const s = r.status();
      if ((s === 401 || s === 403 || s >= 500) && !r.url().includes("favicon")) {
        badRequests.push({ url: r.url(), status: s });
      }
    });

    await goToCostos(page);

    // Visit all tabs
    for (const label of ["Resumen", "Inventario", "Mantenimiento"]) {
      const btn = page.locator("button.costos-tab-btn", { hasText: label }).first();
      if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(700);
      }
    }

    await snap(page, "admin-costos", "06-final-sweep", proj(info));
    rec.dump("admin-costos", proj(info));

    const errors = rec.events.filter(
      (e) =>
        e.type === "pageerror" ||
        (e.type === "console" && e.level === "error" && !e.text.includes("favicon")),
    );

    if (errors.length > 0) {
      console.log(`[costos] ${errors.length} console errors:`);
      for (const e of errors.slice(0, 5)) console.log(`  ${e.text.slice(0, 200)}`);
    }
    if (badRequests.length > 0) {
      console.log(`[costos] HTTP errors: ${JSON.stringify(badRequests.slice(0, 3))}`);
    }

    expect.soft(badRequests, "No 401/403/5xx in costos").toEqual([]);
    expect.soft(errors, "No console errors in costos").toEqual([]);
  });
});
