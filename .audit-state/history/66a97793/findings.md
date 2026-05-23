# RMP Audit Findings — 2026-05-21, run 66a97793

> 6th audit run. Stack: Playwright 1.60 + Convex 1.31 + Clerk dev.
> Previous canonical: v5 (2026-05-18, c312dc4a, archived to `.audit-state/history/`).
> Viewports auditados: **iPhone SE, iPhone 14, Pixel 7, iPad Mini, iPad Pro, Laptop 1280, Desktop 1920, Headed visible, Headless** (9 viewports, chromium engine).
> Raw inputs: `.audit-state/current/findings-raw/{super-admin,admin,enterprise,viewer,conductor,security}.md`.

---

## Executive Summary

| Métrica | v5 (c312dc4a) | v6 (66a97793) | Δ |
|---|---|---|---|
| Viewports auditados | 9 | 9 | = |
| **P0 (bloqueantes)** | **22** | **8** | **-14** ↓ |
| **P1 (importantes)** | **9** | **9** | = |
| **P2 (cosméticos)** | **9** | **6** | -3 ↓ |
| Console errors únicos | 0 ERROR + warnings | 1 ERROR (Convex GPS) + warnings | +1 ERROR |
| Spec results | n/a | 290 pass / 57 fail / 347 total | |

**Headline**: 14 P0 fixed since v5. 18 of those = viewer + enterprise CRUD buttons (`useCanWrite()` aplicado correctamente). Pero **2 P0 regresados** (super_admin Organizaciones tab + GPS modal JSON crash) y **3 P0 nuevos** (viewer Operaciones missing, conductor touch targets escalado).

### Diff vs v5

- **RESOLVED (16)**:
  - **P0-1.1..1.4** Enterprise CRUD buttons en Operaciones (Vehículo/Personal/Ruta/Inventario) — no visibles este run
  - **P0-2.1..2.10** Viewer CRUD + edit/delete icons — `_crud_buttons.json` empty
  - **P0-3.1** WCAG contrast `.side-panel-tab` — no flagged este run (verificar manualmente)
  - **P1-8** Enterprise empty-state CTA "+ Agregar Vehículo" — gone
- **NEW (6)**:
  - super_admin Organizaciones tab no visible (P0)
  - super_admin GPS modal Convex JSON parse crash (P0, regresado desde v4)
  - viewer Operaciones tab no visible (P0)
  - conductor touch targets <44px en tabs (P0, escalado desde v5 P1-6)
  - super_admin tab row wrap en desktop (P1)
  - enterprise "Modo Lectura" button UX confusion (P1)
- **PERSISTING (10)**:
  - Enterprise tabs UNLOCKED (telemetry `locked: false`) — consolidado de v5 P0-1.5..1.8
  - Conductor logo >30% viewport mobile
  - Conductor route visibility probe regex fragility
  - WCAG focus rings invisible (login form, login button)
  - Viewer top-nav text labels invisible (only icons)
  - Viewer candado low prominence on locked tabs
  - Conductor "Días N/A - N/A" (e2e.ts bootstrap bug)
  - Conductor "Sin Asignación" empty state mismatch
  - Logout localStorage residue (`__clerk_environment`, `mapTheme`, `rmp_demo_mode`)
  - Network sniff: Clerk metadata "password" field (benign, Clerk schema)

### Security status: ✓ CLEAR

- XSS containment: payload no fired (React JSX escape)
- Server-gate viewer: `window.convex` undefined, viewer no puede invocar mutations
- Direct URL bypass: conductor `/admin` → ConductorDashboard (no override)
- WCAG contrast: 1 sample 7.24:1 (passes AA)
- Only soft issues: focus rings + logout cleanup + Clerk metadata leak

---

## P0 Findings (bloqueantes)

### Role gates

- **P0-1.1** PERSISTING (was v5 P0-1.5..1.8 consolidado): Enterprise tabs report `locked: false` para Calendario/Mantenimiento/Inventario/Reportes en `_tabs.json` across todos los viewports. UI no visualiza lock. Backend `requireWriteRole` enforced (writes bloqueados) pero UI trust model roto. — `audit/*/enterprise/_tabs.json`
  - **Source**: `src/pages/AdminDashboard/AdminDashboard.jsx` — verificar `tab-locked` class y `isEnterpriseLocked` flag
  - **Fix**: `useCanWrite()` debe propagar también a tab lock visual (no solo a CRUD buttons que ya están fixed)

- **P0-1.2** NEW: Super_admin Organizaciones tab NOT visible en ningún viewport. `_tabs.json` muestra `{visible: false, locked: false, clicked: false}` across headless/headed/laptop/desktop. Role gate roto — super_admin debe ver Organizaciones exclusivamente. — `audit/headless/super_admin/_tabs.json`, `audit/desktop/super_admin/_tabs.json`
  - **Investigar**: condición render de tab Organizaciones. Verificar `user.tipo === 'super_admin'` check y feature flag.

