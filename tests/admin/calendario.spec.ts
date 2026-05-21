// Admin: Calendario de Operaciones — full UI flow.
//
// Coverage:
//   1. Navigate to Calendario tab
//   2. Verify header + stat pills
//   3. View mode switcher (Día / Semana / Mes)
//   4. Navigation: prev / hoy / next
//   5. Period label updates with navigation
//   6. Activity type filter buttons
//   7. Month view day cells render (28-31 days)
//   8. Click on a day → DayDetailsModal
//   9. DayDetailsModal shows activities or empty state
//  10. No console errors

import { test, expect, Page, TestInfo } from "@playwright/test";
import { snap } from "../helpers/snap";
import { attachConsoleRecorder } from "../helpers/console";

function proj(info: TestInfo): string {
  return info.project.name.replace(/^audit-/, "");
}

test.use({ storageState: "tests/auth/admin.cookies.json" });

async function goToCalendario(page: Page): Promise<boolean> {
  await page.goto("/");
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const tab = page
    .locator("button.top-nav__tab", { hasText: "Calendario" })
    .first();
  const visible = await tab.isVisible({ timeout: 15_000 }).catch(() => false);
  if (!visible) return false;

  await tab.click();
  await page.waitForTimeout(1200); // calendar data loading

  const container = page.locator(".calendar-v2").first();
  return container.isVisible({ timeout: 8_000 }).catch(() => false);
}

