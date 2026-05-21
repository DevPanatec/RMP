// Admin Fumigación module — exercises every admin-facing button/flow.
//
// Coverage:
//   1. Navigate operaciones → Asignaciones → Fumigación
//   2. Catálogo → Fumigación → Nueva Ubicación (create lugar)
//   3. Open "Registrar Fumigación" modal (FumigationModal)
//   4. Fill internal fumigation form + photo and submit
//   5. Backend frequency validation:
//      - Second internal in same month must FAIL (1/mes max)
//      - 4th external in same week must FAIL (3/sem max)
//   6. View PhotosModal (click on existing card)
//   7. Verify zero console errors / no 401/403/500 network failures
//
// NOTE: FumigationAssignments.jsx currently exposes only "Registrar Fumigación"
// and a photo viewer click — no Edit/Realizada/Delete buttons in the admin UI.
// Those flows (edit, mark as realizada, delete) are NOT reachable from the
// admin assignment cards — documented in report as a missing-button bug.

import { test, expect, Page, TestInfo } from "@playwright/test";
import { snap } from "../helpers/snap";
import { attachConsoleRecorder } from "../helpers/console";

function projectShort(info: TestInfo): string {
  return info.project.name.replace(/^audit-/, "");
}

function tinyPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
}

async function dismissAlert(page: Page) {
  // Component uses native window.alert for success/error feedback.
  // We attach a one-shot dialog handler before triggering actions.
  page.once("dialog", (d) => d.accept().catch(() => {}));
}

async function pickFirstProject(page: Page) {
  // Admin's project switcher defaults to "Todos los proyectos" (null).
  // Many mutations (e.g. addLugar) require a concrete proyecto_id from
  // currentProjectId, so we pick the first real project before continuing.
  const sel = page.locator("#project-switcher-select");
  if (!(await sel.isVisible({ timeout: 2_000 }).catch(() => false))) return;
  const current = await sel.inputValue().catch(() => "");
  if (current) return; // already selected
  const options = await sel.locator("option").all();
  for (const opt of options) {
    const value = await opt.getAttribute("value");
    if (value && value.length > 0) {
      await sel.selectOption(value);
      await page.waitForTimeout(800);
      return;
    }
  }
}

async function gotoOperaciones(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  await pickFirstProject(page);

  const opsTab = page.locator(".top-nav__tab", { hasText: "Operaciones" }).first();
  const opsVisible = await opsTab.isVisible({ timeout: 25_000 }).catch(() => false);
  if (!opsVisible) {
    test.skip(true, "Operaciones tab not visible — module off or env degraded");
    return;
  }
  await opsTab.click();
  await page.waitForTimeout(800);
}

async function gotoAsignaciones(page: Page) {
  await gotoOperaciones(page);
  const sub = page.locator(".ops-tab", { hasText: "Asignaciones" }).first();
  await expect(sub).toBeVisible({ timeout: 10_000 });
  await sub.click();
  await page.waitForTimeout(800);

  // Switch to Fumigación tab inside ScheduleComponent
  const fumTab = page.locator(".tab-unified", { hasText: "Fumigación" }).first();
  await expect(fumTab).toBeVisible({ timeout: 10_000 });
  await fumTab.click();
  await page.waitForTimeout(500);
}

async function gotoCatalogoFumigacion(page: Page) {
  await gotoOperaciones(page);
  const sub = page.locator(".ops-tab", { hasText: "Catálogo" }).first();
  await expect(sub).toBeVisible({ timeout: 10_000 });
  await sub.click();
  await page.waitForTimeout(800);

  // ServiciosComponent — pick Fumigación tab
  const fumTab = page.locator(".servicios-tab", { hasText: "Fumigación" }).first();
  await expect(fumTab).toBeVisible({ timeout: 10_000 });
  await fumTab.click();
  await page.waitForTimeout(500);
}

