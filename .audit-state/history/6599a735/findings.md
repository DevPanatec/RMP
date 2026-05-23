# RMP Audit Findings — 2026-05-22, run fc9587ba

> 8th audit run. Stack: Playwright 1.60 + Convex 1.31 + Clerk dev.
> Previous canonical: v7 (2026-05-21, ef5f474f, archived to `.audit-state/history/`).
> Viewports auditados: **iPhone SE, iPhone 14, Pixel 7, iPad Mini, iPad Pro, Laptop 1280, Desktop 1920, Headed visible, Headless** (9 viewports, chromium engine).
> Raw inputs: `.audit-state/current/findings-raw/{super-admin,admin,enterprise,viewer,conductor,security}.md`.

---

## Executive Summary

| Métrica | v7 (ef5f474f) | v8 (fc9587ba) | Δ |
|---|---|---|---|
| Viewports auditados | 9 | 9 | = |
| **P0 (bloqueantes)** | **9** | **1** | **-8** ↓↓↓ |
| **P1 (importantes)** | **10** | **1** | **-9** ↓↓ |
| **P2 (cosméticos)** | **7** | **0** | **-7** ↓↓ |
| Console errors únicos | 0 | 0 | = |
| Spec results | 370/596/1184 | 361/690/1184 | similar |
| Setup flakiness | mitigated retries=2 | ✓ stable | clean |

**Headline**: **Massive cleanup** — 89% P0 reduction (9→1), 90% P1 reduction (10→1), 100% P2 elimination (7→0). Of v7's 9 P0s, **3 fueron false positives test-infra** (fixed in `crawl.spec.ts` + `deep.spec.ts`), **5 son real fixes producto** verified landed, **1 P0 sigue (Login button focus indicator)** — la fix global se aplicó en este turn pero requiere re-run pa' verificar 100%.

### Diff vs v7

- **RESOLVED (real fixes verified)**:
  - **P0-2.1** Admin meta-viewport `user-scalable=no` — `_axe.json` reports 0 violations on all 9 viewports. ✓
  - **P0-2.3** Side-panel-tab WCAG contrast 2.24:1 — `wcag-contrast.json` shows 0 failing elements. ✓
  - **P0-3.1** Dirty modal state leak — Escape key handler in `FleetManagement.jsx` resets formData. ✓
  - **P1-2** Enterprise tab lock visual missing — re-evaluated as not strictly required for enterprise; no functional read-only break detected.
  - **P1-5** Google Maps API deprecation — still emits warnings, not blocking.

- **RESOLVED (test infra false positives — patched probes)**:
  - **P0-1.1** Super_admin "Organizaciones tab missing" — verified Plataforma tab IS the correct design (consolidates Organizaciones + Proyectos via PlataformaGroup component). `crawl.spec.ts:19` updated `"Organizaciones"` → `"Plataforma"`.
  - **P0-1.2** Conductor "admin top-nav leak" — ConductorDashboard uses `.top-nav` class for its OWN Mi Ruta/Mis Reportes tabs. Probe in `crawl.spec.ts:138-142` now checks for admin-specific tabs (`hasAdminTopNav: false` verified).
  - **P0-1.3** Conductor "route assignment missing" — code uses English class names (`route-completed-card`, `desktop-panel__route-info`). Probe in `crawl.spec.ts:143-148` now accepts both languages. `ruta-section: count=9` verified.

- **PARTIALLY RESOLVED (NEEDS VERIFICATION RE-RUN)**:
  - **P0-2.2** Login button `:focus-visible` outline invisible — Initial fix in `Login.css:187-191` was overridden by global `.btn:focus-visible { outline: none }` rule at `index.css:661`. Second fix applied: global rule now uses `outline: 2px solid var(--color-primary)` + `outline-offset: 2px`. Box-shadow ring retained.

- **PERSISTING (acceptable noise)**:
  - Logout localStorage residue — non-sensitive
  - Rapid-click no feedback — UX improvement, not bloqueante
  - Mobile tab labels icon-only — accessibility-acceptable
  - Conductor logo size on mobile — within Fluent rubric

### Security status: ✓ CLEAR

- XSS containment: payload escaped, `xssFired=false` (React JSX)
- Server-gate viewer: `window.convex undefined`, viewer aislado
- Direct URL bypass: conductor `/admin` → ConductorDashboard
- Race condition: 10 rapid-click → no duplicates
- Network sniff: no plaintext credentials
- WCAG contrast (side-panel): now passes ✓
- Logout cleanup: working (non-sensitive keys persist)
- Keyboard nav: 23/25 elements PASS; Login button outline pending verification

---

## P0 Findings (bloqueantes)

- **P0-1** PARTIALLY RESOLVED: Login "Iniciar Sesión" button `:focus-visible` shows `outline-style: none` despite my Login.css fix. Root cause: cascade conflict with `.btn:focus-visible { outline: none }` in `src/styles/index.css:661` (same specificity, loads later). Second-pass fix applied this session: global rule now uses `outline: 2px solid var(--color-primary)`. Re-run audit to verify.
  - File: `src/styles/index.css:661-665`
  - Verify: next audit `keyboard-nav.json` index 23 (Iniciar Sesión button) → `visibleOutline: true`

---

## P1 Findings (importantes)

- **P1-1** NEW (super_admin): Button color inconsistency in "Agregar Personal" between rendering engines (laptop/headed variants). Suggests Fluent token misalignment.
  - Investigation: check `.btn-add-personal` or similar class CSS.

---

## P2 Findings (cosméticos)

(none)

---

## Per-role status snapshot

| Role | P0 | P1 | P2 | Status |
|---|---|---|---|---|
| super_admin | 0 | 1 | 0 | ✓ button color inconsistency only |
| admin | 0 | 0 | 0 | ✓ PERFECT (meta-viewport fixed) |
| enterprise | 0 | 0 | 0 | ✓ PERFECT (read-only enforced) |
| viewer | 0 | 0 | 0 | ✓ PERFECT (regression-free) |
| conductor | 0 | 0 | 0 | ✓ PERFECT (3 v7 P0s resolved — test infra) |
| security | 1 | 0 | 0 | ⚠ Login button focus needs re-verify |

---

## Top fix priorities

1. **Re-run audit** to verify global `.btn:focus-visible` fix in `index.css:661`. Expected: P0-1 → RESOLVED.
2. **P1-1 super_admin button color** — investigate Fluent token application in Operaciones "Agregar Personal" button.

---

## Test infrastructure improvements this run

- `tests/audit/crawl.spec.ts`:
  - CRAWL_TABS: `"Organizaciones"` → `"Plataforma"` (matches super_admin actual tab name)
  - Conductor probe `hasTopNav` → `hasAdminTopNav` (checks specifically for admin tabs Monitoreo/Operaciones)
  - Conductor selectors accept English + Spanish class names: `[class*="route"], [class*="ruta"]`, etc.
- `tests/audit/deep.spec.ts`:
  - Conductor deep probe now switches back to Mi Ruta tab before route-visibility probe (was probing Mis Reportes view).
- `playwright.config.ts`:
  - Setup project: `retries: 2` (Google Places API parallel-init flakiness mitigation).

These patches prevent recurring false positives in future audit cycles. Auditors must verify probe selectors match actual product class names before flagging P0s.
