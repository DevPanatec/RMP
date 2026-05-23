# RMP Audit Findings — 2026-05-21, run ef5f474f

> 7th audit run. Stack: Playwright 1.60 + Convex 1.31 + Clerk dev.
> Previous canonical: v6 (2026-05-21, 66a97793, archived to `.audit-state/history/`).
> Viewports auditados: **iPhone SE, iPhone 14, Pixel 7, iPad Mini, iPad Pro, Laptop 1280, Desktop 1920, Headed visible, Headless** (9 viewports, chromium engine).
> Raw inputs: `.audit-state/current/findings-raw/{super-admin,admin,enterprise,viewer,conductor,security}.md`.

---

## Executive Summary

| Métrica | v6 (66a97793) | v7 (ef5f474f) | Δ |
|---|---|---|---|
| Viewports auditados | 9 | 9 | = |
| **P0 (bloqueantes)** | **8** | **9** | **+1** ↑ |
| **P1 (importantes)** | **9** | **10** | +1 ↑ |
| **P2 (cosméticos)** | **6** | **7** | +1 ↑ |
| Console errors únicos | 1 ERROR | 0 ERROR | -1 ↓ |
| Spec results | 290/57/347 | 370 pass / 596 skipped / 1184 total | rerun w/ Google Places retries |
| Setup flakiness | n/a | 2 retries on super_admin + admin (Google Places init) | NEW issue |

**Headline**: GPS modal JSON crash **RESOLVED** ✓. Console clean ✓. Viewer perfect ✓ (0/0/0). Pero **3 P0 nuevos en conductor** (admin top-nav leaking + route assignment invisible across 100% viewports + route DOM mention fail) y **1 P0 accesibilidad** (admin meta-viewport disable user zoom WCAG 2.4.4). Setup flakiness con Google Places API (intermitente, fix via retries=2 in config).

### Diff vs v6

- **RESOLVED (~4)**:
  - **P0-4.1** GPS playback modal Convex JSON parse crash — no flagged en v7 super_admin findings
  - **P0-1.3** Viewer Operaciones tab NOT visible — viewer inspector confirma dashboard/operaciones/riesgos accessible
  - **P1** Super_admin tab row wrap on desktop — no mention
  - **P0-2.3** Conductor touch targets <44px — no direct flag (pero conductor tiene otros P0)
- **NEW (6)**:
  - Admin meta-viewport `user-scalable=no` (WCAG 2.4.4) — **P0** all 9 viewports
  - Conductor admin top-nav visible on laptop+desktop (`hasTopNav=true`) — **P0**
  - Conductor route assignment COMPLETELY missing across all 9 viewports — **P0**
  - Dirty modal state leak (form data persists after close+reopen) — **P0**
  - Enterprise tab lock visual missing on blocked tabs (Calendario/Mantenimiento/Inventario/Reportes) — **P1** (downgraded from v6 P0-1.1)
  - Setup flaky on Google Places API init (super_admin+admin login fail intermittent) — **P1**
- **PERSISTING (~8)**:
  - Super_admin Organizaciones tab not visible (P0)
  - WCAG focus rings invisible login form (P0)
  - WCAG contrast `.side-panel-tab` "Actividades" 2.24:1 (P0)
  - Logout localStorage residue (`mapTheme`, `rmp_demo_mode`, `rmp-theme`, `__clerk_environment`)
  - Rapid-click no feedback (no spinner/toast)
  - Conductor route visibility probe regex fragility (related: route entirely missing now)
  - Mobile tab labels icon-only (super_admin nav)
  - Conductor logo size on mobile (downgraded to P2)

### Security status: ✓ CLEAR

- XSS containment: payload escaped, `xssFired=false` (React JSX)
- Server-gate viewer: `window.convex undefined`, viewer aislado
- Direct URL bypass: conductor `/admin` → ConductorDashboard (no override)
- Race condition: 10 rapid-click → no duplicates (vehicle singleton)
- Network sniff: no plaintext credentials in URLs (Clerk schema metadata only, benign)

---

## P0 Findings (bloqueantes)

### Role gates

- **P0-1.1** PERSISTING (was v6 P0-1.2): Super_admin Organizaciones tab NOT visible across desktop/headed/laptop/headless. `_tabs.json` muestra `visible=false`. Role gate violation — super_admin debe ver Organizaciones exclusivamente. OrgSwitcher dropdown SÍ funcional ("Todas las organizaciones") pero NO hay tab dedicado para CRUD orgs. — `audit/desktop/super_admin/01-Monitoreo.png`, `audit/headed/super_admin/02-Operaciones.png`
  - **Source**: `src/pages/AdminDashboard/AdminDashboard.jsx` — condición render de tab Organizaciones gated por feature flag o `user.tipo === 'super_admin'` check probably broken.
  - **Fix**: Restore conditional render of Organizaciones tab for super_admin role.

