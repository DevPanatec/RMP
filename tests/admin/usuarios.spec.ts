// Admin: Crear Perfil de Usuario — profile creation modal flow.
//
// Coverage:
//   1. "Crear Perfil" button visible on Personal section
//   2. Modal opens with correct fields (email, password, nombre, tipo)
//   3. Modal closes via X button
//   4. Required field validation (empty email → stays open or shows error)
//   5. Creates a conductor profile end-to-end (real Clerk + Convex action)
//   6. Creates an admin profile end-to-end
//
// NOTE: Clerk user creation may fail if the email already exists or due
// to password policy — tests handle this gracefully with expect.soft().

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

  const personalSub = page
    .locator("button.app-subtab", { hasText: "Personal" })
    .first();
  const hasSub = await personalSub.isVisible({ timeout: 5_000 }).catch(() => false);
  if (hasSub) {
    await personalSub.click();
    await page.waitForTimeout(600);
  }

  const header = page.locator("h2", { hasText: /Gestión de Personal/i }).first();
  return header.isVisible({ timeout: 8_000 }).catch(() => false);
}

async function openCrearPerfilModal(page: Page): Promise<boolean> {
  const crearBtn = page.locator("button.btn-create-profile").first();
  const visible = await crearBtn.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!visible) return false;
  await crearBtn.click();
  await page.waitForTimeout(600);
  const modal = page
    .locator("h2", { hasText: /Crear Perfil de Usuario/i })
    .first();
  return modal.isVisible({ timeout: 5_000 }).catch(() => false);
}

function ts(): string {
  return Date.now().toString().slice(-8);
}

