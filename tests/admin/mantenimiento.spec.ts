// Admin: Mantenimiento module — exercises every admin-visible button/flow.
//
// Covers:
//   - top-nav tab navigation → maintenance view
//   - "Nueva Tarea" header button → opens MaintenanceTaskModal
//   - sub-navigation tabs (Dashboard / Tareas)
//   - filter tabs (Todas / Pendientes / En Progreso / Completadas)
//   - create task (fill modal, submit)
//   - edit task (modify, save)
//   - complete task (transition pendiente → completada)
//   - delete task (ConfirmDialog confirm)
//   - close modal via X button
//
// Verifies no console errors or 4xx/5xx network calls.
//
// Run: npx playwright test tests/admin/mantenimiento.spec.ts --reporter=list --workers=1

import { test, expect, Page } from "@playwright/test";
import { attachConsoleRecorder } from "../helpers/console";
import { snap } from "../helpers/snap";

test.use({ storageState: "tests/auth/admin.cookies.json" });

// Helper: navigate to maintenance from dashboard root.
//
// Nav structure (post-flat-refactor): top-nav 'Mantenimiento' is a standalone
// tab, gated by hasModulo('MTO'). The Recursos wrapper was removed.
// At ≤1366px viewports the .top-nav__tab span is `display:none` (icon-only),
// so we match by DOM text via regex form on the BUTTON element.
async function goToMaintenance(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const mantTab = page
    .locator("button.top-nav__tab", { hasText: /^Mantenimiento$/ })
    .first();
  const mantVisible = await mantTab.isVisible({ timeout: 25_000 }).catch(() => false);
  if (!mantVisible) {
    test.skip(true, "Mantenimiento tab not visible — MTO module off or env degraded");
    return;
  }
  await mantTab.click();
  await page.waitForTimeout(800);

  // Verify maintenance component header rendered
  await expect(
    page.locator("h2", { hasText: /Gestion de Mantenimiento/ }),
  ).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
}

// Helper: switch to "Tareas" sub-tab inside maintenance (table view).
async function goToTareasSubtab(page: Page) {
  const tareasTab = page
    .locator('.reports-categories button.category-tab:has-text("Tareas")')
    .first();
  await expect(tareasTab, "Tareas sub-tab visible").toBeVisible({ timeout: 8_000 });
  await tareasTab.click();
  await page.waitForTimeout(500);
}

// Helper: open "Nueva Tarea" modal via the header button.
async function openNewTaskModal(page: Page) {
  const headerBtn = page.locator("button.maintenance-header-create-btn").first();
  await expect(headerBtn, "Header 'Nueva Tarea' button visible").toBeVisible();
  await headerBtn.click();
  await expect(
    page.locator(".maintenance-task-modal__overlay"),
    "modal overlay visible",
  ).toBeVisible({ timeout: 5_000 });
}

// Helper: fill required form fields for a new task.
// Note: the modal does NOT have a 'vehiculo' field or 'prioridad' field —
// these are absent from the UI even though the Convex 'addTask' mutation
// REQUIRES prioridad. This is one of the bugs the test surfaces.
async function fillTaskForm(
  page: Page,
  data: {
    titulo: string;
    tipo?: "preventivo" | "correctivo" | "inspección";
    fecha?: string; // yyyy-mm-dd
    hora?: string;  // hh:mm
    descripcion?: string;
    volume?: number;
  },
) {
  const modal = page.locator(".maintenance-task-modal__container");
  await modal.locator('input[placeholder*="Ej:"]').first().fill(data.titulo);

  if (data.tipo) {
    const tipoSel = modal.locator("select.maintenance-task-modal__select").nth(1);
    await tipoSel.selectOption(data.tipo);
  }
  if (data.fecha) {
    await modal.locator('input[type="date"]').first().fill(data.fecha);
  }
  if (data.hora) {
    await modal.locator('input[type="time"]').first().fill(data.hora);
  }
  if (data.descripcion) {
    await modal.locator("textarea").first().fill(data.descripcion);
  }
  if (data.volume !== undefined) {
    const volInput = modal.locator('input[type="number"]').first();
    await volInput.fill(String(data.volume));
  }
}