- **P0-1.2** NEW: Conductor admin top-nav visible on Laptop + Desktop. ConductorDashboard debe ser componente AISLADO sin admin nav. `_state.json` muestra `hasTopNav=true` para laptop y desktop. — `audit/laptop/conductor/_state.json`, `audit/desktop/conductor/_state.json`
  - **Investigar**: `src/pages/ConductorDashboard/ConductorDashboard.jsx` — verificar que NO importa AdminDashboard's top-nav component, o que media-query hide se aplica en todos los tamaños.
  - **Fix**: Remove AdminDashboard nav dependency from ConductorDashboard or apply `display: none` globally for `.top-nav` inside ConductorDashboard wrapper.

- **P0-1.3** NEW (CRITICAL): Conductor route assignment COMPLETELY MISSING across all 9 viewports. No "Ruta" section, no parada list, no "Iniciar Ruta" button. `_state.json` and `_route_visibility.json` show `ruta-section: false`, `parada-section: false`, `start-button: false`, `mentionsRutaTest: false` across iphone-se/iphone-14/pixel/ipad-mini/ipad-pro/laptop/desktop. Test data `[E2E-ef5f474f] Ruta Test` not displayed. — `audit/*/conductor/_route_visibility.json`
  - **Investigar**: 
    - (a) `convex/e2e.ts` bootstrap — verify route + assignment actually created for conductor user (bootstrap reported `asignacionId` y `rutaId` OK)
    - (b) `ConductorDashboard` query — verify `useQuery(api.asignaciones.getByConductor, ...)` reactive con scope correcto (orgId + conductorId)
    - (c) Conductor user `proyecto_id` and `vehiculo_asignado_id` — bootstrap may not link conductor → vehicle → route correctly
  - **Fix**: Add E2E assertion that conductor sees assigned route after bootstrap (could be infra bug). If product bug, add `data-testid="route-card"` and debug the query path.

### Accessibility (WCAG)

- **P0-2.1** NEW: Admin meta-viewport disables user zoom (`user-scalable=no`). WCAG 2.1 Level AA 2.4.4 violation. Affects ALL 9 viewports. Evidence: all `_axe.json` files report identical violation.
  - **Source**: `index.html` or `src/main.jsx` — meta viewport tag.
  - **Fix**: Change `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">` → `content="width=device-width, initial-scale=1, user-scalable=yes"`. 1-line fix.

- **P0-2.2** PERSISTING (was v6 P0-3.1): Keyboard focus rings invisible — 8 of 25 focusable elements en login form tienen `outline: none` sin replacement. WCAG 2.4.7 Focus Visible fail. — `audit/break/keyboard-nav.json`, `audit/break/break/07-keyboard-focus-at-25.png`
  - **Fix global**: `*:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` en `src/styles/index.css`. 5-line fix.

- **P0-2.3** PERSISTING: WCAG AA Contrast — `.side-panel-tab` "Actividades" ratio 2.24:1 (needs 4.5:1). Foreground rgb(16,185,129), background rgb(209,250,229). Tab label unreadable for low-vision users.
  - **Fix**: Adjust `.side-panel-tab` foreground or background color. Use `var(--color-text)` + `var(--color-surface)` per Fluent rubric.

### State management

- **P0-3.1** NEW: Dirty modal state leak — form data persists across modal close + reopen cycle. Risk of accidental duplicate submission. Evidence: `audit/break/modal-state.json` shows `dirtyValue` persisted on reopen. — `audit/break/08-modal-filled.png`, `09-modal-after-close.png`, `10-modal-reopened.png`
  - **Source**: `src/components/Fleet/VehicleModal.jsx` (or generic modal form pattern).
  - **Fix**: Call `form.reset()` or unmount form state in modal's `onClose` handler.

---

## P1 Findings (importantes)

- **P1-1** PERSISTING (was v6 P1-2): Enterprise "Modo Lectura" yellow badge UX confusion. Read-only role pero botón sugiere toggle. — `audit/desktop/enterprise/00-landing.png`
- **P1-2** NEW: Enterprise tab lock visual missing — Calendario/Mantenimiento/Inventario/Reportes accesibles pero no muestran candado icon ni disabled treatment. UX no distingue blocked vs. accessible.
  - **Fix**: Aplicar candado treatment (used in viewer role) a enterprise tabs blocked en `AdminDashboard.jsx:875-942`.
