# RMP Audit Findings — 2026-05-18, run c312dc4a

> 5th audit run. Stack: Playwright 1.60 + Convex 1.31 + Clerk dev.
> Previous canonical: v4 (2026-05-13, archived to `.audit-state/history/`).
> Modes auditados: **iPhone SE, iPhone 14, Pixel 7, iPad Mini, iPad Pro, Laptop 1280, Desktop 1920, Headed visible, Headless** (9 viewports, chromium engine).
> Raw inputs: `.audit-state/current/findings-raw/{super-admin,admin,enterprise,viewer,conductor,security}.md`.

---

## Executive Summary

| Métrica | v4 (prev) | c312dc4a (current) | Δ |
|---|---|---|---|
| Viewports auditados | 9 | 9 | = |
| **P0 (bloqueantes)** | **14** | **22** | +8* |
| **P1 (importantes)** | **22** | **9** | -13 |
| **P2 (cosméticos)** | **9** | **9** | = |
| Console errors únicos | 1 ERROR + 24 warnings | 0 ERROR + warnings | -1 ERROR |
| Positive findings | 5 | 4 (security controls clear) | -1 |

*P0 delta explanation*: viewer + enterprise role-gate findings now itemized individually per CRUD button (10 + 8) instead of grouped (was P0-3 + P0-5 in v4). **Underlying defects PERSIST** — no net-new role-gate breaks. WCAG + focus-ring findings continue from v4.

### Diff vs previous

- **NEW**: 0 critical defects. Itemization expanded (viewer/enterprise CRUD buttons broken out per-tab).
- **PERSISTING**: 22 P0, ~6 P1 (role gates, WCAG, conductor logo, conductor route visibility, focus rings, logout cleanup, network exposure).
- **RESOLVED** (or not re-tested this run):
  - **P0-2/P0-9** (GPS Playback safetag JSON.parse crash) — not flagged in current console output. Possibly fixed by recent backend hardening. Needs explicit verification next run.
  - **P0-10** (activity feed duplicates) — not flagged this run. May be RESOLVED.
  - **P0-11** (Asignación subtab coverage gap) — spec issue, not bug.
  - **P1-3** ("+ Cobrar dato" typo) — not flagged.
  - **P1-15, P1-16, P1-17** (preload warnings, Google Maps deprecated, MapLibre missing image) — admin report P2-1 confirms preload still present, others not surfaced.
  - **POS-2, POS-3, POS-4, POS-5** still hold (rapid-click, no PII leak, convex not in window, SPA route forced).

### Security status: ✓ CLEAR

- No XSS executed (React JSX escape working)
- No auth bypass via URL or rapid-click race condition
- No critical token leaks
- Convex client not exposed on `window`

---

## P0 Findings (bloqueantes)

### Role gates — `enterprise` (8 findings, all PERSISTING from v4)

CLAUDE.md says enterprise = read-only. Frontend exposes CRUD + locked tabs unlocked. Server-side `requireWriteRole` blocks mutations, but UI trust model broken.

- **P0-1.1** PERSISTING: `+ Agregar Vehículo` button visible in Flota — `audit/desktop/enterprise/02-Operaciones-flota.png`, `audit/laptop/enterprise/02-Operaciones-flota.png`
- **P0-1.2** PERSISTING: `+ Agregar Personal` + `+ Crear Perfil` visible in Personal — `audit/desktop/enterprise/02-Operaciones.png`
- **P0-1.3** PERSISTING: `+ Nueva Ruta` visible in Servicios/Rutas — `audit/laptop/enterprise/02-Operaciones-servicios.png`
- **P0-1.4** PERSISTING: `+ Nuevo Item` visible in Inventario — `audit/desktop/enterprise/06-Inventario.png`
- **P0-1.5** PERSISTING: Tab `Calendario` UNLOCKED — `audit/desktop/enterprise/03-Calendario.png`
- **P0-1.6** PERSISTING: Tab `Mantenimiento` UNLOCKED — `audit/desktop/enterprise/04-Mantenimiento.png`
- **P0-1.7** PERSISTING: Tab `Inventario` UNLOCKED — `audit/desktop/enterprise/06-Inventario.png`
- **P0-1.8** PERSISTING: Tab `Reportes` UNLOCKED — `audit/desktop/enterprise/10-Reportes.png`

**Source**: `src/pages/AdminDashboard/AdminDashboard.jsx:787-858` applies `tab-locked` solo si `isViewer`. Enterprise queda fuera.
**Fix**: `useCanWrite()` hook + `isEnterpriseLocked` decision. Propagate to Personnel/Fleet/Routes/Inventory components.

### Role gates — `viewer` (10 findings, all PERSISTING from v4)

Most-restricted role. Should be read-only with locked tabs showing candado icon.

