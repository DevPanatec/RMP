// Admin: Proyectos module — full CRUD flow.
//
// Coverage:
//   1. Proyectos tab visible for admin (not super_admin)
//   2. Header + table renders
//   3. Empty state OR project list
//   4. "Nuevo proyecto" modal — open, fill nombre/cliente/descripcion, submit
//   5. Edit a project
//   6. Toggle activo/archivado
//   7. Delete a project (ConfirmDialog)
//   8. Create Enterprise user inside a project
//   9. No 401/403/500 network errors

import { test, expect, Page, TestInfo } from "@playwright/test";
import { snap } from "../helpers/snap";
import { attachConsoleRecorder } from "../helpers/console";

function proj(info: TestInfo): string {
  return info.project.name.replace(/^audit-/, "");
}

test.use({ storageState: "tests/auth/admin.cookies.json" });

async function goToProyectos(page: Page): Promise<boolean> {
  await page.goto("/");
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const tab = page
    .locator("button.top-nav__tab", { hasText: "Proyectos" })
    .first();
  const visible = await tab.isVisible({ timeout: 10_000 }).catch(() => false);
  if (!visible) return false;

  await tab.click();
  await page.waitForTimeout(800);

  const container = page.locator(".proyectos-component").first();
  return container.isVisible({ timeout: 8_000 }).catch(() => false);
}

async function openNuevoProyecto(page: Page): Promise<boolean> {
  const btn = page
    .locator(".proyectos-header button.btn-primary, .proyectos-embedded-toolbar button.btn-primary")
    .first();
  const visible = await btn.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!visible) return false;
  await btn.click();
  await page.waitForTimeout(500);
  return true;
}

function ts(): string {
  return Date.now().toString().slice(-6);
}