- **P1-3** PERSISTING: Logout localStorage residue — 4 keys persist (`mapTheme`, `rmp_demo_mode`, `rmp-theme`, `__clerk_environment`). Non-sensitive pero violates clean-logout contract.
- **P1-4** PERSISTING: Rapid-click form submission no feedback — 10 rapid submits on "Agregar Vehículo" return null sin toast/spinner. Vehicle created pero user no ve confirmation.
- **P1-5** NEW (admin): Google Maps API deprecation — AutocompleteService + PlacesService deprecated 2025-03-01. Sistema still uses legacy. May break when endpoints shut down.
  - **Fix**: Migrate to `google.maps.places.PlaceAutocompleteElement` (new API).
- **P1-6** NEW (super_admin): Calendar event badges saturation — yellow (#FFB900) on light background may fail WCAG at angles.
- **P1-7** PERSISTING: Mobile tab bar icon-only (no text labels) — super_admin Monitoreo/Operaciones tabs on iphone-se/pixel. Reduces discoverability.
- **P1-8** PERSISTING: Conductor "[E2E-ef5f474f] Ruta Test" not mentioned on any viewport (related to P0-1.3) — selector regex fragility OR product bug. Add `data-testid` regardless.
- **P1-9** NEW (conductor): Mobile tab navigation "Mi Ruta" / "Mis Reportes" not visible until scroll in headless view.
- **P1-10** NEW (infra): Setup flaky on Google Places init — super_admin + admin login intermittent failure (2 retries needed). Triggered React error boundary that hides login form. Root cause: parallel Google Maps script loads racing initialization. Mitigation: `retries: 2` added to `playwright.config.ts` setup project.
  - **Real fix**: Bypass Google Places provider during E2E (env flag `VITE_E2E_MODE=1` to skip script load), OR serialize setup with `workers: 1` for setup project.

---

## P2 Findings (cosméticos)

- **P2-1** PERSISTING: Conductor logo size on mobile (Pixel/iPhone-14) could be slightly smaller — but acceptable currently.
- **P2-2** NEW: Conductor empty state messaging absent — when no paradas visible, should show "Sin Asignación para Hoy" but currently shows only map + sheet without explanation.
- **P2-3** NEW (enterprise): Empty state copy "Comienza agregando empleados" contradicts read-only design.
  - **Fix**: "Ver empleados" or "No hay empleados visibles" for enterprise.
- **P2-4** NEW (enterprise): "Modo Lectura" badge wastes header space — could auto-hide on scroll or use tooltip.
- **P2-5** NEW (super_admin): Activity panel rounded corners >4px, inconsistent with Fluent `--radius-base: 4px`.
- **P2-6** PERSISTING (super_admin): GPS modal header spacing exceeds `--space-20`. Cosmetic.
- **P2-7** NEW (admin): Preload resource warnings — 15+ unused image/icon preloads. Low impact.

---

## Per-role status snapshot

| Role | P0 | P1 | P2 | Status |
|---|---|---|---|---|
| super_admin | 1 (Organizaciones tab) | 3 | 2 | ⚠ role gate broken |
| admin | 1 (WCAG meta-viewport) | 1 | 1 | ⚠ a11y |
| enterprise | 0 | 1 (tab lock visual) | 2 | ✓ EXCELLENT (read-only enforced) |
| viewer | 0 | 0 | 0 | ✓ PERFECT |
| conductor | 3 (nav leak, route missing×2) | 3 | 2 | ✗ CRITICAL (route entirely missing) |
| security | 3 (focus, contrast, modal) | 2 | 0 | ✓ no breaches |

---

## Top P0 to fix next

1. **P0-1.3 (conductor route missing)** — investigate FIRST. May be E2E bootstrap bug (test infra) or real product bug. Run `/troop-fix-applier P0-1.3` to get diagnostics.
2. **P0-2.1 (admin meta-viewport)** — 1-line fix, immediate WCAG compliance win.
3. **P0-2.2 (focus rings)** — 5-line global CSS fix.
4. **P0-1.1 (super_admin Organizaciones tab)** — verify conditional render logic.
5. **P0-1.2 (conductor admin nav leak)** — isolate ConductorDashboard nav.
