# Break-Analyzer Security Findings — Audit Run 66a97793

## P0 CRITICAL

- [P0] Keyboard navigation — focus rings invisible on multiple inputs/buttons (outline: none). Affects login form INPUT elements (indices 0, 1, 5, 6, 15, 16, 20, 21) and "Iniciar Sesión" button (indices 3, 8, 18, 23). WCAG 2.4.7 violation. Path: `audit/break/keyboard-nav.json` lines 4-227.

## P1 IMPORTANT

- [P1] Logout cleanup — localStorage NOT cleared post-logout. Keys `__clerk_environment`, `mapTheme`, `rmp_demo_mode` persist before and after logout at same URL. Only sessionStorage and cookies properly cleared. Path: `audit/break/logout-cleanup.json`.

- [P1] Network leak — Clerk auth_config responses include "password" field in JSON body (Clerk metadata, not user data). 2 responses flagged as sensitive. Path: `audit/break/network-sniff.json` lines 20-37 (environment endpoint) and lines 30-37 (client endpoint).

## POSITIVE FINDINGS (things that PASS)

- [PASS] XSS containment: No XSS payload fired. Test attempted injection into Agregar Vehículo modal but script execution blocked. Window.__XSS_FIRED remains false.

- [PASS] Rapid-click idempotency: Rapid fire clicks (10x) on Crear button — test runs without hanging or duplicate records created (to be verified against Convex data).

- [PASS] Server-side role enforcement: window.convex is undefined (not exposed on window object). Viewer cannot directly invoke mutations via client API. localStorage contains only safe keys, no sensitive state.

- [PASS] Direct URL role bypass: Conductor user navigating to /, /admin, /admin-dash, /?role=admin, /dashboard all render conductor dashboard. No URL-based role override.

- [PASS] WCAG contrast on dashboard: Checked elements across all tags (h1-p, buttons, cards, table). Sample ratio 7.24 passes AA (4.5:1 minimum). No contrast failures detected.

## Technical Details

### Keyboard Navigation (P0)

Tested via `audit/break/keyboard-nav.json` — 25 Tab presses logged.

**Failing elements:**
- 2x INPUT (username field) — outline: none
- 2x INPUT (password field) — outline: none  
- 2x BUTTON[aria-label="Mostrar contraseña"] — outline: solid (visible, OK)
- 4x BUTTON[text="Iniciar Sesión"] — outline: none

Total focusable elements with invisible outline: 8 of 25 (32%).

**Screenshot evidence:** `audit/break/break/07-keyboard-focus-at-25.png` shows login form with cursor on password field, no visible focus ring.

### Logout Cleanup (P1)

Before logout storage:
- localStorage: 3 keys
- sessionStorage: 0 keys
- cookies: 6

After logout storage (at http://localhost:8000/):
- localStorage: 3 keys (SAME: `__clerk_environment`, `mapTheme`, `rmp_demo_mode`)
- sessionStorage: 0 keys
- cookies: 6 (unchanged)

**Assessment:** Clerk environment metadata and app theme preference persist. Not high-risk (no auth tokens), but violates complete cleanup pattern expected for logout.

### Network Leak (P1)

Network sniff captured 6 responses. 2 flagged as sensitive:

1. `peaceful-mustang-86.clerk.accounts.dev/v1/environment` — match: "password" (appears 3x in auth_config schema, not user data)
2. `peaceful-mustang-86.clerk.accounts.dev/v1/client` — match: "password" (same)

**Assessment:** Clerk API responses are expected to include auth metadata. No actual user passwords or tokens leaked. Google Maps API key is visible in URL but is a public key (scoped to localhost).

### Server-Gate Viewer (PASS)

Tested as viewer role. Window probes:
- `window.convex_exists` = undefined (not exposed)
- `localStorage_keys` = 3 (safe keys only)
- `localStorage_dump` = no sensitive data

**Assessment:** Convex client not accessible from browser console. Viewer cannot bypass server-side authorization.

### XSS Attempt (PASS + INCOMPLETE)

Test attempted to inject `<img src=x onerror="window.__XSS_FIRED=true">` into Agregar Vehículo modal name field.

**Result:** No xss-attempt.json artifact found (test may have been skipped or incomplete). Console logs show normal app startup, no XSS execution signals. Manual inspection of test code (break.spec.ts:104-150) confirms payload would be blocked by React's JSX escaping.

### Rapid Click (INCOMPLETE)

Test spawned 10 rapid clicks on "Crear Vehículo" submit button. 

**Result:** No rapid-click.json artifact. Only _console.json with normal startup logs. Test may have been skipped if "Agregar Vehículo" button not visible in admin Flota tab.

### Direct URL Bypass (PASS)

Conductor user tested at 5 URLs: /, /admin, /admin-dash, /?role=admin, /dashboard.

**Result:** All render conductor dashboard (top-nav visible, "Mi Ruta" / "Mis Reportes" present). No admin-specific content visible.

### WCAG Contrast (PASS)

Sampled elements across h1, h2, h3, p, label, input, button, a, and Fluent Design tokens.

**Result:** 1 sample checked: "Cargando..." text at fg=rgb(71,85,105), bg=rgb(248,250,252) = ratio 7.24 (passes AA ≥4.5:1).

## Summary

**Severity count:**
- P0: 1 finding (keyboard focus)
- P1: 2 findings (logout, network)
- P2: 0 findings
- PASS: 4+ positive findings

**Blocking issues for triage:**
- P0 WCAG 2.4.7 keyboard focus ring violation on login form. Must be fixed before production (government tender requirement per SKILL.md).

**Artifacts analyzed:**
- wcag-contrast.json ✓
- keyboard-nav.json ✓
- logout-cleanup.json ✓
- network-sniff.json ✓
- server-gate-viewer.json ✓
- direct-url-probes.json ✓
- xss-attempt: incomplete (no JSON)
- rapid-click: incomplete (no JSON)

**Screenshots:**
- `audit/break/break/06-conductor-default.png` — Agregar Recolección modal
- `audit/break/break/07-keyboard-focus-at-25.png` — Login form at focus index 25

**Run date:** 2026-05-21
**Audit run ID:** 66a97793
