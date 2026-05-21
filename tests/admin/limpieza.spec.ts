// Admin: Limpieza (Cleaning) module — full button/flow audit.
//
// The cleaning module is split across THREE entry points in the admin dash:
//   1. Operaciones → Catálogo → Limpieza tab    (CRUD salas via UbicacionesComponent)
//   2. Operaciones → Asignaciones → Limpieza    (programar tareas de limpieza)
//   3. Reportes → Limpieza                      (ver reportes históricos)
//
// We exercise every visible admin button and dump console + network for triage.

import { test, expect, Page } from "@playwright/test";
import { attachConsoleRecorder } from "../helpers/console";
import { snap } from "../helpers/snap";
import fs from "node:fs";
import path from "node:path";

test.use({ storageState: "tests/auth/admin.cookies.json" });

const tinyPng = (): Buffer =>
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );

async function gotoAdminHome(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

// Admin defaults to "Todos los proyectos" (null) — many CRUD flows require
// a specific project selected. Pick the first available one.
async function selectFirstProject(page: Page) {
  const select = page.locator("#project-switcher-select").first();
  if (!(await select.isVisible({ timeout: 3_000 }).catch(() => false))) return;
  const options = await select.locator("option").all();
  // option[0] = "Todos los proyectos" (value=""), pick option[1] if exists
  for (const opt of options) {
    const v = await opt.getAttribute("value");
    if (v && v !== "") {
      await select.selectOption(v);
      await page.waitForTimeout(1000);
      return;
    }
  }
}

async function openOperacionesCatalogoLimpieza(page: Page) {
  // Top-nav: Operaciones
  const opsTab = page
    .locator(".top-nav__tab:has-text('Operaciones')")
    .first();
  const opsVisible = await opsTab.isVisible({ timeout: 25_000 }).catch(() => false);
  if (!opsVisible) {
    test.skip(true, "Operaciones tab not visible — module off or env degraded");
    return;
  }
  await opsTab.click();
  await page.waitForTimeout(800);

  // Sub-tab: Catálogo (formerly "servicios")
  const catTab = page.locator(".ops-tab:has-text('Catálogo')").first();
  await expect(catTab).toBeVisible({ timeout: 10_000 });
  await catTab.click();
  await page.waitForTimeout(800);

  // ServiciosComponent inner tab: Limpieza
  const limpiezaTab = page.locator(".servicios-tab:has-text('Limpieza')").first();
  await expect(limpiezaTab).toBeVisible({ timeout: 10_000 });
  await limpiezaTab.click();
  await page.waitForTimeout(800);
}

async function openOperacionesAsignacionesLimpieza(page: Page) {
  const opsTab = page.locator(".top-nav__tab:has-text('Operaciones')").first();
  const opsVisible2 = await opsTab.isVisible({ timeout: 25_000 }).catch(() => false);
  if (!opsVisible2) {
    test.skip(true, "Operaciones tab not visible — module off or env degraded");
    return;
  }
  await opsTab.click();
  await page.waitForTimeout(600);

  const asignacionesTab = page.locator(".ops-tab:has-text('Asignaciones')").first();
  await expect(asignacionesTab).toBeVisible({ timeout: 10_000 });
  await asignacionesTab.click();
  await page.waitForTimeout(1000);

  // Schedule component has unified tab "Limpieza"
  const limpiezaScheduleTab = page
    .locator(".tab-unified:has-text('Limpieza')")
    .first();
  // Tab may not exist if user lacks canWrite — but admin has it.
  if (await limpiezaScheduleTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await limpiezaScheduleTab.click();
    await page.waitForTimeout(500);
  }
}

test.describe("Admin: Limpieza module", () => {
  test.setTimeout(120_000);

  test("admin: opens cleaning catalog (salas) and renders", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    await gotoAdminHome(page);
    await snap(page, "admin-limpieza", "00-landing", "headless");

    await openOperacionesCatalogoLimpieza(page);
    await snap(page, "admin-limpieza", "01-catalogo-limpieza", "headless");

    // Either the table OR the empty state must be present.
    const hasTable = await page
      .locator(".ubic-table")
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasEmpty = await page
      .locator(".ubic-empty")
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(hasTable || hasEmpty, "salas list or empty-state must render").toBe(true);

    // "Nueva" button is the primary admin CRUD entry-point.
    const novaBtn = page.locator("button:has-text('Nueva')").first();
    await expect(novaBtn).toBeVisible({ timeout: 8_000 });

    const errors = recorder.events.filter(
      (e) =>
        e.type === "pageerror" ||
        (e.type === "console" && e.level === "error" && !e.text.includes("favicon")),
    );
    recorder.dump("admin-limpieza", "headless");
    expect(errors.length, `console/page errors: ${errors.map((e) => e.text.slice(0, 80)).join(" | ")}`).toBeLessThanOrEqual(2);
  });

  test("admin: creates a new sala (cleaning location)", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);

    // Auto-dismiss alert/confirm dialogs (e.g. "Necesitas seleccionar un proyecto")
    const dialogs: string[] = [];
    page.on("dialog", async (d) => {
      dialogs.push(`${d.type()}: ${d.message()}`);
      await d.dismiss().catch(() => {});
    });

    await gotoAdminHome(page);
    await selectFirstProject(page);
    await openOperacionesCatalogoLimpieza(page);

    const novaBtn = page.locator("button:has-text('Nueva')").first();
    await expect(novaBtn).toBeVisible({ timeout: 8_000 });
    await novaBtn.click();
    await page.waitForTimeout(600);
    await snap(page, "admin-limpieza", "02a-modal-open", "headless");

    // Modal must render the title-bar with "Nueva Sala"
    const modalTitle = page.locator("[id='ubicacion-modal-title']").first();
    await expect(modalTitle).toBeVisible({ timeout: 5_000 });

    const nombreInput = page.locator(".ubic-input").first();
    await expect(nombreInput).toBeVisible({ timeout: 5_000 });
    const testName = `[E2E] Sala Test ${Date.now()}`;
    await nombreInput.fill(testName);

    // Optional descripcion
    const descTextarea = page.locator(".ubic-textarea").first();
    if (await descTextarea.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await descTextarea.fill("Sala creada por test E2E admin limpieza");
    }

    // Submit
    const crearBtn = page
      .locator(".ubic-modal-actions button.btn--primary, button:has-text('Crear')")
      .first();
    await expect(crearBtn).toBeEnabled({ timeout: 3_000 });
    await crearBtn.click();
    // Wait longer to allow Convex round-trip + react re-render
    await page.waitForTimeout(5000);
    await snap(page, "admin-limpieza", "02b-after-create", "headless");

    // Diagnostic: did any dialog fire?
    if (dialogs.length > 0) {
      console.log(`[create-sala] dialogs fired: ${dialogs.join(" | ")}`);
    }

    // Detect modal state: closed = success, still open = mutation failed
    const modalStillOpen = await page
      .locator("[id='ubicacion-modal-title']")
      .isVisible({ timeout: 500 })
      .catch(() => false);

    if (modalStillOpen) {
      console.log("[create-sala] BUG: modal still open after Crear click — mutation likely failed");
      console.log(`[create-sala] dialogs: ${dialogs.join(" | ") || "(none)"}`);
      // Force close to leave clean state
      await page.locator(".modal-close, button:has-text('Cancelar')").first().click().catch(() => {});
    }

    // Verify it appears in the table
    const row = page.locator(`.ubic-cell-name:has-text('${testName.slice(0, 25)}')`).first();
    const appeared = await row.isVisible({ timeout: 5_000 }).catch(() => false);
    expect(appeared, `created sala "${testName}" must appear in list (modalStillOpen=${modalStillOpen}, dialogs=${dialogs.join("|") || "none"})`).toBe(true);

    recorder.dump("admin-limpieza", "headless");
  });

  test("admin: edits a sala via row edit button", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    await gotoAdminHome(page);
    await selectFirstProject(page);
    await openOperacionesCatalogoLimpieza(page);

    // Edit the FIRST row's edit btn (any sala created above OR existing)
    const editBtn = page.locator(".ubic-action-edit").first();
    const hasAny = await editBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasAny) {
      test.skip(true, "No salas exist to edit — skipping");
      return;
    }
    await editBtn.click();
    await page.waitForTimeout(600);
    await snap(page, "admin-limpieza", "03a-edit-modal", "headless");

    const nombreInput = page.locator(".ubic-input").first();
    await expect(nombreInput).toBeVisible({ timeout: 5_000 });
    const current = await nombreInput.inputValue();
    await nombreInput.fill(current + " [edited]");

    const updateBtn = page
      .locator("button:has-text('Actualizar')")
      .first();
    await expect(updateBtn).toBeEnabled({ timeout: 3_000 });
    await updateBtn.click();
    await page.waitForTimeout(2000);
    await snap(page, "admin-limpieza", "03b-after-edit", "headless");

    const edited = page.locator(".ubic-cell-name:has-text('[edited]')").first();
    const found = await edited.isVisible({ timeout: 5_000 }).catch(() => false);
    expect(found, "edited sala should appear with [edited] suffix").toBe(true);

    recorder.dump("admin-limpieza", "headless");
  });

  test("admin: deletes a sala via row delete button + confirm dialog", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    await gotoAdminHome(page);
    await selectFirstProject(page);
    await openOperacionesCatalogoLimpieza(page);

    // Find row with our E2E marker to safely delete
    const e2eRow = page.locator(".ubic-cell-name:has-text('[E2E]')").first();
    const hasE2E = await e2eRow.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasE2E) {
      // Fallback: delete first available row (still soft-deletable per code)
      const firstRow = page.locator(".ubic-table tbody tr").first();
      const hasAny = await firstRow.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!hasAny) {
        test.skip(true, "No salas exist to delete — skipping");
        return;
      }
    }

    const deleteBtn = page.locator(".ubic-action-delete").first();
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });
    await deleteBtn.click();
    await page.waitForTimeout(600);
    await snap(page, "admin-limpieza", "04a-confirm-dialog", "headless");

    // Confirm dialog
    const confirmBtn = page
      .locator(".confirm-dialog button.btn--primary, button:has-text('Eliminar')")
      .last();
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();
    await page.waitForTimeout(2000);
    await snap(page, "admin-limpieza", "04b-after-delete", "headless");

    recorder.dump("admin-limpieza", "headless");
  });

  test("admin: opens cleaning assignments view (programación → limpieza)", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    await gotoAdminHome(page);
    await selectFirstProject(page);
    await openOperacionesAsignacionesLimpieza(page);
    await snap(page, "admin-limpieza", "05-asignaciones-limpieza", "headless");

    // Either header "Nueva Asignación" empty action, OR list table must be present.
    const hasEmpty = await page
      .locator(".empty-state, :text('No hay tareas de limpieza programadas')")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasTable = await page
      .locator(".assignments-table")
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    const hasNuevaBtn = await page
      .locator("button:has-text('Nueva Asignación'), button.btn-add-v2:has-text('Limpieza')")
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasEmpty || hasTable || hasNuevaBtn, "limpieza assignments view must render something").toBe(true);

    recorder.dump("admin-limpieza", "headless");
  });

  test("admin: opens cleaning assignment modal from schedule (button works)", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    await gotoAdminHome(page);
    await selectFirstProject(page);
    await openOperacionesAsignacionesLimpieza(page);

    // The "+ Limpieza" header button OR the empty-state "Nueva Asignación" both open the modal.
    const headerLimpiezaBtn = page
      .locator(".schedule-header-actions button:has-text('Limpieza')")
      .first();
    const emptyNuevaBtn = page.locator("button:has-text('Nueva Asignación')").first();

    let opened = false;
    if (await headerLimpiezaBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await headerLimpiezaBtn.click();
      opened = true;
    } else if (await emptyNuevaBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emptyNuevaBtn.click();
      opened = true;
    }
    expect(opened, "should be able to open cleaning assignment modal").toBe(true);
    await page.waitForTimeout(800);
    await snap(page, "admin-limpieza", "06a-assignment-modal", "headless");

    // Modal must render with cleaning fields
    const modalTitle = page
      .locator(":text('Nueva Asignación de Limpieza'), .modal-title:has-text('Limpieza')")
      .first();
    await expect(modalTitle).toBeVisible({ timeout: 5_000 });

    // Cancelar to close
    const cancelarBtn = page.locator(".modal-footer button:has-text('Cancelar'), button.btn--outline:has-text('Cancelar')").first();
    await expect(cancelarBtn).toBeVisible({ timeout: 3_000 });
    await cancelarBtn.click();
    await page.waitForTimeout(500);
    await snap(page, "admin-limpieza", "06b-modal-closed", "headless");

    recorder.dump("admin-limpieza", "headless");
  });

  test("admin: navigates to Reportes → Limpieza tab", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    await gotoAdminHome(page);

    const reportesTab = page.locator(".top-nav__tab:has-text('Reportes')").first();
    const hasReportes = await reportesTab.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasReportes) {
      test.skip(true, "Reportes tab not available (BI module off)");
      return;
    }
    await reportesTab.click();
    await page.waitForTimeout(1500);

    const limpiezaCat = page
      .locator("button:has-text('Limpieza'), .reports-category-tab:has-text('Limpieza')")
      .first();
    if (await limpiezaCat.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await limpiezaCat.click();
      await page.waitForTimeout(1000);
    }
    await snap(page, "admin-limpieza", "07-reportes-limpieza", "headless");

    // Console error sweep — capture any 401/403/500 network failures
    const failed = recorder.events.filter(
      (e) =>
        e.type === "requestfailed" ||
        (e.type === "pageerror") ||
        (e.type === "console" &&
          e.level === "error" &&
          !e.text.includes("favicon") &&
          !e.text.includes("ResizeObserver")),
    );
    recorder.dump("admin-limpieza", "headless");
    expect(failed.length, `errors in reportes-limpieza: ${failed.slice(0, 5).map((e) => e.text.slice(0, 80)).join(" || ")}`).toBeLessThanOrEqual(3);
  });

  test("admin: BUG — Crear sala without project triggers alert (UX issue)", async ({ page }) => {
    // This documents a UX bug: when admin has "Todos los proyectos" selected,
    // the "Nueva" button is enabled but submitting the form fires an alert.
    // Better UX: disable Nueva button or auto-select first project.
    const dialogs: string[] = [];
    page.on("dialog", async (d) => {
      dialogs.push(`${d.type()}: ${d.message()}`);
      await d.dismiss().catch(() => {});
    });

    await gotoAdminHome(page);
    // Explicitly DO NOT select a project; ensure switcher is on "Todos"
    const switcher = page.locator("#project-switcher-select").first();
    if (await switcher.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await switcher.selectOption("");
      await page.waitForTimeout(500);
    }

    await openOperacionesCatalogoLimpieza(page);
    const novaBtn = page.locator("button:has-text('Nueva')").first();
    if (!(await novaBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Nueva button not visible — module probably gated off");
      return;
    }
    await novaBtn.click();
    await page.waitForTimeout(600);

    const nombreInput = page.locator(".ubic-input").first();
    if (!(await nombreInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "Modal didn't open — pre-condition broken");
      return;
    }
    await nombreInput.fill(`[E2E-BUG] no-project ${Date.now()}`);
    const crearBtn = page.locator(".ubic-modal-actions button.btn--primary").first();
    await crearBtn.click();
    await page.waitForTimeout(2000);
    await snap(page, "admin-limpieza", "09-bug-no-project-alert", "headless");

    // Document the bug — but do NOT fail the test; we WANT to record this happens.
    if (dialogs.some((d) => d.includes("seleccionar un proyecto"))) {
      console.log(`[BUG] confirmed: admin without project selected → alert: ${dialogs.join(" | ")}`);
    } else {
      console.log(`[BUG-CHECK] no project-required alert. dialogs=${dialogs.join("|") || "none"}`);
    }
  });

  test("admin: console + network sweep across all cleaning tabs", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    await gotoAdminHome(page);

    // Visit all three entry points sequentially, collecting errors.
    await openOperacionesCatalogoLimpieza(page);
    await page.waitForTimeout(800);
    await openOperacionesAsignacionesLimpieza(page);
    await page.waitForTimeout(800);

    const reportesTab = page.locator(".top-nav__tab:has-text('Reportes')").first();
    if (await reportesTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reportesTab.click();
      await page.waitForTimeout(1500);
    }
    await snap(page, "admin-limpieza", "08-sweep-end", "headless");

    // Check for 401/403/500
    const authOrServer = recorder.events.filter(
      (e) =>
        e.type === "requestfailed" &&
        (e.text.includes(" 401 ") ||
          e.text.includes(" 403 ") ||
          e.text.includes(" 500 ")),
    );
    expect(authOrServer.length, `network 401/403/500: ${authOrServer.map((e) => e.text.slice(0, 100)).join(" | ")}`).toBe(0);

    // Dump full events for triage
    const file = recorder.dump("admin-limpieza", "headless");
    const auditDir = path.dirname(file);
    const errSummary = recorder.events
      .filter(
        (e) =>
          e.type === "pageerror" ||
          (e.type === "console" && e.level === "error"),
      )
      .map((e) => `[${e.type}] ${e.text.slice(0, 200)}`)
      .join("\n");
    fs.writeFileSync(path.join(auditDir, "_errors.txt"), errSummary || "(no errors)");
  });
});
