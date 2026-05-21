# Audit Cycle 1 — Super-Admin Panel Implementation

**Date:** 2026-05-15
**Auditors:** 3 (parallel)
**Total findings:** 50+

## STATS GLOBAL

| Category | P0 | P1 | P2 | Total |
|---|---|---|---|---|
| Backend gating | 7 | 0 | 0 | 7 |
| Storage counter | 1 | 2 | 1 | 4 |
| Frontend gating | 5 | 3 | 2 | 10 |
| UI gaps (missing components) | 2 | 0 | 0 | 2 |
| Type safety | 0 | 1 | 0 | 1 |
| Schema | 1 | 1 | 1 | 3 |
| Validation | 0 | 4 | 1 | 5 |
| Robustness | 0 | 2 | 2 | 4 |
| Hardcoded tokens | 0 | 0 | 6 | 6 |
| Audit log gaps | 0 | 2 | 0 | 2 |
| Tests / docs | 1 | 0 | 0 | 1 |

**Verdict:** 28 of 48 mutations ungated (58%). Backend gating is severely incomplete. Frontend gating only partial on AdminDashboard. UI components inlined instead of separate files. ConductorDashboard has zero gating.

---

## P0 — Bloqueantes producción

### Backend gating gaps (28 ungated mutations)

**G-002** REC ungated: `rutas.ts:166,200,215` (update, updateEstado, remove)
**G-003** REC ungated: `asignaciones.ts:45,200,245,274` (add, update, updateEstado, remove) — also no requireModulo import
**G-004** LIM ungated: `cleaning.ts:49,76,128,192,210,330` (updateSala, deleteSala, addArea, updateAssignment, deleteAssignment, createReport)
**G-005** FUM ungated: `fumigaciones.ts:26,48,77,335,410,426` (addLugar, updateLugar, deleteLugar, update, updateEstado, deleteAssignment)
**G-006** INV ungated: `inventario.ts:178,216,234,249,273` (addToLocation, updateLocationQuantity, removeFromLocation, update, remove)
**G-007** PER ungated: `empleados.ts:147,170,183,196` (update, deactivate, activate, remove)
**G-008** MTO ungated: `maintenance.ts:167,195,251,274,286,391` (updateTask, deleteTask, addAlert, markAsRead, deleteAlert, deletePhoto)

Additional: `route_progress.start/update/complete`, `route_events.add/attachPhotoToParada`, `route_reports.add` — all REC.

### Storage counter integrity

**G-001** `maintenance.ts:391` deletePhoto NO decrementa counter → drift acumulado
**S-001** `cleaning.ts:210` deleteAssignment cascades photos sin decrementar
**S-002** `fumigaciones.ts:426` deleteAssignment cascades photos sin decrementar

### Frontend gating gaps

**F-002** `AdminDashboard.jsx:782` Operaciones ungated (contiene REC + FUM + LIM)
**F-006** `src/components/Servicios/ServiciosComponent.jsx:10-28` sub-tabs Fum/Lim ungated
**F-017** `ConductorDashboard` no usa useOrganization — cero gating

### UI components missing del plan

**F-015** `OverflowAlertBanner.jsx` no existe (solo inline en card)
**F-016** `UpgradeCompareModal.jsx` no existe

### Schema / migration

**S-002 (Auditor #3)** `convex/migrations/seed_plan_fields.ts` no existe → orgs legacy sin escala/modulos en DB

### Critical UX bug

**F-010** `OrgDetailDrawer.jsx:421-422` `JSON.stringify(entry.before_value)` puede crashear en circular refs / undefined

---

## P1 — Importantes (seguridad/integridad/UX)

### Validation gaps

**V-001** `setEscala` no chequea overflow post-downgrade
**V-002** `setCustomCap` sin upper sanity (acepta 1M users)
**V-003** `setActive(false)` no desconecta sessions activas
**V-004** `toggleModulo` permite activar roadmap silenciosamente
**V-005** `files.deleteFile` sin gate de ownership

### Type safety

**S-004** `writeAuditLog/incrementOrgStorage/countOrgUsage` usan `ctx: any`

### Audit log gaps

**A-003** `organizaciones.add` no escribe audit log al crear org
**A-004** `organizaciones.update` (nombre/slug) no escribe audit log

### Robustness

**S-005** `recomputeStorage` sin paginación → timeout en orgs grandes
**S-007** `file_size` sigue `v.optional` — uploads sin size silencian counter

### UX

**F-007** `OrgDetailDrawer` auto-refresh post-mutation — verificar
**F-008** `recomputeStorage` no muestra el `drift` returned
**F-009** `setDiscount` onBlur no valida NaN
**F-014** Drawer sin Escape keyboard / focus trap

---

## P2 — Nice-to-have

**S-006** `listWithStats` O(N×M) → cache 5min o denormalized counters
**S-008** audit log `before_value: v.any()` sin truncate
**F-011–F-020** Hardcoded design tokens (12 instances)
**R-003** `listWithStats` incluye orgs `activo=false`
**A-005** `org_audit_log` falta index `by_action`

---

## P3 — Docs / tests

**T-001** Zero tests for limits.ts, modules.ts, organizaciones.ts mutations
**D-001** CLAUDE.md sin sección Super-Admin Panel
**D-002** SuperAdmin sin README

---

## Worker dispatch plan

Sequential (mismo archivo → no parallel risk):

1. **W1 — Backend gating bulk** (10 archivos · ~30 mutations · 1 hora) ← arrancar
2. **W2 — Storage counter completeness** (3 archivos · cascading deletes · 20min)
3. **W3 — Audit log + validation + type safety** (organizaciones.ts · 30min)
4. **W4 — Frontend gating expansion** (Servicios + Conductor + Operaciones · 30min)
5. **W5 — Missing UI components** (OverflowAlertBanner + UpgradeCompareModal · 45min)
6. **W6 — Drawer UX fixes** (auto-refresh + drift display + setDiscount + JSON.stringify safe + keyboard · 30min)
7. **W7 — Backfill migration** (seed_plan_fields.ts · 30min · GATED por ALLOW_BACKFILL=1)
8. **W8 — Hardcoded tokens cleanup** (CSS + JSX · 15min)

Re-audit después de cada batch. Loop hasta cero P0.
