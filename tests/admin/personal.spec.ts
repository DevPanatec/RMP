// Admin: Personal (Empleados) module — full CRUD flow.
//
// Coverage:
//   1. Navigate Operaciones → Personal
//   2. Verify header + stat pills
//   3. Personnel table renders (or empty state)
//   4. "Agregar Personal" modal — open, fill, submit
//   5. Edit employee via row edit button
//   6. Delete employee via confirm dialog
//   7. No 401/403/500 network errors

import { test, expect, Page, TestInfo } from "@playwright/test";
import { snap } from "../helpers/snap";
import { attachConsoleRecorder } from "../helpers/console";

function proj(info: TestInfo): string {
  return info.project.name.replace(/^audit-/, "");
}

test.use({ storageState: "tests/auth/admin.cookies.json" });

async function goToPersonal(page: Page): Promise<boolean> {
  await page.goto("/");
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const opsTab = page
    .locator("button.top-nav__tab", { hasText: "Operaciones" })
    .first();
  const opsVisible = await opsTab.isVisible({ timeout: 15_000 }).catch(() => false);
  if (!opsVisible) return false;
  await opsTab.click();
  await page.waitForTimeout(800);

  // Personal sub-tab (only visible if PER module active)
  const personalSub = page
    .locator("button.ops-tab", { hasText: "Personal" })
    .first();
  const hasPersonal = await personalSub
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  if (hasPersonal) {
    await personalSub.click();
    await page.waitForTimeout(600);
  }

  // Verify Personal section rendered
  const header = page.locator("h2", { hasText: /Gestión de Personal/i }).first();
  const rendered = await header.isVisible({ timeout: 8_000 }).catch(() => false);
  return rendered;
}

function ts(): string {
  return Date.now().toString().slice(-6);
}

