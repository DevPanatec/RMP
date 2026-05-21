// Admin: Reportes module — exercises tab nav, list rendering, detail modals,
// PDF download flow, and the location/map flows.
//
// Style mirrors tests/audit/conductor-flow.spec.ts: console recorder,
// per-step snaps, real-DOM assertions. Uses admin storage state.

import { test, expect, Page, TestInfo } from "@playwright/test";
import { snap } from "../helpers/snap";
import { attachConsoleRecorder } from "../helpers/console";

function projectShort(info: TestInfo): string {
  return info.project.name.replace(/^audit-/, "");
}

async function gotoReportes(page: Page): Promise<boolean> {
  await page.goto("/");
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Post-flat-refactor: Reportes es top-nav tab standalone (BI module).
  // El wrapper ReportesGroup + sub-tab Histórico fueron eliminados — renderiza
  // ReportsComponent directo cuando el módulo BI está activo.
  const tab = page
    .locator("button.top-nav__tab", { hasText: /^Reportes$/ })
    .first();
  const tabVisible = await tab.isVisible({ timeout: 15_000 }).catch(() => false);
  if (!tabVisible) return false;
  await tab.click();
  await page.waitForTimeout(1000);
  return true;
}

test.use({ storageState: "tests/auth/admin.cookies.json" });

