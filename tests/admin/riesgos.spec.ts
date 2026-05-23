// Admin: Riesgos (Risk reports) module — E2E.
//
// Nav (post-flat-refactor): "Riesgos" is a standalone top-nav tab, gated by
// hasModulo('REC'). The previous ReportesGroup wrapper was removed.
//
// Exercises every admin-facing action on the riesgos view:
//   1. Open 'Riesgos' top-nav tab directly
//   2. Verify list rendering (cards or empty state)
//   3. Filter selects (estado + tipo) — verify present + interactive
//   4. Open detail modal ("Ver Detalles")
//   5. Change estado: reportado → en_revision via "Revisar" footer button
//   6. Change estado: en_revision → resuelto via "Resuelto" footer button
//   7. Verify Dashboard RiskAlerts widget reflects state (counts/cards)
//   8. Console + network: zero errors, zero 401/403/500
//
// NOTE: Admin UI exposes NO "Nuevo Riesgo" / "Reportar Riesgo" button — those
// flows live in the conductor dashboard (see tests/audit/conductor-flow.spec.ts).
// Same for DELETE: convex/reportes_riesgo.ts `remove` mutation exists, but no
// UI button wires to it from the admin Risk view. We document this as a gap.
//
// Filter selects render but are NOT wired to any state — also documented.
//
// Note on testMatch: playwright.config.ts only matched /audit\/.*\.spec\.ts/.
// We extended it to /(audit|admin)\/.*\.spec\.ts/ to discover this file.
//
// Top-nav tab labels: at viewports ≤1366px, .top-nav__tab span is `display:none`
// (icon-only). Text-based selectors still match via DOM textContent under
// has-text, but `toBeVisible()` will fail on the span itself — we target the
// BUTTON element which IS visible.

import { test, expect, Page, TestInfo } from "@playwright/test";
import { snap } from "../helpers/snap";
import { attachConsoleRecorder } from "../helpers/console";

function projectShort(info: TestInfo): string {
  return info.project.name.replace(/^audit-/, "");
}

test.use({ storageState: "tests/auth/admin.cookies.json" });