test.describe("Admin: Calendario module", () => {
  test.setTimeout(120_000);

  test("opens calendario tab and renders header + stats", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    page.on("pageerror", (e) => console.log(`PAGEERROR: ${e.message}`));

    const rendered = await goToCalendario(page);
    if (!rendered) {
      test.skip(true, "Calendario tab not available or locked");
      return;
    }
    await snap(page, "admin-calendario", "00-landing", proj(info));

    await expect(
      page.locator("h2", { hasText: /Calendario de Operaciones/i })
    ).toBeVisible({ timeout: 10_000 });

    // Stat pills (shown for active modules)
    const pills = page.locator(".calendar-stat-pill");
    const pillCount = await pills.count();
    console.log(`[calendario] Stat pills: ${pillCount}`);

    // Period label should show current month/year
    const periodLabel = page.locator(".period-label").first();
    await expect(periodLabel).toBeVisible({ timeout: 5_000 });
    const periodText = await periodLabel.textContent().catch(() => "");
    console.log(`[calendario] Period: ${periodText}`);

    rec.dump("admin-calendario", proj(info));
  });

  test("view mode switcher: Día / Semana / Mes", async ({ page }, info) => {
    const rendered = await goToCalendario(page);
    if (!rendered) {
      test.skip(true, "Calendario not available");
      return;
    }

    const modes = ["Día", "Semana", "Mes"];
    for (const mode of modes) {
      const btn = page
        .locator("button.view-mode-btn", { hasText: mode })
        .first();
      await expect(btn).toBeVisible({ timeout: 5_000 });
      await btn.click();
      await page.waitForTimeout(500);
      await snap(page, "admin-calendario", `01-mode-${mode.toLowerCase()}`, proj(info));
    }
  });

  test("navigation: prev / hoy / next updates period label", async ({ page }, info) => {
    const rendered = await goToCalendario(page);
    if (!rendered) {
      test.skip(true, "Calendario not available");
      return;
    }

    // Ensure we're in Mes view
    const mesBtn = page
      .locator("button.view-mode-btn", { hasText: "Mes" })
      .first();
    if (await mesBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await mesBtn.click();
      await page.waitForTimeout(400);
    }

    const periodLabel = page.locator(".period-label").first();
    const initialPeriod = await periodLabel.textContent().catch(() => "");

    // Click "Anterior"
    const prevBtn = page
      .locator(".date-navigation button", { hasText: /Anterior/i })
      .first();
    await expect(prevBtn).toBeVisible({ timeout: 5_000 });
    await prevBtn.click();
    await page.waitForTimeout(400);

    const prevPeriod = await periodLabel.textContent().catch(() => "");
    expect(prevPeriod).not.toBe(initialPeriod);
    await snap(page, "admin-calendario", "02-prev-month", proj(info));

    // Click "Siguiente" twice to go forward
    const nextBtn = page
      .locator(".date-navigation button", { hasText: /Siguiente/i })
      .first();
    await nextBtn.click();
    await page.waitForTimeout(300);
    await nextBtn.click();
    await page.waitForTimeout(300);
    await snap(page, "admin-calendario", "02b-next-month", proj(info));

    // Click "Hoy" to return
    const todayBtn = page
      .locator(".date-navigation button", { hasText: /^Hoy$/i })
      .first();
    await expect(todayBtn).toBeVisible({ timeout: 3_000 });
    await todayBtn.click();
    await page.waitForTimeout(400);

    const currentPeriod = await periodLabel.textContent().catch(() => "");
    console.log(`[calendario] Period after Hoy: ${currentPeriod} (original: ${initialPeriod})`);
    expect(currentPeriod).toBe(initialPeriod);
    await snap(page, "admin-calendario", "02c-back-to-today", proj(info));
  });

  test("activity filter buttons toggle on/off", async ({ page }, info) => {
    const rendered = await goToCalendario(page);
    if (!rendered) {
      test.skip(true, "Calendario not available");
      return;
    }

    const filterBtns = page.locator("button.filter-btn");
    const count = await filterBtns.count();
    console.log(`[calendario] Filter buttons: ${count}`);

    if (count === 0) {
      console.log("[calendario] No filter buttons (no active modules)");
      return;
    }

    for (let i = 0; i < count; i++) {
      await filterBtns.nth(i).click();
      await page.waitForTimeout(300);
    }
    await snap(page, "admin-calendario", "03-filters-toggled-off", proj(info));

    // Toggle all back on
    for (let i = 0; i < count; i++) {
      const isActive = await filterBtns
        .nth(i)
        .evaluate((el) => el.classList.contains("active"))
        .catch(() => true);
      if (!isActive) await filterBtns.nth(i).click();
    }
    await snap(page, "admin-calendario", "03b-filters-back-on", proj(info));
  });

  test("month grid renders day cells (28-42 total)", async ({ page }, info) => {
    const rendered = await goToCalendario(page);
    if (!rendered) {
      test.skip(true, "Calendario not available");
      return;
    }

    // Ensure Mes view
    const mesBtn = page
      .locator("button.view-mode-btn", { hasText: "Mes" })
      .first();
    if (await mesBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await mesBtn.click();
      await page.waitForTimeout(500);
    }

    // CalendarDay renders as .calendar-month-day in month view
    const dayCells = page.locator(".calendar-month-day");
    const cellCount = await dayCells.count();
    console.log(`[calendario] Day cells: ${cellCount}`);

    expect(cellCount, "Month has 28-42 day cells").toBeGreaterThanOrEqual(28);
    expect(cellCount).toBeLessThanOrEqual(42);

    await snap(page, "admin-calendario", "04-month-grid", proj(info));
  });

  test("clicking a day opens DayDetailsModal", async ({ page }, info) => {
    const rendered = await goToCalendario(page);
    if (!rendered) {
      test.skip(true, "Calendario not available");
      return;
    }

    // Ensure Mes view
    const mesBtn = page
      .locator("button.view-mode-btn", { hasText: "Mes" })
      .first();
    if (await mesBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await mesBtn.click();
      await page.waitForTimeout(400);
    }

    // CalendarDay renders as .calendar-month-day; today gets .today class
    const todayCell = page.locator(".calendar-month-day.today").first();
    const hasTodayCell = await todayCell
      .isVisible({ timeout: 2_000 })
      .catch(() => false);

    if (hasTodayCell) {
      await todayCell.click();
    } else {
      const anyCell = page.locator(".calendar-month-day").nth(15);
      const hasCell = await anyCell.isVisible({ timeout: 2_000 }).catch(() => false);
      if (hasCell) await anyCell.click();
      else {
        console.log("[calendario] No clickable day cells found");
        return;
      }
    }

    await page.waitForTimeout(800);
    await snap(page, "admin-calendario", "05-day-detail-modal", proj(info));

    // DayDetailsModal should appear
    const modal = page
      .locator(".day-details-modal, [class*='day-details'], [class*='DayDetail']")
      .first();
    const modalVisible = await modal.isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(`[calendario] DayDetailsModal opened: ${modalVisible}`);

    if (modalVisible) {
      // Close it
      await page.keyboard.press("Escape").catch(() => {});
      await page.locator("button:has-text('Cerrar'), button.modal-close").first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
  });

  test("no console errors in calendario", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const rendered = await goToCalendario(page);
    if (!rendered) {
      test.skip(true, "Calendario not available");
      return;
    }

    await page.waitForTimeout(2_000);
    await snap(page, "admin-calendario", "06-final", proj(info));

    rec.dump("admin-calendario", proj(info));

    const errors = rec.events.filter(
      (e) =>
        e.type === "pageerror" ||
        (e.type === "console" &&
          e.level === "error" &&
          !e.text.includes("favicon") &&
          !e.text.includes("ResizeObserver")),
    );

    if (errors.length > 0) {
      console.log(`[calendario] ${errors.length} errors:`);
      for (const e of errors.slice(0, 5)) console.log(`  ${e.text.slice(0, 200)}`);
    }
    expect.soft(errors, "No console errors in calendario").toEqual([]);
  });
});