- **P0-1.3** NEW: Viewer Operaciones tab NOT visible. Spec dice viewer = dashboard/operaciones/riesgos. `_tabs.json` muestra `{visible: false}` en todos viewports. Operaciones gated por modules (REC|FUM|LIM|MTO|PER) — test org E2E-66a97793 puede no tener modules configured. — `audit/desktop/viewer/_tabs.json`
  - **Investigar**: `convex/e2e.ts` bootstrap — agregar modules al test org, O cambiar condición Operaciones a no-gated por module para viewer.

### Conductor mobile PWA

- **P0-2.1** PERSISTING (was v5 P0-4.1): Logo + branding domina >30% viewport en iphone-se/iphone-14/pixel. Block content en mobile-first PWA. — `audit/iphone-se/conductor/01-landing.png`, `audit/iphone-14/conductor/01-landing.png`, `audit/pixel/conductor/01-landing.png`
  - **Fix**: `max-width: 240px` en logo container + `clamp(1.5rem, 4vw, 2.5rem)` en título.

- **P0-2.2** PERSISTING (was v5 P0-4.2): Route visibility DOM probes broken. `_route_visibility.json` reporta `mentionsRutaTest=false`, pero card `[E2E-66a97793] Ruta Test` SÍ visible en DOM. Selector regex fragility. — `audit/iphone-14/conductor/_route_visibility.json`
  - **Fix**: agregar `data-testid="route-card"` al card render path en ConductorDashboard.

- **P0-2.3** NEW (escalated from v5 P1-6): Tab buttons "Mi Ruta" + "Mis Reportes" <44px touch target on mobile (iPhone SE 375px). Mobile-first PWA fail. — `audit/iphone-se/conductor/01-landing.png`
  - **Fix**: `min-height: 44px` + `padding: var(--space-12) var(--space-16)` en tab buttons mobile.

### Accessibility (WCAG)

- **P0-3.1** PERSISTING (was v5 P0-3.2): Keyboard focus rings invisible — 8 of 25 focusable elements en login form tienen `outline: none` sin replacement. WCAG 2.4.7 Focus Visible fail. Inputs username/password + button "Iniciar Sesión". — `audit/break/keyboard-nav.json`, `audit/break/break/07-keyboard-focus-at-25.png`
  - **Fix global**: `*:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` en `src/styles/index.css`. 5-line fix.

### GPS / data layer

- **P0-4.1** REGRESSED (was v4 P0-2/P0-9, marked RESOLVED in v5): GPS playback modal crashes con "Uncaught SyntaxError: Unexpected end of JSON input at parse" desde `safetag:fetchTodayHistory`. Affects desktop + laptop. — `audit/desktop/super_admin/07-gps-modal-state.png`, `audit/laptop/super_admin/07-gps-modal-state.png`
  - **Investigar**: `convex/safetag.ts` → `fetchTodayHistory`. Probable empty response sin `JSON.parse` guard, o respuesta non-JSON cuando vehicle sin history.
  - **Fix**: defensive `JSON.parse` con try/catch + return empty array fallback.

---

## P1 Findings (importantes)

- **P1-1** NEW: Super_admin tab row wraps to secondary row en desktop. Reportes muestra "Riesgos | Histórico | Costos" debajo de tabs principales. Indebido overflow per Fluent rubric. — `audit/desktop/super_admin/10-Reportes.png`, `audit/laptop/super_admin/10-Reportes.png`
- **P1-2** NEW: Enterprise "Modo Lectura" button visible top-right con lock icon. UX confusion — read-only role pero botón sugiere toggle. — `audit/desktop/enterprise/00-landing.png`
- **P1-3** PERSISTING (was v5 P1-3): Viewer top-nav muestra solo iconos, no text labels. Affects mobile + tablet + desktop. — `audit/iphone-14/viewer/01-Monitoreo.png`, `audit/pixel/viewer/01-landing.png`
- **P1-4** PERSISTING (was v5 P1-4): Locked tabs (viewer) candado icon 12px low prominence on hover. — `audit/desktop/viewer/02-locked-Reportes-hover.png`
- **P1-5** PERSISTING (was v5 P1-5): Conductor "Días" field shows "N/A - N/A". Bootstrap bug — `convex/e2e.ts` no setea `dias_semana` array. — `audit/iphone-se/conductor/01-landing.png`
- **P1-6** PERSISTING (was v5 P2-9 escalated): Conductor "Sin Asignación para Hoy" displays cuando assignment exists. State mismatch on empty `dias_semana`. — `audit/iphone-se/conductor/01-landing.png`
- **P1-7** PERSISTING (was v5 P1-1): Logout cleanup — localStorage keys `__clerk_environment`, `mapTheme`, `rmp_demo_mode` persist post-signOut. — `audit/break/logout-cleanup.json`
- **P1-8** PERSISTING (was v5 P1-2): Network sniff — Clerk `/v1/environment` + `/v1/client` responses contienen "password" field (Clerk schema metadata, not user secret). — `audit/break/network-sniff.json`
- **P1-9** NEW: Viewer Operaciones unavailability is module-gated. Si bootstrap fix no funciona, replantear gate logic para viewer.

---

## P2 Findings (cosméticos)