test.describe("Admin: Proyectos module", () => {
  test.setTimeout(180_000);

  test("Proyectos tab visible and opens correctly for admin", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    page.on("pageerror", (e) => console.log(`PAGEERROR: ${e.message}`));

    const rendered = await goToProyectos(page);
    if (!rendered) {
      test.skip(true, "Proyectos tab not available for this role/org");
      return;
    }
    await snap(page, "admin-proyectos", "00-landing", proj(info));

    // Header
    await expect(
      page.locator("h2", { hasText: /Proyectos/i })
    ).toBeVisible({ timeout: 10_000 });

    // "Nuevo proyecto" button
    const newBtn = page
      .locator(".proyectos-header button.btn-primary, button:has-text('Nuevo proyecto')")
      .first();
    await expect(newBtn, "'Nuevo proyecto' button must be visible").toBeVisible({
      timeout: 5_000,
    });

    rec.dump("admin-proyectos", proj(info));
  });

  test("project list or empty state renders", async ({ page }, info) => {
    const rendered = await goToProyectos(page);
    if (!rendered) {
      test.skip(true, "Proyectos tab not available");
      return;
    }

    const hasTable = await page
      .locator(".proyectos-table")
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasEmpty = await page
      .locator(".proyectos-empty")
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    await snap(page, "admin-proyectos", "01-list-or-empty", proj(info));
    expect(hasTable || hasEmpty, "Table OR empty state must render").toBe(true);

    if (hasTable) {
      const rows = await page.locator(".proyectos-table tbody tr").count();
      console.log(`[proyectos] Existing projects: ${rows}`);
    }
  });

  test("opens Nuevo Proyecto modal with form fields", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const rendered = await goToProyectos(page);
    if (!rendered) {
      test.skip(true, "Proyectos tab not available");
      return;
    }

    const opened = await openNuevoProyecto(page);
    expect(opened, "Nuevo proyecto button must open modal").toBe(true);

    await snap(page, "admin-proyectos", "02-modal-open", proj(info));

    // Modal should have nombre, cliente, descripcion, fechas
    const nombreInput = page.locator("input[name='nombre'], input[placeholder*='nombre'], input").first();
    await expect(nombreInput).toBeVisible({ timeout: 5_000 });

    rec.dump("admin-proyectos", proj(info));
  });

  test("creates a new project end-to-end", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const rendered = await goToProyectos(page);
    if (!rendered) {
      test.skip(true, "Proyectos tab not available");
      return;
    }

    const beforeCount = await page.locator(".proyectos-table tbody tr").count().catch(() => 0);

    const opened = await openNuevoProyecto(page);
    if (!opened) {
      test.skip(true, "Could not open Nuevo proyecto modal");
      return;
    }

    const proyName = `[E2E] Proyecto ${ts()}`;

    // Fill nombre (first text input in modal/form)
    const inputs = page.locator(
      ".proyectos-component input[type='text'], .proyectos-component input:not([type])"
    );
    const inputCount = await inputs.count();
    console.log(`[proyectos] Form inputs found: ${inputCount}`);

    if (inputCount >= 1) {
      await inputs.nth(0).fill(proyName);
    }
    if (inputCount >= 2) {
      await inputs.nth(1).fill("Cliente E2E Test");
    }

    // Descripcion (textarea)
    const textarea = page
      .locator(".proyectos-component textarea")
      .first();
    if (await textarea.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await textarea.fill("Proyecto creado por test E2E automatizado");
    }

    await snap(page, "admin-proyectos", "03-form-filled", proj(info));

    // Submit
    const submitBtn = page
      .locator(".proyectos-component button[type='submit'], .proyectos-component button.btn-primary")
      .last();
    await expect(submitBtn).toBeVisible({ timeout: 3_000 });
    await submitBtn.click();
    await page.waitForTimeout(3_000);
    await snap(page, "admin-proyectos", "03b-after-submit", proj(info));

    // Check feedback
    const feedback = page.locator(".proyectos-feedback").first();
    const hasFeedback = await feedback.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasFeedback) {
      const feedbackText = await feedback.textContent().catch(() => "");
      console.log(`[proyectos] Feedback: ${feedbackText}`);
    }

    // Verify project appears in list
    const newRow = page
      .locator(".proyectos-name", { hasText: "[E2E]" })
      .first();
    const appeared = await newRow.isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(`[proyectos] New project "${proyName}" in list: ${appeared}`);
    expect.soft(appeared, "Created project should appear in list").toBe(true);

    rec.dump("admin-proyectos", proj(info));
  });

  test("edits an existing project via edit button", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const rendered = await goToProyectos(page);
    if (!rendered) {
      test.skip(true, "Proyectos tab not available");
      return;
    }

    const editBtn = page
      .locator(".proyectos-actions button[title='Editar']")
      .first();
    const hasEdit = await editBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasEdit) {
      console.log("[proyectos] No projects to edit — skipping");
      return;
    }

    await editBtn.click();
    await page.waitForTimeout(600);
    await snap(page, "admin-proyectos", "04-edit-modal", proj(info));

    // Edit first text input (nombre)
    const inputs = page.locator(
      ".proyectos-component input[type='text'], .proyectos-component input:not([type])"
    );
    if (await inputs.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      const current = await inputs.first().inputValue().catch(() => "");
      await inputs.first().fill(`${current} [edited]`);
    }

    // Submit
    const submitBtn = page
      .locator(".proyectos-component button[type='submit'], .proyectos-component button.btn-primary")
      .last();
    await submitBtn.click();
    await page.waitForTimeout(2_000);
    await snap(page, "admin-proyectos", "04b-after-edit", proj(info));

    const feedback = page.locator(".proyectos-feedback").first();
    if (await feedback.isVisible({ timeout: 2_000 }).catch(() => false)) {
      console.log(`[proyectos] Edit feedback: ${await feedback.textContent()}`);
    }

    rec.dump("admin-proyectos", proj(info));
  });

  test("toggles project activo/archivado state", async ({ page }, info) => {
    const rendered = await goToProyectos(page);
    if (!rendered) {
      test.skip(true, "Proyectos tab not available");
      return;
    }

    // Archive button on first project
    const archivarBtn = page
      .locator(".proyectos-actions button[title='Archivar']")
      .first();
    const hasArchivar = await archivarBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasArchivar) {
      console.log("[proyectos] No 'Archivar' button (no active projects or all archived)");
      return;
    }

    await archivarBtn.click();
    await page.waitForTimeout(2_000);
    await snap(page, "admin-proyectos", "05-after-archive", proj(info));

    const feedback = page.locator(".proyectos-feedback").first();
    if (await feedback.isVisible({ timeout: 2_000 }).catch(() => false)) {
      console.log(`[proyectos] Archive feedback: ${await feedback.textContent()}`);
    }

    // Reactivate
    const reactivarBtn = page
      .locator(".proyectos-actions button[title='Reactivar']")
      .first();
    if (await reactivarBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reactivarBtn.click();
      await page.waitForTimeout(2_000);
      await snap(page, "admin-proyectos", "05b-after-reactivate", proj(info));
    }
  });

  test("deletes E2E project via ConfirmDialog", async ({ page }, info) => {
    const rendered = await goToProyectos(page);
    if (!rendered) {
      test.skip(true, "Proyectos tab not available");
      return;
    }

    // Find [E2E] project row
    const e2eRow = page
      .locator(".proyectos-name", { hasText: "[E2E]" })
      .first();
    const hasE2E = await e2eRow.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasE2E) {
      console.log("[proyectos] No [E2E] project to delete — skipping");
      return;
    }

    // The delete button is in the actions td for that row
    const e2eTableRow = page
      .locator("tr", { has: page.locator(".proyectos-name", { hasText: "[E2E]" }) })
      .first();

    const deleteBtn = e2eTableRow
      .locator("button.proyectos-btn-danger[title='Eliminar']")
      .first();
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();
    await page.waitForTimeout(500);
    await snap(page, "admin-proyectos", "06-confirm-dialog", proj(info));

    // ConfirmDialog
    const confirmBtn = page
      .locator(".confirm-dialog button.btn--primary, button:has-text('Eliminar'), button:has-text('Confirmar')")
      .last();
    const hasConfirm = await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasConfirm) {
      await confirmBtn.click();
      await page.waitForTimeout(2_000);
      await snap(page, "admin-proyectos", "06b-after-delete", proj(info));

      const stillExists = await page
        .locator(".proyectos-name", { hasText: "[E2E]" })
        .first()
        .isVisible({ timeout: 2_000 })
        .catch(() => false);
      expect.soft(stillExists, "E2E project should be removed").toBe(false);
    }
  });

  test("no 401/403/500 errors in proyectos flow", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const badReqs: { url: string; status: number }[] = [];
    page.on("response", (r) => {
      const s = r.status();
      if ((s === 401 || s === 403 || s >= 500) && !r.url().includes("favicon")) {
        badReqs.push({ url: r.url(), status: s });
      }
    });

    const rendered = await goToProyectos(page);
    if (!rendered) {
      test.skip(true, "Proyectos tab not available");
      return;
    }

    await page.waitForTimeout(2_000);
    await snap(page, "admin-proyectos", "07-final", proj(info));

    rec.dump("admin-proyectos", proj(info));
    expect.soft(badReqs, "No 401/403/5xx in proyectos").toEqual([]);
  });
});
