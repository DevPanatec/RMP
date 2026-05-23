// Admin: Recolección / Rutas / Flota / Asignaciones — UI exercise.
//
// Walks an admin through:
//   1. Operaciones → Flota (list, "Agregar Vehículo" modal open + cancel)
//   2. Operaciones → Catálogo → Recolección ("Nueva Ruta" modal open + tab switch)
//   3. Operaciones → Asignaciones (Schedule) — open + verify CRUD buttons
//   4. Monitoreo tab — map renders, FABs work (center / maximize / geofence)
//
// We intentionally DO NOT submit a new route end-to-end because the form
// requires picking ≥2 stops on a MapLibre map (heavy + flaky in headless).
// Vehicle add IS submitted (minimalist 2-field form).
//
// Captures console errors + failed requests per spec, dumps to
// audit/<project>/admin-recoleccion/_console.json.

import { test, expect, Page, TestInfo } from "@playwright/test";
import { snap } from "../helpers/snap";
import { attachConsoleRecorder } from "../helpers/console";

function projectShort(info: TestInfo): string {
  return info.project.name.replace(/^audit-/, "");
}

const ROLE = "admin-recoleccion";

test.use({ storageState: "tests/auth/admin.cookies.json" });

test.describe("Admin: Recolección / Rutas / Flota / Asignaciones", () => {
  test.setTimeout(180_000);

  test("admin: full module walk-through", async ({ page }, info) => {
    const proj = projectShort(info);
    const recorder = attachConsoleRecorder(page);

    page.on("pageerror", (e) => console.log(`PAGEERROR: ${e.name}: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") {
        console.log(`PAGE[error]: ${m.text().slice(0, 250)}`);
      }
    });

    // -------- 0. Landing
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await snap(page, ROLE, "00-landing", proj);

    // Sanity: top-nav present
    const monitoreoVisible = await page
      .locator(".top-nav__tab", { hasText: "Monitoreo" })
      .first()
      .isVisible({ timeout: 25_000 })
      .catch(() => false);
    if (!monitoreoVisible) {
      test.skip(true, "Top-nav not visible — env degraded or not logged in");
      return;
    }

    // ============================================================
    // 1. OPERACIONES → FLOTA
    // ============================================================
    const opsTab = page.locator(".top-nav__tab", { hasText: "Operaciones" }).first();
    const opsVisible = await opsTab.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!opsVisible) {
      test.skip(true, "Operaciones tab not visible — module off or env degraded");
      return;
    }
    await opsTab.click();
    await page.waitForTimeout(800);

    // Click sub-tab Flota
    const flotaSubTab = page.locator(".app-subtab", { hasText: "Flota" }).first();
    await expect(flotaSubTab).toBeVisible({ timeout: 10_000 });
    await flotaSubTab.click();
    await page.waitForTimeout(800);
    await snap(page, ROLE, "01-flota-list", proj);

    // Verify fleet header rendered
    await expect(page.locator(".fleet-header-v2 h2")).toContainText(
      /Gestión de Flota/i,
      { timeout: 10_000 },
    );

    // Click "Agregar Vehículo"
    const addVehicleBtn = page
      .locator("button", { hasText: /Agregar Vehículo|Agregar/ })
      .first();
    await expect(addVehicleBtn).toBeVisible({ timeout: 10_000 });
    await addVehicleBtn.click();
    await page.waitForTimeout(600);

    const vehicleModal = page.locator(".modal-content-v2", {
      hasText: /Nuevo Vehículo/i,
    });
    await expect(vehicleModal).toBeVisible({ timeout: 8_000 });
    await snap(page, ROLE, "02-vehicle-modal-open", proj);

    // Fill minimal fields
    const uniquePlaca = `E2E-${Date.now().toString().slice(-6)}`;
    await page.fill("input[name='nombre']", `Test Truck ${uniquePlaca}`);
    await page.fill("input[name='placa']", uniquePlaca);
    await snap(page, ROLE, "03-vehicle-form-filled", proj);

    // Try to submit (no GPS IMEI = ok, it's optional)
    const submitVehicleBtn = vehicleModal.locator("button.btn-primary-v2");
    await expect(submitVehicleBtn).toBeEnabled();
    await submitVehicleBtn.click();
    // Wait up to 8s for modal to close or error to appear
    await Promise.race([
      vehicleModal.waitFor({ state: "hidden", timeout: 8_000 }),
      page.waitForTimeout(8_000),
    ]);
    await page.waitForTimeout(1000);
    await snap(page, ROLE, "04-after-vehicle-submit", proj);

    // If still open, error path → close manually
    if (await vehicleModal.isVisible().catch(() => false)) {
      console.log("[admin-recoleccion] Vehicle modal did not close after submit");
      await page.locator(".btn-close-v2").first().click().catch(() => {});
      await page.waitForTimeout(500);
    } else {
      // Verify new vehicle visible in list
      const card = page.locator(".vehicle-card-v2", { hasText: uniquePlaca });
      const found = await card
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      console.log(`[admin-recoleccion] Vehicle ${uniquePlaca} in list: ${found}`);
    }

    // ============================================================
    // 2. OPERACIONES → CATÁLOGO → RECOLECCIÓN
    // ============================================================
    const catalogoSubTab = page.locator(".app-subtab", { hasText: "Catálogo" }).first();
    await expect(catalogoSubTab).toBeVisible({ timeout: 5_000 });
    await catalogoSubTab.click();
    await page.waitForTimeout(800);
    await snap(page, ROLE, "05-catalogo-default", proj);

    // First tab should be Recolección (REC module).
    const recTab = page.locator(".servicios-tab", { hasText: "Recolección" }).first();
    const hasRec = await recTab.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasRec) {
      await recTab.click();
      await page.waitForTimeout(500);
    }

    // Routes header check
    const routesHeader = page.locator(".routes-header-v2");
    await expect(routesHeader).toBeVisible({ timeout: 10_000 });
    await snap(page, ROLE, "06-rutas-list", proj);

    // Click "Nueva Ruta"
    const nuevaRutaBtn = page
      .locator("button", { hasText: /Nueva Ruta/i })
      .first();
    await expect(nuevaRutaBtn).toBeVisible({ timeout: 10_000 });
    await nuevaRutaBtn.click();
    await page.waitForTimeout(1200);

    // RouteModal opens (covers a lot of viewport — has tabs INFO / STOPS)
    const routeModalOpen = await page
      .locator("input[placeholder*='nombre'], input[placeholder*='Nombre'], .route-modal, [class*='route-modal']")
      .first()
      .isVisible({ timeout: 8_000 })
      .catch(() => false);
    console.log(`[admin-recoleccion] RouteModal opened: ${routeModalOpen}`);
    await snap(page, ROLE, "07-route-modal-open", proj);

    // The submit button is DISABLED until form is valid (good UX!).
    // Verify the disabled state + its tooltip exposes validation reason.
    const guardarBtn = page
      .locator("button", { hasText: /^Guardar|Crear Ruta|Save/ })
      .first();
    if (await guardarBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const isDisabled = await guardarBtn.isDisabled().catch(() => false);
      const tooltip = await guardarBtn.getAttribute("title").catch(() => null);
      console.log(
        `[admin-recoleccion] Guardar btn disabled=${isDisabled} tooltip="${tooltip}"`,
      );
      await snap(page, ROLE, "08-route-form-empty-disabled-submit", proj);
    }

    // Cancel / close the route modal
    const closeRouteModal = page
      .locator(
        "button:has-text('Cancelar'), button[aria-label='close'], button.btn-close-v2",
      )
      .first();
    if (await closeRouteModal.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeRouteModal.click();
      await page.waitForTimeout(600);
    } else {
      // Force close via ESC
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
    await snap(page, ROLE, "09-route-modal-closed", proj);

    // ============================================================
    // 3. OPERACIONES → ASIGNACIONES (Schedule)
    // ============================================================
    const asignacionesSubTab = page
      .locator(".app-subtab", { hasText: /Asignaciones|Programación/ })
      .first();
    if (await asignacionesSubTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await asignacionesSubTab.click();
      await page.waitForTimeout(800);
      await snap(page, ROLE, "10-asignaciones-list", proj);

      // Check for "Nueva Asignación" or "+ Asignar" button
      const newAssignmentBtn = page
        .locator(
          "button:has-text('Nueva'), button:has-text('Asignar'), button:has-text('+')",
        )
        .first();
      if (await newAssignmentBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await newAssignmentBtn.click();
        await page.waitForTimeout(800);
        await snap(page, ROLE, "11-asignacion-modal-open", proj);

        // Close via ESC
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
    } else {
      console.log("[admin-recoleccion] Asignaciones sub-tab not found");
    }

    // ============================================================
    // 4. DASHBOARD MAP + FABs
    // ============================================================
    const dashTab = page.locator(".top-nav__tab", { hasText: "Monitoreo" }).first();
    await dashTab.click();
    await page.waitForTimeout(2500); // map tiles loading
    await snap(page, ROLE, "12-dashboard-map", proj);

    // Map container
    const mapWrap = page.locator(".map-container-modern, .maplibregl-map").first();
    await expect(mapWrap).toBeVisible({ timeout: 15_000 });

    // FABs
    const centerFab = page.locator(".monitoring-fab[title*='Centrar']").first();
    if (await centerFab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await centerFab.click();
      await page.waitForTimeout(500);
    }

    const maximizeFab = page.locator(".monitoring-fab[title*='Maximizar']").first();
    if (await maximizeFab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await maximizeFab.click();
      await page.waitForTimeout(1500);
      await snap(page, ROLE, "13-map-maximized", proj);

      // Close maximize
      const minimizeBtn = page
        .locator(".minimize-btn, button[title='Cerrar']")
        .first();
      if (await minimizeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await minimizeBtn.click();
        await page.waitForTimeout(800);
      } else {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
    }

    const geofenceFab = page
      .locator(".monitoring-fab[title*='zona de alerta'], .monitoring-fab[title*='geofence']")
      .first();
    if (await geofenceFab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await geofenceFab.click();
      await page.waitForTimeout(500);
      await snap(page, ROLE, "14-geofence-mode", proj);
    }

    await snap(page, ROLE, "15-final", proj);

    // -------- Dump console for analysis
    const consolePath = recorder.dump(ROLE, proj);
    console.log(`\n[admin-recoleccion] Console: ${consolePath}`);

    // Surface meaningful errors
    const failedReqs = recorder.events.filter(
      (e) =>
        e.type === "requestfailed" &&
        !/(favicon|sockjs-node|hot-update|chrome-extension)/.test(e.text),
    );
    const errors = recorder.events.filter(
      (e) =>
        e.type === "pageerror" ||
        (e.type === "console" &&
          e.level === "error" &&
          !/favicon|sourcemap|DevTools|deprecation|defaultProps/i.test(e.text)),
    );

    if (failedReqs.length > 0) {
      console.log(`\n[admin-recoleccion] Failed requests: ${failedReqs.length}`);
      for (const r of failedReqs.slice(0, 10)) {
        console.log(`  - ${r.text.slice(0, 240)}`);
      }
    }
    if (errors.length > 0) {
      console.log(`\n[admin-recoleccion] Errors: ${errors.length}`);
      for (const e of errors.slice(0, 10)) {
        console.log(`  - [${e.type}] ${e.text.slice(0, 240)}`);
      }
    }
  });
});
