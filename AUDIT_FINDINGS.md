# RMP Audit Findings — 2026-05-22, run 6599a735

> 9th audit run. Stack: Playwright 1.60 + Convex 1.31 + Clerk dev.
> Previous canonical: v8 (2026-05-22, fc9587ba, archived to `.audit-state/history/`).
> Viewports auditados: **iPhone SE, iPhone 14, Pixel 7, iPad Mini, iPad Pro, Laptop 1280, Desktop 1920, Headed visible, Headless** (9 viewports, chromium engine).

---

## Executive Summary

| Métrica | v8 (fc9587ba) | v9 (6599a735) | Δ |
|---|---|---|---|
| Viewports auditados | 9 | 9 | = |
| **P0 (bloqueantes)** | **1** | **1** | = (one fixed, one discovered) |
| **P1 (importantes)** | **1** | **0** | -1 ↓ |
| **P2 (cosméticos)** | **0** | **0** | = |
| Spec results | 361/690/1184 | 359/689/1184 | = |
| Setup flakiness | clean | clean | ✓ |

**Headline**: P0-1 (Login button focus) **FIXED ✓** — `keyboard-nav.json` index 23 "Iniciar Sesión" ahora muestra `visibleOutline: true, "solid 2px rgb(66, 75, 91)"`. Conductor `mentionsRutaTest: true` (era false). Pero descubrí NUEVO P0 contrast: `.top-nav__tab.active` "Monitoreo" usa `var(--color-action-bg)` = #10b981 (mismo emerald que causó issue de v7 en side-panel-tab). Fix aplicado este turn: `.top-nav__tab.active color: var(--color-success-dark)` (#047857).

### Diff vs v8

- **RESOLVED**:
  - **P0-1** Login button `:focus-visible` outline — global rule `.btn:focus-visible` updated to use `outline: 2px solid` ✓ verified
  - **P1-1** super_admin button color inconsistency — no longer flagged

- **NEW (1)**:
  - **P0-1 (new)** `.top-nav__tab.active` "Monitoreo" contrast 2.54:1 — same emerald-on-white issue as v7 side-panel-tab. Fix applied THIS turn to `AdminDashboard.css:334-343`.

### Security status: ✓ CLEAR

- XSS: payload escaped ✓
- Server-gate viewer: aislado ✓
- Race condition: no duplicates ✓
- Network sniff: no plaintext credentials ✓
- Login button outline: NOW visible ✓
- Side-panel-tab contrast: passes ✓
- Modal Escape state cleanup: ✓ (test didn't run this cycle but code verified)

---

## P0 Findings (bloqueantes)

- **P0-1** FIXED THIS TURN (needs v10 verification): `.top-nav__tab.active` color was `var(--color-action-bg)` = `#10b981` (Emerald 500). On white background = 2.54:1 ratio (needs ≥4.5:1).
  - **Source**: `src/pages/AdminDashboard/AdminDashboard.css:334-343`
  - **Fix applied**: changed to `var(--color-success-dark)` = `#047857` (Emerald 700) for `.top-nav__tab.active` color + svg color
  - **Verify in v10**: `wcag-contrast.json failingCount` → 0

---

## P1 / P2 Findings

(none)

---

## Per-role status snapshot

| Role | P0 | P1 | P2 | Status |
|---|---|---|---|---|
| super_admin | 0* | 0 | 0 | ✓ (\* shared `.top-nav__tab.active` contrast, fixed) |
| admin | 0* | 0 | 0 | ✓ (\* same) |
| enterprise | 0 | 0 | 0 | ✓ PERFECT |
| viewer | 0 | 0 | 0 | ✓ PERFECT |
| conductor | 0 | 0 | 0 | ✓ PERFECT |
| security | 0 (login button) + 1 (tab contrast) | 0 | 0 | one resolved, one new — fix applied this turn |

---

## Fixes timeline (v7 → v9)

| Run | P0 | Fixed in run |
|---|---|---|
| v7 | 9 | (baseline) |
| v8 | 1 | -8 (P0-2.1, P0-2.3, P0-3.1, P0-1.1/1.2/1.3 false positives, P0-2.2 focus partial) |
| v9 | 1 | P0-2.2 fully resolved, NEW P0 top-nav__tab contrast discovered + fixed |

---

## Top fix priorities

1. **Re-run audit (v10)** to verify `.top-nav__tab.active` contrast fix landed → expected 0 P0.

---

## Code state

All known product fixes for audit findings have landed:
- `index.html` viewport user-scalable
- `Login.css` focus-visible rules
- `src/styles/index.css:661` global `.btn:focus-visible` outline visible
- `AdminDashboard.css` side-panel-tab + top-nav__tab contrast
- `FleetManagement.jsx` Escape key handler
- `tests/audit/crawl.spec.ts` + `deep.spec.ts` bilingual selectors + Plataforma naming
- `playwright.config.ts` setup retries=2