- **P0-2.1** PERSISTING: `+ Agregar Personal` visible in Personal — `audit/headless/viewer/02-Operaciones-personal.png`
- **P0-2.2** PERSISTING: `+ Crear Perfil` visible in Personal — `audit/headless/viewer/02-Operaciones-personal.png`
- **P0-2.3** PERSISTING: `+ Agregar Vehículo` visible in Flota — `audit/headless/viewer/02-Operaciones-flota.png`
- **P0-2.4** PERSISTING: `+ Nueva Ruta` visible in Servicios — `audit/headless/viewer/02-Operaciones-servicios.png`
- **P0-2.5** PERSISTING: Edit (pencil) + delete (trash) icons on vehicle card — `audit/headless/viewer/02-Operaciones-flota.png`
- **P0-2.6** PERSISTING: Edit + delete icons on route card — `audit/headless/viewer/02-Operaciones-servicios.png`
- **P0-2.7** PERSISTING: Edit + delete on Recolección service routes — `audit/headless/viewer/02-Operaciones-servicios.png`
- **P0-2.8** PERSISTING: iPhone-SE CRUD buttons visible on mobile — `audit/iphone-se/viewer/02-Operaciones.png`, `audit/iphone-se/viewer/02-Operaciones-flota.png`
- **P0-2.9** PERSISTING: Locked tabs (Calendario/Mantenimiento/Inventario/Reportes) show NO candado icon, only grayed icons — `audit/headless/viewer/02-locked-Calendario-hover.png`
- **P0-2.10** PERSISTING: CRUD pattern repeats across all 9 viewports (no role-aware rendering)

**Fix**: same as enterprise — `useCanWrite()` hook. Add visible candado SVG to locked tabs.

### Accessibility — WCAG failures (2 findings, PERSISTING from v4)

- **P0-3.1** PERSISTING (was P0-12): `.side-panel-tab` "Actividades" contrast ratio **2.24:1** — below WCAG AA threshold (3.0 large, 4.5 normal) — `audit/break/wcag-contrast.json`
- **P0-3.2** PERSISTING (was P0-13): Keyboard focus invisible — 8 INPUT fields + login button have `outline: none` without replacement (WCAG 2.4.7 Focus Visible fail) — `audit/break/keyboard-nav.json`

**Why importa**: gobierno municipal panameño tiene requirements de accesibilidad (Ley 15 sobre TIC). Tender puede tener cláusula a11y → descalificación.

**Fix P0-3.1**: cambiar `color: var(--color-success)` por darker, o invertir bg/fg.
**Fix P0-3.2**: agregar global `*:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }`.

### Conductor — mobile-first PWA breaks (2 findings, PERSISTING from v4)

- **P0-4.1** PERSISTING (was P0-7): Logo + branding text domina >30% del mobile viewport across iphone-se/iphone-14/pixel — `audit/iphone-se/conductor/01-landing.png`
- **P0-4.2** PERSISTING (was P0-8 partial): Route assignment visibility broken — `_route_visibility.json` shows `mentionsRutaTest=false`, `mentionsParadaCount=0` en todos viewports, pero la ruta `[E2E-c312dc4a] Ruta Test` SÍ está en el DOM. Probes no matchean.

**Fix P0-4.1**: `max-width: 240px; margin: 0 auto;` en logo container. `clamp(1.5rem, 4vw, 2.5rem)` para título.
**Fix P0-4.2**: investigar render path en ConductorDashboard. Agregar `data-testid="route-card"` para evitar text-based selector fragility.

---

## P1 Findings (importantes)

- **P1-1** PERSISTING (security report P1): Logout state leak — `__clerk_environment`, `mapTheme`, `rmp_demo_mode` localStorage keys persist after signOut. Benignas pero patrón malo. **Fix**: `localStorage.clear()` en `signOut()` (AuthContext) post Clerk signOut.
- **P1-2** PERSISTING (security report P1): Network exposure — Clerk `/v1/environment` + `/v1/client` responses contienen "password" field references (schema descriptors, no real passwords).
- **P1-3** PERSISTING (was v4 P1-2): Viewer top-nav perdió text labels — solo iconos visibles — `audit/headless/viewer/03-Calendario-locked.png`
- **P1-4** PERSISTING: Locked tabs (viewer) lack candado indicator on hover — `audit/headless/viewer/02-locked-Calendario-hover.png`
- **P1-5** Conductor: Route "Días" field shows "N/A - N/A" — bootstrap bug (`convex/e2e.ts` no setea `dias_semana`). Reflects UI fragility cuando `dias_semana` empty.
- **P1-6** Conductor: Tab buttons (Mi Ruta / Mis Reportes) en minimum touch target threshold on mobile — may fail 44px requirement.
- **P1-7** Super_admin: Calendar KPIs dark navy header typography consistency check across mobile — `audit/laptop/super_admin/03-Calendario.png`
- **P1-8** PERSISTING (was v4 P1-13): Enterprise empty state copy "Agrega tu primer vehículo para comenzar..." con CTA `+ Agregar Vehículo` para read-only role — engañoso. — `audit/desktop/enterprise/02-Operaciones-flota.png`
- **P1-9** Enterprise: Mobile viewport overflow — `audit/iphone-14/enterprise/01-Monitoreo.png` top nav may compress.