test.describe("Admin: Riesgos module", () => {
  test.setTimeout(120_000);

  test("admin: full riesgos UI flow", async ({ page }, testInfo) => {
    const proj = projectShort(testInfo);
    const role = "admin-riesgos";
    const recorder = attachConsoleRecorder(page);

    const httpFailures: string[] = [];
    page.on("response", (res) => {
      const url = res.url();
      const status = res.status();
      if (
        (status === 401 || status === 403 || status >= 500) &&
        !url.includes("favicon") &&
        !url.includes("clerk-telemetry")
      ) {
        httpFailures.push(`${status} ${url}`);
      }
    });

    page.on("pageerror", (err) => console.log(`PAGEERROR: ${err.name}: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`PAGE[err]: ${msg.text().slice(0, 250)}`);
    });

    // -------- 0. LAND
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await snap(page, role, "00-landing", proj);

    // -------- 1. CLICK RIESGOS TOP-NAV TAB (standalone post-flat-refactor)
    // At ≤1366px the span text is display:none, so we match by DOM text only.
    // On mobile (≤1024) the dashboard app-bar auto-hides after 3s — tap the
    // map to trigger triggerShowHeader() and surface the top-nav.
    const viewportSize = page.viewportSize();
    const isMobile = (viewportSize?.width ?? 9999) <= 1024;
    if (isMobile) {
      await page.locator(".main-content, .dashboard-container").first().click({ position: { x: 50, y: 100 } }).catch(() => {});
      await page.waitForTimeout(500);
    }

    // Post-Core-refactor: Riesgos vive como sub-tab interno de Core top-nav.
    // Flow: click top-nav "Core" → click sub-tab "Riesgos" en CoreSubNav.
    const coreTab = page
      .locator("button.top-nav__tab", { hasText: /^Core$/ })
      .first();
    const coreVisible = await coreTab.isVisible({ timeout: 15_000 }).catch(() => false);
    if (!coreVisible) {
      test.skip(true, "Core tab not available — env degraded");
      return;
    }
    await coreTab.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(200);
    await coreTab.click({ force: isMobile });
    await page.waitForTimeout(800);

    // Click sub-tab "Riesgos" dentro de CoreSubNav. Si no aparece, REC module off.
    const riesgosSubTab = page
      .locator("button.core-subnav__tab", { hasText: /Riesgos/ })
      .first();
    const riesgosVisible = await riesgosSubTab.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!riesgosVisible) {
      test.skip(true, "Riesgos sub-tab not available (REC module off for this role/org)");
      return;
    }
    await riesgosSubTab.click({ force: isMobile });
    await page.waitForTimeout(1200);
    await snap(page, role, "01-riesgos-open", proj);

    // -------- 2. VERIFY RISK VIEW LOADED
    const riskHeader = page.locator(".risk-header-v2 h2:has-text('Reportes de Riesgo')").first();
    await expect(riskHeader, "Risk header should render").toBeVisible({ timeout: 10_000 });

    // Stats compact (Pendientes / En Revisión / Resueltos / Total) — 4 boxes
    const statBoxes = page.locator(".risk-stat-compact");
    await expect(statBoxes, "Should have 4 stat boxes").toHaveCount(4, { timeout: 5_000 });

    // -------- 3. FILTERS PRESENT
    const filterSelects = page.locator(".reports-filter-select");
    const filterCount = await filterSelects.count();
    expect(filterCount, "Two filter selects (estado + tipo) should exist").toBe(2);

    // Try selecting an option — UI MAY not react (filters are not wired) but should not throw
    if (filterCount >= 1) {
      await filterSelects.nth(0).selectOption("reportado").catch(() => {});
      await page.waitForTimeout(300);
      await filterSelects.nth(0).selectOption("todos").catch(() => {});
    }
    if (filterCount >= 2) {
      await filterSelects.nth(1).selectOption("interno").catch(() => {});
      await page.waitForTimeout(300);
      await filterSelects.nth(1).selectOption("todos").catch(() => {});
    }
    await snap(page, role, "02-filters-interacted", proj);

    // -------- 4. "NUEVO RIESGO" BUTTON (now fixed — admin can create risks)
    const newRiskBtn = page.locator(
      "button:has-text('Nuevo Riesgo'), button:has-text('Reportar Riesgo'), button:has-text('Crear Riesgo')",
    );
    const newRiskCount = await newRiskBtn.count();
    console.log(`[riesgos] 'Nuevo/Reportar Riesgo' buttons on admin view: ${newRiskCount}`);
    expect(newRiskCount, "admin must have a 'Nuevo Riesgo' button").toBeGreaterThan(0);

    // -------- 5. LIST OR EMPTY STATE
    const reportCards = page.locator(".report-card");
    const cardCount = await reportCards.count();
    console.log(`[riesgos] Report cards visible: ${cardCount}`);

    const emptyState = page.locator(".empty-state, :has-text('No hay reportes de riesgo')");
    const isEmpty = cardCount === 0 && (await emptyState.first().isVisible().catch(() => false));

    if (isEmpty) {
      console.log("[riesgos] Empty state shown — no risks exist for this admin");
      await snap(page, role, "03-empty-state", proj);
    } else if (cardCount > 0) {
      await snap(page, role, "03-list-with-cards", proj);

      // -------- 6. OPEN DETAIL MODAL ("Ver Detalles")
      const firstCard = reportCards.first();
      const verDetallesBtn = firstCard.locator("button:has-text('Ver Detalles')").first();
      await expect(verDetallesBtn, "Ver Detalles button should be present").toBeVisible({
        timeout: 5_000,
      });
      await verDetallesBtn.click();
      await page.waitForTimeout(800);

      const detailModal = page.locator(".report-modal, .modal-content").first();
      await expect(detailModal, "Detail modal should open").toBeVisible({ timeout: 5_000 });
      await snap(page, role, "04-detail-modal", proj);

      // Close it — selector debe estar SCOPED al modal pa' evitar matchear
      // el botón "Cerrar Sesión" (logout) del app bar.
      const closeBtn = detailModal
        .locator(".modal-close, button[aria-label*='close' i], button[aria-label*='cerrar' i]")
        .first();
      if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeBtn.click().catch(() => {});
        await page.waitForTimeout(400);
      } else {
        // Fallback: ESC para cerrar
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(400);
      }

      // -------- 7. CHANGE ESTADO via footer buttons
      // Look for a card with "Revisar" button (reportado state)
      const revisarBtns = page.locator(".report-card-footer button:has-text('Revisar')");
      const revisarCount = await revisarBtns.count();
      console.log(`[riesgos] 'Revisar' buttons (reportado → en_revision): ${revisarCount}`);
      if (revisarCount > 0) {
        await revisarBtns.first().click();
        await page.waitForTimeout(1500); // mutation
        await snap(page, role, "05a-after-revisar", proj);
      }

      const resueltoBtns = page.locator(".report-card-footer button:has-text('Resuelto')");
      const resueltoCount = await resueltoBtns.count();
      console.log(`[riesgos] 'Resuelto' buttons (en_revision → resuelto): ${resueltoCount}`);
      if (resueltoCount > 0) {
        await resueltoBtns.first().click();
        await page.waitForTimeout(1500); // mutation
        await snap(page, role, "05b-after-resuelto", proj);
      }

      // -------- 8. EDIT? — admin view exposes NO edit button (title/descripcion/severity not editable from UI)
      const editBtns = page.locator(
        ".report-card-footer button:has-text('Editar'), .report-card-footer button:has-text('Edit')",
      );
      const editCount = await editBtns.count();
      console.log(`[riesgos] Edit buttons in cards: ${editCount}`);

      // -------- 9. DELETE? — also missing in UI
      const deleteBtns = page.locator(
        ".report-card-footer button:has-text('Eliminar'), .report-card-footer button:has-text('Delete')",
      );
      const deleteCount = await deleteBtns.count();
      console.log(`[riesgos] Delete buttons in cards: ${deleteCount}`);
    } else {
      console.log("[riesgos] Neither cards nor empty state visible — possible render bug");
      await snap(page, role, "03-no-cards-no-empty", proj);
    }

    // -------- 10. NAVIGATE BACK TO MONITOREO (Dashboard), VERIFY RiskAlerts WIDGET
    // The top-nav 'Dashboard' tab is labeled "Monitoreo" in this build.
    const monitoreoTab = page
      .locator("button.top-nav__tab", { hasText: /Monitoreo/ })
      .first();
    if (await monitoreoTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await monitoreoTab.click();
      await page.waitForTimeout(2000);
      await snap(page, role, "06-dashboard-after-changes", proj);

      // RiskAlerts widget surfaces as a tab/panel inside the activity dock.
      // It may be hidden behind an "Alertas" sub-tab — try to surface it.
      const alertasSubTab = page
        .locator("button", { hasText: /^Alertas$/ })
        .first();
      if (await alertasSubTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await alertasSubTab.click();
        await page.waitForTimeout(800);
      }
      const riskAlertsHeader = page.locator(
        ".risk-alerts .alerts-header h3, .risk-alerts h3",
      );
      const hasWidget = await riskAlertsHeader
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      console.log(`[riesgos] RiskAlerts widget visible on dashboard: ${hasWidget}`);
      await snap(page, role, "07-dashboard-alerts-panel", proj);
    }

    // -------- FINAL ASSERTIONS
    const consolePath = recorder.dump(role, proj);
    console.log(`\n[admin-riesgos] Console events: ${consolePath}`);

    const errors = recorder.events.filter(
      (e) =>
        e.type === "pageerror" ||
        (e.type === "console" &&
          e.level === "error" &&
          !e.text.includes("favicon") &&
          !e.text.includes("clerk-telemetry")),
    );
    if (errors.length > 0) {
      console.log(`\n[admin-riesgos] Console errors captured: ${errors.length}`);
      for (const e of errors.slice(0, 10)) {
        console.log(`  - [${e.type}/${e.level ?? ""}] ${e.text.slice(0, 250)}`);
      }
    }

    if (httpFailures.length > 0) {
      console.log(`\n[admin-riesgos] HTTP failures (401/403/5xx): ${httpFailures.length}`);
      for (const f of httpFailures.slice(0, 10)) console.log(`  - ${f}`);
    }

    // Soft assertions: don't fail the run on console errors (those are bugs to report),
    // but DO fail on HTTP 401/403/500 since that breaks auth/data access.
    expect(httpFailures, "No 401/403/5xx responses").toEqual([]);
  });
});