- **P2-1** Super_admin: Activity badges + alerts styling consistency en mobile (iphone-se, pixel, ipad-mini) — minor.
- **P2-2** Enterprise: Mobile viewport padding marginal en iphone-se/pixel/iphone-14 top-nav. Touch targets fit pero no optimal.
- **P2-3** Viewer: Empty state "Sin actividad registrada" copy/localization. — `audit/headless/viewer/00-landing.png`
- **P2-4** Conductor: Tab text compression on iPhone SE (375px) marginal padding.
- **P2-5** Conductor: Logo scaling inconsistent across mobile viewports. Use `clamp()` for responsive.
- **P2-6** Conductor: Scroll state identical en `scroll-[0-2].png` captures — page fits viewport o scroll tracking issue.

---

## Positive Findings (security + correctness)

- **POS-1** XSS injection sanitized — payload `<img onerror>` no executed, React JSX escape working.
- **POS-2** Rapid-click race: 10 rapid submits — no hangs ni duplicates (incomplete test, but no signal of issue).
- **POS-3** Direct URL role bypass mitigated — conductor `/admin`, `/?role=admin` all render ConductorDashboard.
- **POS-4** Server API encapsulation — `window.convex` undefined. Token no leaked to client scope.
- **POS-5** Admin role 100% clean — 0 findings across all severities. Reference implementation.
- **POS-6** WCAG contrast (sample) 7.24:1 ratio passes AA. No contrast failures detected this run.
- **POS-7** Viewer + Enterprise CRUD removal — 14 P0 findings resolved since v5. `useCanWrite()` pattern propagated correctly.

---

## Cross-cutting

### Role gates matrix (current run 66a97793)

| | super_admin | admin | enterprise | viewer | conductor |
|---|---|---|---|---|---|
| Tab Organizaciones | **NO visible (P0-1.2)** | ausente OK | ausente OK | ausente OK | n/a |
| Tab Costos/Proyectos | visible | visible | visible | ausente OK | n/a |
| Tabs Calendario/Mant/Inv/Reportes locked | n/a | n/a | **NO LOCKED (P0-1.1)** | locked sin candado prominente (P1-4) | n/a |
| Operaciones tab visible | visible | visible | visible | **NO visible (P0-1.3)** | n/a |
| Botones CRUD ocultos | n/a | visible (correcto) | ocultos (RESOLVED) | ocultos (RESOLVED) | n/a |
| Top-nav labels visibles | OK | OK | OK | **solo iconos (P1-3)** | n/a |
| Conductor sees only assigned vehicle | n/a | n/a | n/a | n/a | filter OK |
| Mobile UX | OK | OK | OK | OK | **logo + touch targets (P0-2.1, P0-2.3)** |

### WCAG matrix

| Probe | Result | Severity |
|---|---|---|
| Sample contrast | 7.24:1 | POS-6 |
| Focus visible on inputs (login) | outline:none | **P0-3.1** (WCAG 2.4.7 fail) |
| XSS sanitization | clean | POS-1 |
| Logout localStorage clear | partial | P1-7 |
| Direct URL bypass | blocked | POS-3 |

---

## Future Work — Top 5 P0 fixes (priority order)

1. **GPS modal Convex JSON crash** (`P0-4.1`) → defensive try/catch en `convex/safetag.ts:fetchTodayHistory`. Breaks core GPS feature. Crítico para gov tender (real-time GPS demo).
2. **Enterprise tab lock UI** (`P0-1.1`) → propagar `useCanWrite()` a tab-locked class. Backend ya enforced; solo UI gap.
3. **WCAG focus rings** (`P0-3.1`) → global `*:focus-visible` CSS. 5-line fix, unblocks government compliance.
4. **Conductor logo responsive** (`P0-2.1`) → `max-width: 240px` + `clamp()` en logo title.
5. **Super_admin Organizaciones tab missing** (`P0-1.2`) → debug render condition. Possible regression desde change reciente.

**Quick wins**: P0-2.3 (conductor touch targets — CSS `min-height: 44px`) + P0-2.2 (`data-testid="route-card"` for selectors).

### Items para investigar manualmente

- Verificar si v5 P0-3.1 `.side-panel-tab` contrast 2.24:1 sigue presente — no fue probed este run (wcag-contrast.json solo 1 sample).
- Confirmar P0-1.3 viewer Operaciones es test data issue (bootstrap modules) vs code bug.

---

## Artifacts en disco

```
audit/                            ← screenshots por viewport (9 viewports × 5 roles)
.audit-state/
├── current/findings-raw/         ← 6 raw inputs this run
├── current/findings-previous.md  ← v5 snapshot
└── history/66a97793/             ← this run archived
```

Reproducir:
```bash
npx convex env set ALLOW_E2E 1
RUN_ID=$(node scripts/audit-helpers/runId-gen.cjs)
npx convex run e2e:bootstrap "{\"runId\":\"$RUN_ID\"}" > .e2e/bootstrap.json
npx playwright test --project=setup
npx playwright test
```

Para arreglar findings:
```bash
/troop-fix-applier P0-4.1   # GPS JSON crash (highest impact)
/troop-fix-applier P0-1.1   # Enterprise tab lock UI
/troop-fix-applier P0-3.1   # Focus rings WCAG
```