test.describe("Admin: Crear Perfil de Usuario", () => {
  test.setTimeout(180_000);

  test("Crear Perfil button visible on Personal section", async ({ page }, info) => {
    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered (PER module off)");
      return;
    }
    await snap(page, "admin-usuarios", "00-personal-section", proj(info));

    const crearBtn = page.locator("button.btn-create-profile").first();
    await expect(crearBtn, "'Crear Perfil' button must be visible for admin").toBeVisible({
      timeout: 8_000,
    });
  });

  test("opens Crear Perfil modal with all required fields", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered");
      return;
    }

    const opened = await openCrearPerfilModal(page);
    expect(opened, "Crear Perfil modal must open").toBe(true);

    await snap(page, "admin-usuarios", "01-modal-open", proj(info));

    // Email field
    await expect(page.locator("input[type='email']").first()).toBeVisible();
    // Password field
    await expect(page.locator("input[type='password']").first()).toBeVisible();
    // Nombre completo
    await expect(
      page.locator("input[placeholder*='Juan Carlos']").first(),
    ).toBeVisible();
    // Tipo usuario select
    await expect(page.locator("select.select-v2").first()).toBeVisible();

    rec.dump("admin-usuarios", proj(info));
  });

  test("modal closes via X button", async ({ page }, info) => {
    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered");
      return;
    }

    const opened = await openCrearPerfilModal(page);
    if (!opened) {
      test.skip(true, "Crear Perfil modal did not open");
      return;
    }

    const closeBtn = page
      .locator(".modal-content-v2.modal-profile button.btn-close-v2")
      .first();
    await expect(closeBtn).toBeVisible({ timeout: 3_000 });
    await closeBtn.click();
    await page.waitForTimeout(400);

    const modalStillOpen = await page
      .locator("h2", { hasText: /Crear Perfil de Usuario/i })
      .isVisible({ timeout: 500 })
      .catch(() => false);
    expect(modalStillOpen, "Modal should be closed after X click").toBe(false);

    await snap(page, "admin-usuarios", "02-modal-closed", proj(info));
  });

  test("validates required fields — empty email keeps modal open", async ({ page }, info) => {
    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered");
      return;
    }

    const opened = await openCrearPerfilModal(page);
    if (!opened) {
      test.skip(true, "Crear Perfil modal did not open");
      return;
    }

    // Fill password + nombre but leave email EMPTY
    await page.locator("input[type='password']").first().fill("ValidPass123!x");
    await page
      .locator("input[placeholder*='Juan Carlos']")
      .first()
      .fill("Test Validation");

    // Try submit
    const form = page.locator("form.modal-form-v2").first();
    const submitBtn = form.locator("button[type='submit']").first();
    await submitBtn.click().catch(() => {});
    await page.waitForTimeout(1_000);

    const stillOpen = await page
      .locator("h2", { hasText: /Crear Perfil de Usuario/i })
      .isVisible({ timeout: 500 })
      .catch(() => false);
    console.log(`[usuarios] Validation: modal still open (expected=true): ${stillOpen}`);
    expect.soft(stillOpen, "Modal should remain open with empty email").toBe(true);

    await snap(page, "admin-usuarios", "03-validation-empty-email", proj(info));

    // Close modal
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);
  });

  test("creates a conductor user profile end-to-end", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered");
      return;
    }

    const opened = await openCrearPerfilModal(page);
    if (!opened) {
      test.skip(true, "Crear Perfil modal did not open");
      return;
    }

    const uniqueTs = ts();
    const email = `e2e-conductor-${uniqueTs}@rmp-test.com`;
    const password = `E2eTest-${uniqueTs}!Rmp`;
    const nombre = `E2E Conductor ${uniqueTs}`;

    await page.locator("input[type='email']").first().fill(email);
    await page.locator("input[type='password']").first().fill(password);
    await page
      .locator("input[placeholder*='Juan Carlos']")
      .first()
      .fill(nombre);
    await page.locator("select.select-v2").first().selectOption("conductor");

    await snap(page, "admin-usuarios", "04-conductor-form-filled", proj(info));

    // Submit
    const submitBtn = page
      .locator("form.modal-form-v2 button[type='submit']")
      .first();
    await submitBtn.click();

    // Wait for Clerk action (can take 3-8s)
    await page.waitForTimeout(8_000);
    await snap(page, "admin-usuarios", "04b-conductor-after-submit", proj(info));

    // Check for success or error feedback
    const successMsg = page.locator(".profile-status.success, .profile-status").first();
    const errorMsg = page.locator(".profile-status.error").first();

    const isSuccess = await successMsg.isVisible({ timeout: 2_000 }).catch(() => false);
    const isError = await errorMsg.isVisible({ timeout: 500 }).catch(() => false);

    const modalClosed = !(await page
      .locator("h2", { hasText: /Crear Perfil de Usuario/i })
      .isVisible({ timeout: 500 })
      .catch(() => false));

    console.log(
      `[usuarios] Conductor creation: success=${isSuccess}, error=${isError}, modalClosed=${modalClosed}, email=${email}`,
    );

    // Soft assertion: Clerk creation may fail if org has limits
    expect.soft(isError, "Should not show error for valid conductor creation").toBe(false);

    rec.dump("admin-usuarios", proj(info));

    // Close modal if still open
    if (!modalClosed) {
      await page.locator("button.btn-close-v2").first().click().catch(() => {});
    }
  });

  test("creates an admin user profile", async ({ page }, info) => {
    const rec = attachConsoleRecorder(page);
    const rendered = await goToPersonal(page);
    if (!rendered) {
      test.skip(true, "Personal section not rendered");
      return;
    }

    const opened = await openCrearPerfilModal(page);
    if (!opened) {
      test.skip(true, "Crear Perfil modal did not open");
      return;
    }

    const uniqueTs = ts();
    const email = `e2e-admin-${uniqueTs}@rmp-test.com`;
    const password = `E2eAdmin-${uniqueTs}!Rmp`;
    const nombre = `E2E Admin ${uniqueTs}`;

    await page.locator("input[type='email']").first().fill(email);
    await page.locator("input[type='password']").first().fill(password);
    await page
      .locator("input[placeholder*='Juan Carlos']")
      .first()
      .fill(nombre);
    await page.locator("select.select-v2").first().selectOption("admin");

    await snap(page, "admin-usuarios", "05-admin-form-filled", proj(info));

    const submitBtn = page
      .locator("form.modal-form-v2 button[type='submit']")
      .first();
    await submitBtn.click();
    await page.waitForTimeout(8_000);
    await snap(page, "admin-usuarios", "05b-admin-after-submit", proj(info));

    const errorMsg = page.locator(".profile-status.error").first();
    const isError = await errorMsg.isVisible({ timeout: 1_000 }).catch(() => false);
    console.log(`[usuarios] Admin creation: error=${isError}, email=${email}`);
    expect.soft(isError, "Should not show error for valid admin creation").toBe(false);

    rec.dump("admin-usuarios", proj(info));
    await page.locator("button.btn-close-v2").first().click().catch(() => {});
  });
});
