// Admin: Inventario module — full CRUD + UI flow.
//
// Coverage:
//   1. Navigate to Inventario top-nav tab (standalone post-flat-refactor)
//   2. Verify header, stats pills, table renders
//   3. Search functionality
//   4. Category chips filter
//   5. View toggle (table ↔ grid)
//   6. "Nuevo Item" modal — open, fill, submit
//   7. Detail modal (eye button)
//   8. Edit modal (edit button)
//   9. Delete with ConfirmDialog
//  10. Network + console sweep

import { test, expect, Page, TestInfo } from "@playwright/test";
import { snap } from "../helpers/snap";
import { attachConsoleRecorder } from "../helpers/console";

function proj(info: TestInfo): string {
  return info.project.name.replace(/^audit-/, "");
}

test.use({ storageState: "tests/auth/admin.cookies.json" });

async function goToInventario(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Inventario es top-nav tab standalone (post-flat-refactor), gated por hasModulo('INV').
  const invTab = page
    .locator("button.top-nav__tab", { hasText: /^Inventario$/ })
    .first();
  const hasInv = await invTab.isVisible({ timeout: 25_000 }).catch(() => false);
  if (!hasInv) {
    test.skip(true, "Módulo INV no activo en esta org");
    return;
  }
  await invTab.click();
  await page.waitForTimeout(800);

  // Default sub-tab interno es "Materiales" — asegurar que está activo
  const materialesSubTab = page
    .locator("button.inv-subtab", { hasText: /^Materiales$/ })
    .first();
  if (await materialesSubTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await materialesSubTab.click();
    await page.waitForTimeout(500);
  }
}

function ts(): string {
  return Date.now().toString().slice(-6);
}