---

## P2 Findings (cosméticos)

- **P2-1** PERSISTING (was v4 P1-15): Google Maps preload warnings — `lugares/*.jpeg`, `mapas/*.png` not used within few seconds — `audit/headless/admin/_console.json`
- **P2-2** Super_admin: Mobile Org switcher + tab nav responsive layout visual consistency
- **P2-3** Super_admin: Operaciones CRUD buttons visual consistency check
- **P2-4** Super_admin: Costos tab — KPI badge sizing check
- **P2-5** Enterprise: Fluent radius consistency on modal buttons
- **P2-6** Enterprise: KPI badges alignment on desktop slightly off scale
- **P2-7** Viewer: Mobile layout — "Agregar Personal" + "Crear Perfil" buttons stack vertically full-width on iPhone-SE
- **P2-8** Conductor: Scroll state identical across `scroll-[0-2].png` captures on iphone-se
- **P2-9** Conductor: Empty state "Sin Asignación para Hoy" displays when assignment exists (correct fallback when `dias_semana` empty, but confusing UX)

---

## ✅ Positive Findings (security controls passing)

- **POS-1** XSS injection sanitized — `<img src=x onerror>` + `<script>` payloads did NOT execute. React JSX escape working.
- **POS-2** Rapid-click race condition prevented — 10 rapid submits = 0 duplicates.
- **POS-3** Direct URL role bypass mitigated — conductor cannot override via `/?role=admin` or direct URL paths.
- **POS-4** Server API encapsulation — `window.convex` undefined. Token not leaked to client scope.

---

## Cross-cutting

### Role gates matrix (current run c312dc4a)

| | super_admin | admin | enterprise | viewer | conductor |
|---|---|---|---|---|---|
| Tab Organizaciones | ✅ visible | ✅ ausente | ✅ ausente | ✅ ausente | n/a |
| Tabs Costos/Proyectos | ✅ | ✅ | ❓ visible | ✅ ausente | n/a |
| Tabs Calendario/Mant/Inv/Reportes locked | n/a | n/a | **❌ NO LOCKED (P0-1.5..1.8)** | ⚠️ locked sin candado (P0-2.9, P1-4) | n/a |
| Botones CRUD ocultos en Operaciones | n/a | ✅ visible | **❌ visible (P0-1.1..1.4)** | **❌ visible (P0-2.1..2.7)** | n/a |
| Top-nav labels visibles | ✅ | ✅ | ⚠️ ok desktop | **❌ solo iconos (P1-3)** | n/a |
| Conductor ve ruta asignada | n/a | n/a | n/a | n/a | parcial (DOM sí, probes no — P0-4.2) |

### WCAG matrix

| Probe | Result | Severity |
|---|---|---|
| `.side-panel-tab` contrast | 2.24:1 | **P0** (fail AA + AAA) |
| Focus visible on inputs (login) | outline:none | **P0** (WCAG 2.4.7 fail) |
| XSS sanitization | clean | ✅ POS-1 |
| Logout localStorage clear | partial | P1 |
| Direct URL bypass | blocked | ✅ POS-3 |

---

## Future Work — Top 5 P0 fixes (in suggested order)

1. **Role gates UI for viewer + enterprise** (`P0-1.*`, `P0-2.*` — 18 findings) → single fix: `useCanWrite()` hook + propagate. Highest ROI. Use `/troop-fix-applier P0-1.1` to start.
2. **WCAG focus rings** (`P0-3.2`) → global `*:focus-visible` CSS. 5-line fix, unblocks government compliance.
3. **WCAG contrast `.side-panel-tab`** (`P0-3.1`) → token swap.
4. **Conductor logo responsive** (`P0-4.1`) → CSS clamp + max-width.
5. **Conductor route visibility probes** (`P0-4.2`) → add `data-testid="route-card"` + investigate render race.

After these 5: P0 count drops from 22 → 4 (the 4 being itemizations within the 2 conductor + 2 a11y issues).

### Verification needed next run

- **P0-2** v4 GPS Playback safetag JSON.parse crash — confirm RESOLVED via explicit GPS playback test
- **P0-10** v4 activity feed duplicates — confirm RESOLVED
- **P0-6** v4 cross-org leak Fumigación/Limpieza counts — needs targeted cross-org spec

---

## Artifacts en disco

```
audit/                            ← screenshots por viewport
.audit-state/
├── current/findings-raw/         ← 6 raw inputs this run
├── current/findings-previous.md  ← v4 snapshot
└── history/c312dc4a/             ← this run archived
```

Reproducir:
```bash
npx convex env set ALLOW_E2E 1
RUN_ID=$(node scripts/audit-helpers/runId-gen.cjs)
npx convex run e2e:bootstrap "{\"runId\":\"$RUN_ID\"}" > .e2e/bootstrap.json
npx playwright test --project=setup
npx playwright test
```