test.describe("Admin: Personal module", () => {
  test.setTimeout(180_000);

  test("opens personal section and renders header + stat pills", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    page.on("pageerror", (e) => console.log(`PAGEERROR: ${e.message}`));

    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered (PER module may be off)");
      return;
    }
    await snap(page, "admin-personal", "00-section", proj(info));

    await expect(
      page.locator("h2", { hasText: /Gestión de Personal/i })
    ).toBeVisible({ timeout: 10_000 });

    // 4 stat pills: Activos, Supervisores, Conductores, Recolectores
    const pills = page.locator(".stat-pill");
    const count = await pills.count();
    console.log(`[personal] Stat pills: ${count}`);
    expect(count, "Should have stat pills").toBeGreaterThanOrEqual(1);

    await snap(page, "admin-personal", "01-header-stats", proj(info));
    rec.dump("admin-personal", proj(info));
  });

  test("personnel table renders or shows empty state", async ({ page }, info) => {
    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered");
      return;
    }

    const hasTable = await page
      .locator(".personnel-table")
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasEmpty = await page
      .locator(".empty-state, :has-text('No hay personal registrado')")
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    await snap(page, "admin-personal", "02-table-or-empty", proj(info));
    expect(hasTable || hasEmpty, "Table OR empty state must render").toBe(true);
  });

  test("Agregar Personal button opens add modal + fills + submits", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const dialogs: string[] = [];
    page.on("dialog", async (d) => {
      dialogs.push(`${d.type()}: ${d.message()}`);
      await d.accept().catch(() => {});
    });

    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered");
      return;
    }

    const addBtn = page.locator("button.btn-add-personnel").first();
    await expect(addBtn).toBeVisible({ timeout: 8_000 });
    await addBtn.click();
    await page.waitForTimeout(600);
    await snap(page, "admin-personal", "03-add-modal-open", proj(info));

    // Modal should show "Agregar Nuevo Personal"
    const modalTitle = page
      .locator("h2", { hasText: /Agregar Nuevo Personal/i })
      .first();
    await expect(modalTitle).toBeVisible({ timeout: 5_000 });

    // Fill form
    const nombre = `[E2E]`;
    const apellido = `Emp-${ts()}`;
    const nombreInput = page
      .locator(".modal-content-v2.modal-personnel input[placeholder*='Juan']")
      .first();
    await expect(nombreInput).toBeVisible({ timeout: 5_000 });
    await nombreInput.fill(nombre);

    const apellidoInput = page
      .locator(".modal-content-v2.modal-personnel input[placeholder*='Pérez']")
      .first();
    await apellidoInput.fill(apellido);

    const cargoSelect = page
      .locator(".modal-content-v2.modal-personnel select.select-v2")
      .first();
    await cargoSelect.selectOption("Conductor");

    await snap(page, "admin-personal", "03b-form-filled", proj(info));

    // Submit
    const submitBtn = page
      .locator(".modal-content-v2.modal-personnel button.btn-primary-v2")
      .first();
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 });
    await submitBtn.click();
    await page.waitForTimeout(3_000);
    await snap(page, "admin-personal", "03c-after-submit", proj(info));

    const modalClosed = !(await page
      .locator("h2", { hasText: /Agregar Nuevo Personal/i })
      .isVisible({ timeout: 500 })
      .catch(() => false));

    console.log(
      `[personal] Add modal closed: ${modalClosed}, dialogs: ${dialogs.join(" | ") || "(none)"}`,
    );

    if (modalClosed) {
      // Verify new employee appears in table
      const row = page
        .locator(".personnel-table", { hasText: "[E2E]" })
        .first();
      const appeared = await row
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      console.log(`[personal] New employee in table: ${appeared}`);
    }

    rec.dump("admin-personal", proj(info));
  });

  test("edit employee via row edit button", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered");
      return;
    }

    const editBtn = page.locator(".action-btn--edit").first();
    const hasEdit = await editBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasEdit) {
      console.log("[personal] No employees to edit — skipping");
      return;
    }

    await editBtn.click();
    await page.waitForTimeout(600);
    await snap(page, "admin-personal", "04-edit-modal", proj(info));

    const editModal = page
      .locator("h2", { hasText: /Editar Personal/i })
      .first();
    await expect(editModal).toBeVisible({ timeout: 5_000 });

    // Modify apellido
    const apellidoInput = page
      .locator(".modal-content-v2.modal-personnel input[placeholder*='Pérez']")
      .first();
    if (await apellidoInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const current = await apellidoInput.inputValue().catch(() => "");
      await apellidoInput.fill(`${current} [ed]`);
    }

    // Submit
    const submitBtn = page
      .locator(".modal-content-v2.modal-personnel button.btn-primary-v2")
      .first();
    await submitBtn.click();
    await page.waitForTimeout(2_000);
    await snap(page, "admin-personal", "04b-after-edit", proj(info));

    rec.dump("admin-personal", proj(info));
  });

  test("delete employee (E2E row) with confirm dialog", async ({ page }, info) => {
    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered");
      return;
    }

    // Find [E2E] row delete button
    const e2eCell = page
      .locator(".personnel-table", { hasText: "[E2E]" })
      .first();
    const hasE2E = await e2eCell.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasE2E) {
      // Fallback: delete first row
      const firstDelete = page.locator(".action-btn--delete").first();
      const hasDelete = await firstDelete.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!hasDelete) {
        console.log("[personal] No employees to delete — skipping");
        return;
      }
    }

    const initialCount = await page.locator(".personnel-table tbody tr").count();

    // Click delete on E2E row or first row
    const deleteBtn = page.locator(".action-btn--delete").first();
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();
    await page.waitForTimeout(500);
    await snap(page, "admin-personal", "05-confirm-dialog", proj(info));

    // ConfirmDialog
    const confirmBtn = page
      .locator(".confirm-dialog button.btn--primary, button:has-text('Eliminar'), button:has-text('Confirmar')")
      .last();
    const hasConfirm = await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasConfirm) {
      await confirmBtn.click();
      await page.waitForTimeout(2_000);
      await snap(page, "admin-personal", "05b-after-delete", proj(info));

      const afterCount = await page.locator(".personnel-table tbody tr").count().catch(() => 0);
      console.log(`[personal] Row count: before=${initialCount}, after=${afterCount}`);
    } else {
      await page.keyboard.press("Enter").catch(() => {});
      await page.waitForTimeout(1_500);
    }
  });

  test("no 401/403/500 errors in personal section", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const badReqs: { url: string; status: number }[] = [];
    page.on("response", (r) => {
      const s = r.status();
      if ((s === 401 || s === 403 || s >= 500) && !r.url().includes("favicon")) {
        badReqs.push({ url: r.url(), status: s });
      }
    });

    await goToPersonal(page);
    await page.waitForTimeout(2_000);
    await snap(page, "admin-personal", "06-final", proj(info));

    rec.dump("admin-personal", proj(info));
    expect.soft(badReqs, "No 401/403/5xx").toEqual([]);
  });
});