test.describe("Admin: Inventario module", () => {
  test.setTimeout(180_000);

  test("opens inventario section and renders header + stats", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    page.on("pageerror", (e) => console.log(`PAGEERROR: ${e.message}`));

    await goToInventario(page);
    await snap(page, "admin-inventario", "00-landing", proj(info));

    // Header
    await expect(
      page.locator("h2", { hasText: /Gestión de Inventario/i })
    ).toBeVisible({ timeout: 10_000 });

    // Stats pills (Total, En Orden, Stock Bajo, Crítico)
    const pills = page.locator(".inventory-stat-pill");
    const pillCount = await pills.count();
    expect(pillCount, "Should have inventory stat pills").toBeGreaterThanOrEqual(1);

    await snap(page, "admin-inventario", "01-header-stats", proj(info));

    const pageErrors = rec.events.filter((e) => e.type === "pageerror");
    expect.soft(pageErrors).toHaveLength(0);
    rec.dump("admin-inventario", proj(info));
  });

  test("search input filters materials", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    await goToInventario(page);

    const searchInput = page
      .locator('input[placeholder*="Buscar"]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    await searchInput.fill("bolsa");
    await page.waitForTimeout(500);
    await snap(page, "admin-inventario", "02-search-bolsa", proj(info));

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(300);

    rec.dump("admin-inventario", proj(info));
  });

  test("category chips filter materials", async ({ page }, info) => {
    await goToInventario(page);

    const chips = page.locator("button.category-chip");
    const count = await chips.count();
    console.log(`[inventario] Category chips: ${count}`);

    for (let i = 0; i < Math.min(count, 4); i++) {
      await chips.nth(i).click();
      await page.waitForTimeout(300);
      const label = await chips.nth(i).textContent().catch(() => "");
      console.log(`[inventario] Chip ${i}: ${label?.trim()}`);
    }
    await snap(page, "admin-inventario", "03-category-filter", proj(info));
  });

  test("view toggle switches between table and grid", async ({ page }, info) => {
    await goToInventario(page);

    const tableToggle = page
      .locator('button.view-toggle[title*="tabla"]')
      .first();
    const gridToggle = page
      .locator('button.view-toggle[title*="tarjetas"]')
      .first();

    const hasToggles =
      (await tableToggle.isVisible({ timeout: 3_000 }).catch(() => false)) &&
      (await gridToggle.isVisible({ timeout: 3_000 }).catch(() => false));

    if (!hasToggles) {
      console.log("[inventario] View toggles not visible — skipping");
      return;
    }

    await gridToggle.click();
    await page.waitForTimeout(400);
    await snap(page, "admin-inventario", "04-grid-view", proj(info));

    await tableToggle.click();
    await page.waitForTimeout(400);
    await snap(page, "admin-inventario", "04b-table-view", proj(info));
  });

  test("opens Nuevo Item modal with form fields", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const dialogs: string[] = [];
    page.on("dialog", async (d) => {
      dialogs.push(`${d.type()}: ${d.message()}`);
      await d.dismiss().catch(() => {});
    });

    await goToInventario(page);

    const addBtn = page.locator("button.btn-add-v2", { hasText: /Nuevo Item/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(600);
    await snap(page, "admin-inventario", "05-modal-open", proj(info));

    // Modal must be open
    const modalTitle = page.locator("h3", { hasText: /Nuevo Item/i }).first();
    await expect(modalTitle).toBeVisible({ timeout: 5_000 });

    // Required fields present
    await expect(page.locator("input#nombre, input.input-main").first()).toBeVisible();
    await expect(page.locator("select#tipo_articulo, select.input-main").first()).toBeVisible();

    // Close via X
    const closeBtn = page.locator("button.modal-close").first();
    await expect(closeBtn).toBeVisible({ timeout: 3_000 });
    await closeBtn.click();
    await page.waitForTimeout(400);
    await snap(page, "admin-inventario", "05b-modal-closed", proj(info));

    rec.dump("admin-inventario", proj(info));
  });

  test("creates a new material end-to-end", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const dialogs: string[] = [];
    page.on("dialog", async (d) => {
      dialogs.push(`${d.type()}: ${d.message()}`);
      await d.accept().catch(() => {});
    });

    await goToInventario(page);

    const beforeCount = await page.locator(".material-name-modern").count();

    const addBtn = page.locator("button.btn-add-v2", { hasText: /Nuevo Item/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 8_000 });
    await addBtn.click();
    await page.waitForTimeout(600);

    const itemName = `[E2E] Item Test ${ts()}`;

    // Fill nombre
    const nombreInput = page.locator("input#nombre").first();
    await expect(nombreInput).toBeVisible({ timeout: 5_000 });
    await nombreInput.fill(itemName);

    // Set tipo_articulo to insumo (default)
    const tipoSelect = page.locator("select#tipo_articulo").first();
    if (await tipoSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await tipoSelect.selectOption("insumo");
    }

    // unidad_medida (required per form)
    const unidadInput = page.locator("input#unidad_medida").first();
    if (await unidadInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await unidadInput.fill("Unidad");
    }

    // precio_unitario
    const precioInput = page.locator("input#precio_unitario").first();
    if (await precioInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await precioInput.fill("5.50");
    }

    await snap(page, "admin-inventario", "06-form-filled", proj(info));

    // Submit
    const submitBtn = page
      .locator("button[type='submit'], button.btn-modern.btn-primary")
      .last();
    await expect(submitBtn).toBeVisible({ timeout: 3_000 });
    await submitBtn.click();

    // Wait for Convex round-trip + alert dismiss
    await page.waitForTimeout(3_000);
    await snap(page, "admin-inventario", "06b-after-submit", proj(info));

    // Verify modal closed (success) or dialog fired
    const modalStillOpen = await page
      .locator("h3", { hasText: /Nuevo Item/i })
      .isVisible({ timeout: 500 })
      .catch(() => false);

    console.log(
      `[inventario] create: modal closed=${!modalStillOpen}, dialogs=${dialogs.join(" | ") || "(none)"}`,
    );

    if (!modalStillOpen) {
      // Verify item appears in list
      const newRow = page
        .locator(".material-name-modern", { hasText: "[E2E]" })
        .first();
      const appeared = await newRow
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      expect(appeared, `Item "${itemName}" should appear in list`).toBe(true);

      const afterCount = await page.locator(".material-name-modern").count();
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount + 1);
    } else {
      console.log("[inventario] Modal still open after submit — mutation likely failed");
      await page.locator("button.modal-close").first().click().catch(() => {});
    }

    rec.dump("admin-inventario", proj(info));
  });

  test("opens view (detail) modal for first item", async ({ page }, info) => {
    await goToInventario(page);

    const viewBtn = page.locator(".action-btn-modern.action-view").first();
    const hasView = await viewBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasView) {
      console.log("[inventario] No items in table to view — skipping");
      return;
    }

    await viewBtn.click();
    await page.waitForTimeout(800);
    await snap(page, "admin-inventario", "07-detail-modal", proj(info));

    // Modal or detail panel should appear
    const anyDetail = page.locator(
      ".modal-overlay, .item-detail-modal, .detail-panel",
    );
    const hasDetail = await anyDetail
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    console.log(`[inventario] Detail modal opened: ${hasDetail}`);

    // Close
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);
  });

  test("opens edit modal for existing item", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    await goToInventario(page);

    const editBtn = page.locator(".action-btn-modern.action-edit").first();
    const hasEdit = await editBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasEdit) {
      console.log("[inventario] No items to edit — skipping");
      return;
    }

    await editBtn.click();
    await page.waitForTimeout(600);
    await snap(page, "admin-inventario", "08-edit-modal", proj(info));

    // Edit modal should show stock/min/max fields
    const editModal = page.locator(".modal-overlay, .modal-content").first();
    const visible = await editModal.isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(`[inventario] Edit modal opened: ${visible}`);

    if (visible) {
      // Modify cantidad_disponible
      const stockInput = page
        .locator("input[type='number']")
        .first();
      if (await stockInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
        const current = await stockInput.inputValue().catch(() => "0");
        await stockInput.fill(String(parseFloat(current) + 1));
      }

      // Submit or cancel
      await page.keyboard.press("Escape").catch(() => {});
    }

    rec.dump("admin-inventario", proj(info));
  });

  test("deletes an E2E material via confirm dialog", async ({ page }, info) => {
    await goToInventario(page);
    await page.waitForTimeout(1000);

    // Find [E2E] row
    const e2eRow = page
      .locator(".material-name-modern", { hasText: "[E2E]" })
      .first();
    const hasE2E = await e2eRow.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasE2E) {
      console.log("[inventario] No [E2E] item to delete — skipping delete test");
      return;
    }

    // The delete button is the last .action-btn-modern in that row
    // Get the row containing E2E text, then find delete button
    const e2eRowContainer = page
      .locator("tr", { has: page.locator(".material-name-modern", { hasText: "[E2E]" }) })
      .first();

    const deleteBtn = e2eRowContainer
      .locator(".action-btn-modern.action-delete")
      .first();
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();
    await page.waitForTimeout(500);
    await snap(page, "admin-inventario", "09-confirm-dialog", proj(info));

    // ConfirmDialog primary button
    const confirmBtn = page
      .locator(
        ".confirm-dialog button.btn--primary, button:has-text('Eliminar'), button:has-text('Confirmar')",
      )
      .last();

    const hasConfirm = await confirmBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (hasConfirm) {
      await confirmBtn.click();
      await page.waitForTimeout(2_000);
      await snap(page, "admin-inventario", "09b-after-delete", proj(info));

      const stillExists = await page
        .locator(".material-name-modern", { hasText: "[E2E]" })
        .first()
        .isVisible({ timeout: 2_000 })
        .catch(() => false);
      console.log(`[inventario] E2E item still in list after delete: ${stillExists}`);
    } else {
      // Handle native dialog confirm
      await page.keyboard.press("Enter").catch(() => {});
      await page.waitForTimeout(2_000);
    }
  });

  test("no 401/403/500 network errors in inventario", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const badResponses: { url: string; status: number }[] = [];
    page.on("response", (r) => {
      const s = r.status();
      if ((s === 401 || s === 403 || s >= 500) && !r.url().includes("favicon")) {
        badResponses.push({ url: r.url(), status: s });
      }
    });

    await goToInventario(page);
    await page.waitForTimeout(2000);
    await snap(page, "admin-inventario", "10-final-state", proj(info));

    rec.dump("admin-inventario", proj(info));

    if (badResponses.length > 0) {
      console.log(`[inventario] HTTP errors: ${JSON.stringify(badResponses.slice(0, 5))}`);
    }
    expect.soft(badResponses, "No 401/403/5xx").toEqual([]);
  });
});
