# Triage cycle 1 — 2026-05-15

## Stats
- Total findings: 77 (P0=17 P1=31 P2=29)
- New vs cycle 0: +77 (baseline)
- Sanity-gated items: schema.ts edits, CLAUDE.md edits, batch >5 files

## P0 (17)

### Scope leaks (5) — queries return cross-org rows when scopedOrg=null and user is non-super-admin
- [route_progress-01] convex/route_progress.ts:38-39 · A1 · Fix: if scopedOrg=null && !isSuperAdmin && !isCrossOrgViewer → return []
- [rutas-01] convex/rutas.ts:73-75 · A1 · Fix: same defensive return
- [asignaciones-01] convex/asignaciones.ts:19-25 · A1 · Fix: same
- [cleaning-02] convex/cleaning.ts:11-23 (listSalas) · A1 · Fix: filter by scope.organizacionId post-query when not super-admin
- [fumigaciones-01] convex/fumigaciones.ts:19-23 (listLugares) · A1 · Fix: same

### Auth bypass (1)
- [cleaning-01] convex/cleaning.ts:180 addAssignment · A1 · Fix: add `await requireWriteRole(ctx)` before requireModulo

### Migration backfill ungated (7) — auth bypass + destructive
- [asignaciones-02] convex/asignaciones.ts:304 · A1 · Fix: add `await requireSuperAdmin(ctx)` + env gate
- [cleaning-03] convex/cleaning.ts:378 · A1 · Fix: same
- [empleados-01] convex/empleados.ts:232 · A1 · Fix: same (also arbitrary defaultOrgId assignment risk)
- [fumigaciones-02] convex/fumigaciones.ts:758 · A1 · Fix: same
- [maintenance-01] convex/maintenance.ts:715 · A1 · Fix: same
- [route_events-01] convex/route_events.ts:145 · A1 · Fix: same
- [rutas-02] convex/rutas.ts:266 · A1 · Fix: same

### Frontend role gating (3)
- [admindash-01] src/pages/AdminDashboard/AdminDashboard.jsx:423-438 · A2 · Fix: gate ops-header-buttons with `(userRole==='admin' || isSuperAdmin)`
- [admindash-02] src/pages/AdminDashboard/AdminDashboard.jsx:780-788 · A2 · Fix: add `&& userRole !== 'enterprise'` to Operaciones tab cond
- [admindash-03] src/pages/AdminDashboard/AdminDashboard.jsx:728-734 · A2 · Fix: gate mantenimiento/riesgos/inventario/reportes tabs against enterprise

### Build blocker (1)
- [lint-01] .eslintrc.cjs:9 · A3 · Fix: add 'playwright-report', 'audit', 'test-results' to ignorePatterns

## P1 (31)

### Missing requireModulo (6)
- [fumigaciones-03] fumigaciones.ts:687-755 createReport · Fix: add `await requireModulo(ctx,"FUM")`
- [maintenance-03] maintenance.ts:594-641 createReport · Fix: add `await requireModulo(ctx,"MTO")`
- [inventario-03] inventario.ts:375-465 asignarDesdeAlmacen · Fix: add `await requireModulo(ctx,"INV")`
- [inventario-04] inventario.ts:544-598 registrarCompra · Fix: add
- [inventario-05] inventario.ts:755-818 registrarConsumo · Fix: add
- [fumigaciones-04] fumigaciones.ts:534-560 deletePhoto · Fix: add

### Race / atomicity (3)
- [empleados-02] empleados.ts:131-140 cedula uniqueness · Fix: accept OCC retry pattern
- [inventario-01] inventario.ts:29-36 generateCodigo race · Fix: move codigo gen inside add mutation server-side
- [inventario-02] inventario.ts:565-580 registrarCompra 3-patch · Fix: combine into one patch

### State drift (4)
- [route_progress-02] route_progress.ts:189-198 silent route close · Fix: emit route_events event on auto-close
- [route_progress-03] route_progress.ts:7-22 cleanupStaleInProgress · Fix: patch vehiculo.estado="disponible" after close if no other RP active
- [route_events-02] route_events.ts:96-125 attachPhotoToParada · Fix: emit fallback parada_completada event if target=null
- [organizaciones-01] organizaciones.ts:521-617 recomputeStorage partial · Fix: don't patch storage_bytes_used when partial=true

### Scope leak (1)
- [maintenance-02] maintenance.ts:441-442 listReports · Fix: filter by scope.organizacionId

### Frontend hardcoded colors (5)
- [plataforma-01] PlataformaPanel.jsx:10-15 ESCALA_COLORS · Fix: replace with var(--*)
- [plataforma-02] PlataformaPanel.jsx:27 `#FF8C00` · Fix: var(--color-warning-strong)
- [plataforma-03] PlataformaPanel.jsx:69 `#605E5C` · Fix: var(--color-text-secondary)
- [plataforma-04] PlataformaPanel.css:270-271 `#B22A2E` · Fix: var(--color-error-strong)
- [plataforma-05] PlataformaPanel.css:294 `rgba(0,0,0,0.4)` · Fix: var(--color-overlay)