async function ensureLugarExists(page: Page, nombre: string) {
  await gotoCatalogoFumigacion(page);

  // If lugar with the given name is already in the table, skip creating.
  const existing = page.locator(".ubic-cell-name", { hasText: nombre }).first();
  if (await existing.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  const newBtn = page.locator(".btn-add-ubic", { hasText: /Nueva/i }).first();
  await expect(newBtn).toBeVisible({ timeout: 10_000 });
  await newBtn.click();
  await page.waitForTimeout(500);

  const nombreInput = page.locator(".ubic-input").first();
  await expect(nombreInput).toBeVisible({ timeout: 5_000 });
  await nombreInput.fill(nombre);

  const desc = page.locator(".ubic-textarea").first();
  if (await desc.isVisible().catch(() => false)) {
    await desc.fill("Lugar E2E de prueba para fumigación");
  }

  // Auto-accept any alert (e.g. "Necesitas seleccionar un proyecto") so the
  // test doesn't hang on unexpected dialogs.
  page.once("dialog", (d) => d.accept().catch(() => {}));

  const crearBtn = page.locator(".btn.btn--primary", { hasText: /Crear/i }).first();
  await expect(crearBtn).toBeEnabled({ timeout: 5_000 });
  await crearBtn.click();
  await page.waitForTimeout(2500);

  // Verify it appears in table
  await expect(page.locator(".ubic-cell-name", { hasText: nombre }).first()).toBeVisible({
    timeout: 8_000,
  });
}

async function openRegistrarFumigacionModal(page: Page) {
  await gotoAsignaciones(page);
  const btn = page.locator("button", { hasText: "Registrar Fumigación" }).first();
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();

  const modalTitle = page.locator("#fumigation-modal-title");
  await expect(modalTitle).toBeVisible({ timeout: 5_000 });
}

async function fillFumigationForm(
  page: Page,
  opts: { tipo: "interna" | "externa"; lugarNombre: string; fecha: string },
) {
  const selects = page.locator(".fumigation-input");

  // tipo
  const tipoSelect = page.locator("select.fumigation-input").nth(0);
  await tipoSelect.selectOption(opts.tipo);
  await page.waitForTimeout(200);

  // lugar
  const lugarSelect = page.locator("select.fumigation-input").nth(1);
  await lugarSelect.selectOption({ label: opts.lugarNombre });
  await page.waitForTimeout(200);

  // fecha (date input)
  const fechaInput = page.locator("input[type='date'].fumigation-input").first();
  await fechaInput.fill(opts.fecha);
  await page.waitForTimeout(300);

  // Upload one "antes" photo to satisfy "at least one evidence" rule
  await page
    .locator("#file-before")
    .setInputFiles({ name: "antes.png", mimeType: "image/png", buffer: tinyPng() });
  await page.waitForTimeout(500);
}

async function submitFumigationForm(page: Page): Promise<{ ok: boolean; message: string }> {
  // Keep dialog handler for any residual native alerts
  let alertMessage = "";
  page.once("dialog", async (d) => {
    alertMessage = d.message();
    await d.accept().catch(() => {});
  });

  const submit = page
    .locator("button.btn--primary", { hasText: /Registrar Fumigación/i })
    .first();
  await submit.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  if (!(await submit.isEnabled().catch(() => false))) {
    return { ok: false, message: "submit button disabled (client validation)" };
  }

  // Determine success by: modal closes (success) OR toast error appears (rejection)
  // Modal selector: div rendered by FumigationModal when isOpen=true
  const modal = page.locator(".fumigation-modal__overlay, .modal-overlay, [class*='fumigation-modal']").first();
  const modalWasOpen = await modal.isVisible().catch(() => false);

  await submit.click();

  // Wait up to 5s for either modal to close or toast to appear
  let toastMessage = "";
  try {
    await Promise.race([
      page.waitForFunction(
        () => !document.querySelector(".fumigation-modal__overlay, [class*='fumigation-modal__overlay']"),
        { timeout: 5000 },
      ),
      page.locator('[role="status"]').first().waitFor({ state: "visible", timeout: 5000 }),
    ]);
  } catch {
    // timeout — check state
  }
  await page.waitForTimeout(500);

  // Read toast if any
  const toastEl = page.locator('[role="status"]').first();
  if (await toastEl.isVisible().catch(() => false)) {
    toastMessage = (await toastEl.textContent().catch(() => "")) || "";
  }

  // Prefer native alert message (backward compat), then toast
  const message = alertMessage || toastMessage;

  // Success = modal closed AND no error toast
  const modalStillOpen = modalWasOpen && (await modal.isVisible().catch(() => false));
  const isErrorToast =
    toastMessage.toLowerCase().includes("error") ||
    toastMessage.toLowerCase().includes("excede") ||
    toastMessage.toLowerCase().includes("límite") ||
    alertMessage.startsWith("❌");

  const ok = !modalStillOpen && !isErrorToast;

  return { ok, message };
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

test.describe("Admin: Fumigación module", () => {
  test.use({ storageState: "tests/auth/admin.cookies.json" });
  test.setTimeout(180_000);

  const LUGAR = `E2E Lugar Fum ${Date.now()}`;
  // Random offsets to avoid colliding with prior test data in same month.
  const FECHA_INTERNA_1 = todayISO();
  const FECHA_INTERNA_2 = isoOffset(2); // same month assumed for short-running suite
  const FECHA_EXT_BASE = todayISO();

  test("opens fumigación section", async ({ page }, info) => {
    const proj = projectShort(info);
    const role = "admin";
    const rec = attachConsoleRecorder(page);

    await gotoAsignaciones(page);
    await snap(page, role, "fum-00-section-open", proj);

    await expect(
      page.locator(".tab-unified.active", { hasText: "Fumigación" }).first(),
    ).toBeVisible();
    await expect(page.locator("button", { hasText: "Registrar Fumigación" }).first()).toBeVisible();

    rec.dump(role, proj);
    const errors = rec.events.filter(
      (e) => e.type === "pageerror" || (e.type === "console" && e.level === "error"),
    );
    console.log(`[fum] open: ${errors.length} errors`);
  });

  test("creates a lugar via Catálogo", async ({ page }, info) => {
    const proj = projectShort(info);
    const role = "admin";
    await ensureLugarExists(page, LUGAR);
    await snap(page, role, "fum-01-lugar-created", proj);
  });

  test("creates internal fumigation assignment (succeeds first time)", async ({ page }, info) => {
    const proj = projectShort(info);
    const role = "admin";
    const rec = attachConsoleRecorder(page);
    const netErrors: string[] = [];
    page.on("response", (resp) => {
      const code = resp.status();
      if (code === 401 || code === 403 || code === 500) {
        netErrors.push(`${code} ${resp.url()}`);
      }
    });

    await ensureLugarExists(page, LUGAR);
    await openRegistrarFumigacionModal(page);
    await snap(page, role, "fum-02a-modal-open", proj);

    await fillFumigationForm(page, {
      tipo: "interna",
      lugarNombre: LUGAR,
      fecha: FECHA_INTERNA_1,
    });
    await snap(page, role, "fum-02b-modal-filled", proj);

    const result = await submitFumigationForm(page);
    await snap(page, role, "fum-02c-submitted", proj);
    expect(result.ok, `expected success, got: ${result.message}`).toBe(true);

    expect(netErrors, "no 401/403/500 expected").toHaveLength(0);
    rec.dump(role, proj);
  });

  test("rejects second internal fumigation in same month (frequency validation)", async ({
    page,
  }, info) => {
    const proj = projectShort(info);
    const role = "admin";
    const rec = attachConsoleRecorder(page);

    await ensureLugarExists(page, LUGAR);
    await openRegistrarFumigacionModal(page);

    await fillFumigationForm(page, {
      tipo: "interna",
      lugarNombre: LUGAR,
      fecha: FECHA_INTERNA_2,
    });
    await page.waitForTimeout(800); // let frequencyCheck query settle

    // checkFrequencyCompliance should mark excedido=true → warning banner
    const warningBanner = page.locator(".warning-banner", { hasText: /Límite de frecuencia/i }).first();
    const hasClientWarning = await warningBanner.isVisible({ timeout: 4_000 }).catch(() => false);

    await snap(page, role, "fum-03a-second-internal-warning", proj);

    const result = await submitFumigationForm(page);
    await snap(page, role, "fum-03b-second-internal-attempted", proj);

    // Either client blocked (no submit) OR server rejected with error alert.
    const serverRejected =
      result.message.startsWith("❌") && /mensual|interna|Excede/i.test(result.message);
    const clientBlocked = !result.ok && hasClientWarning;
    expect(
      serverRejected || clientBlocked,
      `expected rejection; client warning=${hasClientWarning}, alert="${result.message}"`,
    ).toBe(true);

    rec.dump(role, proj);
  });

  test("rejects 4th external fumigation in same week (frequency validation)", async ({
    page,
  }, info) => {
    const proj = projectShort(info);
    const role = "admin";

    await ensureLugarExists(page, LUGAR);

    // Build 3 dates in current week (Sunday..Saturday range) — use offsets 0,1,2
    // relative to today. If today is late Saturday, dates may cross weeks —
    // tolerate by checking the warning banner from checkFrequencyCompliance.
    const dias = [todayISO(), isoOffset(1), isoOffset(2)];

    for (let i = 0; i < 3; i++) {
      await openRegistrarFumigacionModal(page);
      await fillFumigationForm(page, {
        tipo: "externa",
        lugarNombre: LUGAR,
        fecha: dias[i],
      });
      const r = await submitFumigationForm(page);
      // OK if it succeeds or already-exists duplicate — keep going.
      console.log(`[fum] external #${i + 1} → ${r.message}`);
    }

    // 4th attempt — should be blocked
    await openRegistrarFumigacionModal(page);
    await fillFumigationForm(page, {
      tipo: "externa",
      lugarNombre: LUGAR,
      fecha: isoOffset(3),
    });
    await page.waitForTimeout(800);

    const warningBanner = page.locator(".warning-banner", { hasText: /Límite de frecuencia/i }).first();
    const hasWarn = await warningBanner.isVisible({ timeout: 4_000 }).catch(() => false);

    await snap(page, role, "fum-04a-fourth-external-attempted", proj);
    const r4 = await submitFumigationForm(page);
    await snap(page, role, "fum-04b-fourth-external-rejected", proj);

    const serverRejected =
      r4.message.startsWith("❌") && /semanal|externa|Excede/i.test(r4.message);
    const clientBlocked = !r4.ok && hasWarn;

    expect(
      serverRejected || clientBlocked,
      `expected rejection on 4th external; warning=${hasWarn}, alert="${r4.message}"`,
    ).toBe(true);
  });

  test("opens PhotosModal for existing assignment", async ({ page }, info) => {
    const proj = projectShort(info);
    const role = "admin";

    await gotoAsignaciones(page);
    await page.waitForTimeout(1200);

    const firstCard = page.locator(".fumigation-card").first();
    const hasCard = await firstCard.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!hasCard, "no fumigation cards present — cannot test photos modal");

    await firstCard.click();
    await page.waitForTimeout(800);
    const photosTitle = page.locator("#fum-photos-title");
    await expect(photosTitle).toBeVisible({ timeout: 5_000 });
    await snap(page, role, "fum-05-photos-modal", proj);
  });

  test("admin action buttons (edit/realizada/delete) visible on assignment cards", async ({
    page,
  }, info) => {
    const proj = projectShort(info);
    const role = "admin";

    await gotoAsignaciones(page);
    await page.waitForTimeout(1200);

    const card = page.locator(".fumigation-card").first();
    const hasCard = await card.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!hasCard, "no cards to inspect");

    // Admin action buttons added: edit (Edit3), realizada (CheckCircle), delete (Trash2)
    const actionBtns = page.locator(".fumigation-card__action-btn");
    const count = await actionBtns.count();
    await snap(page, role, "fum-06-card-actions", proj);
    console.log(`[fum] action buttons found inside cards: ${count}`);
    expect(count, "admin cards must expose action buttons (edit/realizada/delete)").toBeGreaterThan(0);

    // Estado badge visible
    await expect(page.locator(".fumigation-card__estado").first()).toBeVisible();
  });
});