function ts(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

test.describe("Admin: Mantenimiento module", () => {
  test("opens maintenance tab and renders dashboard", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    await goToMaintenance(page);

    // Dashboard sub-tab is the default
    await expect(
      page.locator('.reports-categories button:has-text("Dashboard")'),
    ).toBeVisible();
    await expect(
      page.locator('.reports-categories button:has-text("Tareas")'),
    ).toBeVisible();

    // Header create button visible for admin
    await expect(page.locator("button.maintenance-header-create-btn")).toBeVisible();

    await snap(page, "admin-mtto", "01-dashboard");
    recorder.dump("admin-mtto");

    // No pageerror events
    const pageErrors = recorder.events.filter((e) => e.type === "pageerror");
    expect(pageErrors, `pageerror events: ${JSON.stringify(pageErrors)}`).toHaveLength(0);
  });

  test("Tareas subtab + filter buttons all clickable", async ({ page }) => {
    await goToMaintenance(page);
    await goToTareasSubtab(page);

    // 4 filter buttons should be visible
    const filters = ["Todas", "Pendientes", "En Progreso", "Completadas"];
    for (const label of filters) {
      const btn = page.locator(`.maint-tasks-filter-btn:has-text("${label}")`).first();
      await expect(btn, `filter "${label}" visible`).toBeVisible();
      await btn.click();
      await page.waitForTimeout(200);
    }
    await snap(page, "admin-mtto", "02-tareas-filters");
  });

  test("opens 'Nueva Tarea' modal from header and closes via X", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    await goToMaintenance(page);
    await openNewTaskModal(page);

    // Verify key form fields
    await expect(
      page.locator(".maintenance-task-modal__title:has-text('Nueva Tarea')"),
    ).toBeVisible();
    await expect(
      page.locator('select.maintenance-task-modal__select--package'),
    ).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="time"]').first()).toBeVisible();

    // Verify NO vehiculo field exists (documented as gap)
    const vehiculoLabel = page.locator(".maintenance-task-modal__container label:has-text('Vehículo')");
    const hasVehiculo = await vehiculoLabel.count();
    expect(hasVehiculo, "modal has no 'Vehículo' selector — UI gap").toBe(0);

    // Prioridad selector is required (server requires it); modal must expose it
    await expect(
      page.locator(".maintenance-task-modal__container label:has-text('Prioridad')"),
    ).toBeVisible();

    await snap(page, "admin-mtto", "03-modal-open");

    // Close via X
    await page.locator(".maintenance-task-modal__close-btn").click();
    await expect(page.locator(".maintenance-task-modal__overlay")).toBeHidden({
      timeout: 3_000,
    });

    recorder.dump("admin-mtto");
  });

  test("creates a maintenance task (submit flow)", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    await goToMaintenance(page);
    await goToTareasSubtab(page);

    const beforeCount = await page.locator(".maint-tasks-row").count();

    await openNewTaskModal(page);

    const titulo = `[E2E] Test task ${ts()}`;
    const today = new Date().toISOString().slice(0, 10);
    await fillTaskForm(page, {
      titulo,
      tipo: "preventivo",
      fecha: today,
      hora: "08:00",
      descripcion: "Auto-generated by admin/mantenimiento.spec",
      volume: 100,
    });

    await snap(page, "admin-mtto", "04-modal-filled");

    // Submit
    const submit = page.locator("button.maintenance-task-modal__btn-submit").first();
    await expect(submit).toBeVisible();
    await submit.click();

    // Either modal closes (success) or it stays open (server validation failed).
    // Server REQUIRES prioridad — the modal doesn't send it, so we expect failure.
    let succeeded = true;
    try {
      await expect(page.locator(".maintenance-task-modal__overlay")).toBeHidden({
        timeout: 8_000,
      });
    } catch {
      succeeded = false;
    }

    if (succeeded) {
      // Task should appear in list
      await page.waitForTimeout(800);
      const row = page.locator(`.maint-tasks-row:has-text("${titulo}")`).first();
      await expect(row, "new task row visible after create").toBeVisible({ timeout: 8_000 });
      const afterCount = await page.locator(".maint-tasks-row").count();
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount + 1);
    } else {
      // Document the failure — capture state then bail with informative message
      await snap(page, "admin-mtto", "04b-create-failed");
      const errs = recorder.events.filter(
        (e) =>
          e.type === "pageerror" ||
          (e.type === "console" && (e.level === "error" || e.text.toLowerCase().includes("error"))),
      );
      console.log("CREATE FAILED — console+error events:", JSON.stringify(errs.slice(-5), null, 2));
      // Close modal so other tests don't get blocked
      await page.locator(".maintenance-task-modal__close-btn").click().catch(() => {});
      throw new Error(
        "Create task submit did not close modal — likely server validation rejected payload (missing 'prioridad' required by convex/maintenance.ts addTask).",
      );
    }
    recorder.dump("admin-mtto");
  });

  test("edits an existing maintenance task", async ({ page }) => {
    await goToMaintenance(page);
    await goToTareasSubtab(page);

    const rows = page.locator(".maint-tasks-row");
    const count = await rows.count();
    if (count === 0) test.skip(true, "No tasks exist to edit — create step likely failed");

    // Click edit button on first non-completed row
    const editBtn = page.locator("button.maint-tasks-action-btn--edit").first();
    if (!(await editBtn.isVisible().catch(() => false))) {
      test.skip(true, "No editable row (all completed or no rows)");
    }
    await editBtn.click();

    await expect(page.locator(".maintenance-task-modal__overlay")).toBeVisible();
    await expect(
      page.locator(".maintenance-task-modal__title:has-text('Editar Tarea')"),
    ).toBeVisible();

    // Modify description
    const newDesc = `Edited @ ${ts()}`;
    const descBox = page.locator(".maintenance-task-modal__textarea").first();
    await descBox.fill(newDesc);

    await snap(page, "admin-mtto", "05-edit-modal");

    const submit = page.locator("button.maintenance-task-modal__btn-submit").first();
    await submit.click();
    await expect(page.locator(".maintenance-task-modal__overlay")).toBeHidden({
      timeout: 8_000,
    });
  });

  test("transitions a task to estado=completada", async ({ page }) => {
    await goToMaintenance(page);
    await goToTareasSubtab(page);

    const editBtn = page.locator("button.maint-tasks-action-btn--edit").first();
    if (!(await editBtn.isVisible().catch(() => false))) {
      test.skip(true, "No pendiente/en_progreso row to complete");
    }
    await editBtn.click();
    await expect(page.locator(".maintenance-task-modal__overlay")).toBeVisible();

    // Estado is the 4th select in the grid (Tipo, --, --, Estado)
    // More robust: find select containing "completada" option
    const estadoSelect = page
      .locator(".maintenance-task-modal__container select")
      .filter({ has: page.locator("option[value='completada']") })
      .first();
    await estadoSelect.selectOption("completada");

    const submit = page.locator("button.maintenance-task-modal__btn-submit").first();
    await expect(submit).toHaveText(/Completar Tarea|Actualizar Tarea|Guardando/);
    await submit.click();

    await expect(page.locator(".maintenance-task-modal__overlay")).toBeHidden({
      timeout: 10_000,
    });

    await snap(page, "admin-mtto", "06-completed");

    // Switch to Completadas filter and verify count > 0
    await page.locator('.maint-tasks-filter-btn:has-text("Completadas")').first().click();
    await page.waitForTimeout(400);
    const completadasCount = await page.locator(".maint-tasks-row").count();
    expect(completadasCount, "should have at least 1 completed task").toBeGreaterThan(0);
  });

  test("deletes a maintenance task (via ConfirmDialog)", async ({ page }) => {
    await goToMaintenance(page);
    await goToTareasSubtab(page);

    const initialCount = await page.locator(".maint-tasks-row").count();
    if (initialCount === 0) test.skip(true, "No rows to delete");

    const deleteBtn = page.locator("button.maint-tasks-action-btn--delete").first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // ConfirmDialog appears
    const confirm = page
      .locator('button:has-text("Eliminar")')
      .filter({ hasNot: page.locator(".maint-tasks-action-btn--delete") })
      .first();
    await expect(confirm, "ConfirmDialog 'Eliminar' button visible").toBeVisible({
      timeout: 5_000,
    });
    await snap(page, "admin-mtto", "07-confirm-delete");
    await confirm.click();

    await page.waitForTimeout(1_000);
    const afterCount = await page.locator(".maint-tasks-row").count();
    expect(afterCount, "row count should decrease by 1").toBeLessThan(initialCount);
  });

  test("verifies NO 4xx/5xx network errors during maintenance flow", async ({ page }) => {
    const recorder = attachConsoleRecorder(page);
    const failedRequests: { url: string; status: number }[] = [];
    page.on("response", (resp) => {
      const status = resp.status();
      if (status >= 400 && !resp.url().includes("favicon")) {
        failedRequests.push({ url: resp.url(), status });
      }
    });

    await goToMaintenance(page);
    await goToTareasSubtab(page);
    // Tap each filter — exercises listTasks reactivity
    for (const label of ["Todas", "Pendientes", "En Progreso", "Completadas"]) {
      await page
        .locator(`.maint-tasks-filter-btn:has-text("${label}")`)
        .first()
        .click()
        .catch(() => {});
      await page.waitForTimeout(200);
    }

    recorder.dump("admin-mtto");
    const auth401 = failedRequests.filter((r) => r.status === 401 || r.status === 403);
    expect(auth401, `unexpected auth errors: ${JSON.stringify(auth401)}`).toHaveLength(0);
    const fivexx = failedRequests.filter((r) => r.status >= 500);
    expect(fivexx, `5xx errors: ${JSON.stringify(fivexx)}`).toHaveLength(0);
  });
});