### Frontend other (3)
- [orgdetail-01] OrgDetailDrawer.jsx:250 hex fallback in var() · Fix: ensure tokens defined, drop fallbacks
- [servicios-01] ServiciosComponent.jsx:90 inline `fontSize:'13px'` · Fix: var(--font-size-sm)
- [admindash-04] AdminDashboard.jsx:989,1074 native alert() · Fix: use notify.error toast

### Index missing (1)
- [schema-01] schema.ts inventario_movimientos · Fix: add by_organizacion + by_org_tipo_fecha indexes [SANITY-GATED schema.ts]

### Misc backend (1)
- [route_reports-01] route_reports.ts:91-106 countAll logging · Fix: log "who" when ALLOW_PURGE=1

### Cross-cut (7)
- [env-01] convex/perfiles.ts:508 + auth.config.ts:4 CLERK fallback · Fix: throw at module init in prod
- [env-02] convex/http.ts:64 SafeTag secret · Fix: warn at module-load
- [migrations-01] convex/migrations/seed_plan_fields.ts:188 non-idempotent backfill · Fix: add migration_marker per photo
- [docs-01] CLAUDE.md:393 geofenceAlerts.ts doesn't exist · Fix: remove [SANITY-GATED CLAUDE.md]
- [docs-02] CLAUDE.md:373-376 function name drift · Fix: align [SANITY-GATED]
- [docs-03] CLAUDE.md:397 cron drift · Fix: align [SANITY-GATED]
- [cleaning-04] cleaning.ts:171-194 — DEDUP with cleaning-01

## P2 (29)

### Schema validators not strict (6) — [SANITY-GATED schema.ts]
- [schema-02] route_events.timestamp v.string() vs ms convention
- [schema-03] asignaciones_rutas.estado v.string() vs union
- [schema-04] rutas.estado v.string() vs union
- [schema-05] vehiculos.estado + tipo_servicio v.string() vs union
- [schema-06] inventario.tipo_articulo v.string() vs union
- [schema-07] maintenance_tasks.estado/tipo/prioridad v.string() vs union

### Backend P2 (5)
- [inventario-06] inventario.ts:98-177 add accepts client codigo · Fix: server-side codigo gen
- [cleaning-05] cleaning.ts:233-245 storage drift on partial fail · Fix: granular try/catch
- [route_progress-04] route_progress.ts:163-183 ruta_id mismatch · Fix: validate args.ruta_id===asignacion.ruta_id
- [empleados-03] empleados.ts:30-40 stripPII salario · Verify by-design
- [organizaciones-02] organizaciones.ts:181-203 countOrgUsage activo check · Fix: explicit `=== true`
- [fumigaciones-05] fumigaciones.ts:534-560 deletePhoto order · Fix: defensive order
- [maintenance-04] maintenance.ts:441-444 admin listReports no scope · Fix: filter scope

### Frontend P2 (9)
- [orgdetail-02..06] OrgDetailDrawer ARIA/inline-styles/confirm/onBlur (5 findings)
- [plataforma-06..09] PlataformaPanel random spacing/font-size/button-as-card (4 findings)
- [servicios-02] ServiciosComponent ARIA tab pattern
- [orgcontext-01] OrganizationContext.jsx:33 setCurrentOrg not useCallback

### Cross-cut P2 (5)
- [docs-04] CLAUDE.md provider count triple inconsistency [SANITY-GATED]
- [docs-05] CLAUDE.md tipo_usuario typedoc missing super_admin/viewer [SANITY-GATED]
- [lint-02] 295 source warnings · Fix: cleanup pass
- [crons-01] crons.ts:30 11s interval rationale
- [gitignore-01] .gitignore vs eslint ignore mismatch

### Schema sanity (1) — [SANITY-GATED schema.ts already +44 lines uncommitted]
- [schema-01-needshuman] schema.ts plan/billing fields + org_audit_log table

## Worker plan (cycle 1)

Batches respecting sanity gates:

**Batch 1 — Build unblocker** (1 file): lint-01 → unblocks all subsequent builds
**Batch 2 — Scope leak P0s** (5 files): route_progress, rutas, asignaciones, cleaning, fumigaciones list queries
**Batch 3 — Auth bypass P0s** (cleaning auth + 7 migration gates = 7 files, 1 dedup) → SANITY GATE (>5 files), request approval
**Batch 4 — Frontend P0 gating** (1 file): AdminDashboard.jsx (3 P0s, same file)
**Batch 5 — P1 requireModulo + state drift** (4 files): fumigaciones, maintenance, inventario, route_progress, route_events, organizaciones → SANITY GATE (>5 files)
**Batch 6 — Frontend P1 hardcoded colors** (3 files): PlataformaPanel.jsx, PlataformaPanel.css, OrgDetailDrawer.jsx, ServiciosComponent.jsx, AdminDashboard.jsx
**Batch 7 — Cross-cut P1 env/migration** (3 files): perfiles.ts, auth.config.ts, http.ts, migrations/seed_plan_fields.ts
**Deferred to cycle 2+ or human:** schema.ts validators, CLAUDE.md drift, P2 cleanup

Per sanity gates: Batches 3 and 5 (>5 files) require user approval.