test.describe("Admin: Reportes module", () => {
  test.setTimeout(120_000);

  test("opens reportes tab and renders dashboard", async ({ page }, info) => {
    const proj = projectShort(info);
    const rec = attachConsoleRecorder(page);
    page.on("pageerror", (e) => console.log(`PAGEERROR: ${e.name}: ${e.message}`));

    const ok = await gotoReportes(page);
    if (!ok) { test.skip(true, "Reportes tab not available"); return; }
    await snap(page, "admin-reportes", "00-dashboard", proj);

    // ReportsComponent dashboard renderiza directo (BI enabled). Wrapper eliminado.
    const container = page.locator(".reports-container-new");
    await expect(container.first()).toBeVisible({ timeout: 10_000 });

    const errs = rec.events.filter(
      (e) =>
        e.type === "pageerror" ||
        (e.type === "console" && e.level === "error" && !e.text.includes("favicon"))
    );
    expect.soft(errs, `Console errors: ${errs.map((e) => e.text).slice(0, 5).join("\n")}`).toEqual([]);
  });

  test("switches between category tabs (recoleccion, fumigacion, limpieza, mantenimiento)", async ({
    page,
  }, info) => {
    const proj = projectShort(info);
    const ok = await gotoReportes(page);
    if (!ok) { test.skip(true, "Reportes tab not available"); return; }

    const cats = ["Recolección", "Fumigación", "Limpieza", "Mantenimiento"];
    for (const c of cats) {
      const btn = page.locator(`.category-tab:has-text("${c}")`).first();
      if (await btn.isVisible({ timeout: 4_000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(800);
        await snap(page, "admin-reportes", `01-tab-${c.toLowerCase()}`, proj);

        // Expect either content grid, an empty state, or a loading spinner.
        const anyContent = page.locator(
          ".reports-category, .empty-state, .loading-state, .locations-grid, .route-reports-grid"
        );
        await expect(anyContent.first()).toBeVisible({ timeout: 8_000 });
      } else {
        console.log(`[admin-reportes] Tab "${c}" not visible — module likely disabled in org`);
      }
    }
  });

  test("recoleccion: opens route report list, then detail modal", async ({ page }, info) => {
    const proj = projectShort(info);
    const rec = attachConsoleRecorder(page);
    const ok = await gotoReportes(page);
    if (!ok) { test.skip(true, "Reportes tab not available"); return; }

    const recBtn = page.locator(`.category-tab:has-text("Recolección")`).first();
    if (!(await recBtn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, "Recoleccion module not enabled in org");
    }
    await recBtn.click();
    await page.waitForTimeout(1000);
    await snap(page, "admin-reportes", "02-recoleccion-list", proj);

    const card = page.locator(".location-map-card").first();
    const hasCards = await card.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!hasCards) {
      const empty = page.locator(".empty-state, [class*='empty']").first();
      await expect(empty).toBeVisible({ timeout: 5_000 });
      console.log("[admin-reportes] No recoleccion cards (empty state) — skipping detail");
      return;
    }

    await card.click();
    await page.waitForTimeout(1200);
    await snap(page, "admin-reportes", "02b-recoleccion-route-list-modal", proj);

    // RouteReportsListModal should be open; try clicking first report row inside it
    const reportRow = page
      .locator(".route-reports-list-modal .route-report-item, .route-reports-list-modal li, .route-report-card")
      .first();
    if (await reportRow.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await reportRow.click();
      await page.waitForTimeout(1000);
      await snap(page, "admin-reportes", "02c-route-report-detail", proj);

      // Detail modal closes — try common close patterns
      const closeBtn = page
        .locator(
          ".modal-content button[aria-label='Cerrar'], .modal-close, button:has-text('Cerrar'), button:has-text('×')"
        )
        .first();
      if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(600);
      } else {
        await page.keyboard.press("Escape").catch(() => {});
      }
    } else {
      console.log("[admin-reportes] Route has no executions yet — list modal empty");
    }

    const errs = rec.events.filter(
      (e) =>
        e.type === "pageerror" ||
        (e.type === "console" && e.level === "error" && !e.text.includes("favicon"))
    );
    expect.soft(errs, `Errors: ${errs.map((e) => e.text).slice(0, 5).join("\n")}`).toEqual([]);
  });

  test("limpieza: opens location card then cleaning report flow", async ({ page }, info) => {
    const proj = projectShort(info);
    const ok = await gotoReportes(page);
    if (!ok) { test.skip(true, "Reportes tab not available"); return; }

    const btn = page.locator(`.category-tab:has-text("Limpieza")`).first();
    if (!(await btn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, "Limpieza module not enabled");
    }
    await btn.click();
    await page.waitForTimeout(1000);
    await snap(page, "admin-reportes", "03-limpieza-list", proj);

    const card = page.locator(".reports-limpieza .location-map-card").first();
    if (!(await card.isVisible({ timeout: 4_000 }).catch(() => false))) {
      console.log("[admin-reportes] Limpieza empty");
      return;
    }
    await card.click();
    await page.waitForTimeout(1200);
    await snap(page, "admin-reportes", "03b-limpieza-modal", proj);

    // LocationReportsModal opens. Look for any cleaning report row inside.
    const reportRow = page
      .locator(".location-reports-modal .report-item, .location-reports-modal li, .cleaning-report-card")
      .first();
    if (await reportRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reportRow.click();
      await page.waitForTimeout(800);
      await snap(page, "admin-reportes", "03c-limpieza-detail", proj);
    }

    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);
  });

  test("fumigacion: opens location card then fumigation report flow", async ({ page }, info) => {
    const proj = projectShort(info);
    const ok = await gotoReportes(page);
    if (!ok) { test.skip(true, "Reportes tab not available"); return; }

    const btn = page.locator(`.category-tab:has-text("Fumigación")`).first();
    if (!(await btn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, "Fumigacion module not enabled");
    }
    await btn.click();
    await page.waitForTimeout(1000);
    await snap(page, "admin-reportes", "04-fumigacion-list", proj);

    // Check date range filter inputs exist
    const desde = page.locator(".module-download-controls input[type='date']").first();
    await expect.soft(desde).toBeVisible({ timeout: 4_000 });

    const card = page.locator(".reports-fumigacion .location-map-card").first();
    if (!(await card.isVisible({ timeout: 4_000 }).catch(() => false))) {
      console.log("[admin-reportes] Fumigacion empty");
      return;
    }
    await card.click();
    await page.waitForTimeout(1200);
    await snap(page, "admin-reportes", "04b-fumigacion-modal", proj);

    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);
  });

  test("PDF download from fumigacion module", async ({ page }, info) => {
    const proj = projectShort(info);
    const ok = await gotoReportes(page);
    if (!ok) { test.skip(true, "Reportes tab not available"); return; }

    const btn = page.locator(`.category-tab:has-text("Fumigación")`).first();
    if (!(await btn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, "Fumigacion module not enabled");
    }
    await btn.click();
    await page.waitForTimeout(1200);

    const downloadBtn = page.locator(".btn-download-module").first();
    await expect(downloadBtn).toBeVisible({ timeout: 8_000 });

    // pdfmake opens download in browser; capture either real download event or
    // verify the button switches to "Generando PDF..." (loading state).
    const downloadPromise = page.waitForEvent("download", { timeout: 25_000 }).catch(() => null);

    await downloadBtn.click();
    await page.waitForTimeout(800);

    // Either: button shows loading, OR a dialog/alert pops, OR download fires
    const loadingLabel = await downloadBtn.textContent().catch(() => "");
    const isLoading = loadingLabel?.includes("Generando");

    const download = await downloadPromise;
    await snap(page, "admin-reportes", "05-fumigacion-pdf-attempt", proj);

    if (download) {
      console.log(`[admin-reportes] PDF download triggered: ${download.suggestedFilename()}`);
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    } else if (isLoading) {
      console.log("[admin-reportes] PDF generation in progress (button loading state seen)");
    } else {
      // Possible alert dialog (no data, validation, etc.)
      console.log(
        `[admin-reportes] No download fired. Button text: "${loadingLabel}". May be empty data or generator error.`
      );
    }
  });

  test("mantenimiento: list + detail modal", async ({ page }, info) => {
    const proj = projectShort(info);
    const ok = await gotoReportes(page);
    if (!ok) { test.skip(true, "Reportes tab not available"); return; }

    const btn = page.locator(`.category-tab:has-text("Mantenimiento")`).first();
    if (!(await btn.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, "Mantenimiento module not enabled");
    }
    await btn.click();
    await page.waitForTimeout(1200);
    await snap(page, "admin-reportes", "06-mantenimiento-list", proj);

    const card = page.locator(".reports-mantenimiento .route-report-card").first();
    if (await card.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(1000);
      await snap(page, "admin-reportes", "06b-mantenimiento-detail", proj);
      await page.keyboard.press("Escape").catch(() => {});
    } else {
      const empty = page.locator(".empty-state").first();
      await expect.soft(empty).toBeVisible({ timeout: 4_000 });
    }
  });

  test("no 401/403/500 network errors and no console errors across tabs", async ({ page }, info) => {
    const proj = projectShort(info);
    const rec = attachConsoleRecorder(page);
    const badResponses: { url: string; status: number }[] = [];
    page.on("response", (r) => {
      const s = r.status();
      if (s === 401 || s === 403 || s >= 500) badResponses.push({ url: r.url(), status: s });
    });

    const ok = await gotoReportes(page);
    if (!ok) { test.skip(true, "Reportes tab not available"); return; }
    for (const cat of ["Recolección", "Fumigación", "Limpieza", "Mantenimiento"]) {
      const b = page.locator(`.category-tab:has-text("${cat}")`).first();
      if (await b.isVisible({ timeout: 2_500 }).catch(() => false)) {
        await b.click();
        await page.waitForTimeout(900);
      }
    }
    await snap(page, "admin-reportes", "07-final-state", proj);

    const errs = rec.events.filter(
      (e) =>
        e.type === "pageerror" ||
        (e.type === "console" && e.level === "error" && !e.text.includes("favicon"))
    );
    if (errs.length > 0) {
      console.log(`[admin-reportes] ${errs.length} console errors:`);
      for (const e of errs.slice(0, 10)) console.log(`  - ${e.text.slice(0, 250)}`);
    }
    if (badResponses.length > 0) {
      console.log(`[admin-reportes] ${badResponses.length} bad responses:`);
      for (const r of badResponses.slice(0, 10)) console.log(`  - [${r.status}] ${r.url}`);
    }
    expect.soft(badResponses, "No 401/403/500 expected").toEqual([]);
    expect.soft(errs, "No console errors expected").toEqual([]);
  });
});
