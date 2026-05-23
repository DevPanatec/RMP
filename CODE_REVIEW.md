# RMP Code Review — 2026-05-21

> Code-level audit complementario al `AUDIT_FINDINGS.md` (Playwright visual). 6 agentes paralelos, cada uno auditando un dominio.
> Scope: lógica de negocio, security gaps, race conditions, validación, integridad de datos, design system compliance.
> Salida raw por agente en `.code-review/<dominio>.md` (routes.md + services.md escritos; otros solo en este consolidado).

---

## Executive Summary

| Dominio | P0 | P1 | P2 | Total |
|---|---|---|---|---|
| **auth + tenancy** | 3 | 5 | 4 | 12 |
| **fleet + GPS + geofencing** | 3 | 3 | 3 | 9 |
| **routes lifecycle** | 2 | 5 | 0 | 7 |
| **services (cleaning/fumigation/maintenance)** | 0 | 4 | 2 | 6 |
| **operations (personnel/inventory/reports)** | 4 | 5 | 5 | 14 |
| **UI Fluent + PWA + mobile** | 2 | 4 | 3 | 9 |
| **TOTAL** | **14** | **26** | **17** | **57** |

**Headline**: Foundation sólida (auth + scoping OK 90%, webhook HMAC OK, fumigation frequency enforced, mobile responsive). Pero **14 P0 críticos** en superficies dispersas: data integrity (operations), GPS (Mapbox key + IMEI + crash), routes idempotency, seed mutations exposed, logo mobile.

---

## P0 Findings (bloqueantes / crítico)

### Auth + Multi-tenancy (3)

- **P0-A.1** Seed mutations exposed como public — `convex/seed/migrateToOrganizations.ts:20,89,112,135` (`runMigration`, `seedCreateOrg`, `seedMoveUserToOrg`, `promoteToSuperAdmin`). Solo gated por env `ALLOW_SEED=1`. Si el env leak a prod → cualquiera puede ejecutar.
  - **Fix**: convertir a `internalMutation` o wrap en `action` que valide rol primero.

- **P0-A.2** `diagramEngine.ts:291` — weak role check inline (`if (!scope.isAdmin && !scope.isSuperAdmin)`) en vez de `await requireAdminWrite(ctx)`. Inconsistencia + frágil ante refactor.
  - **Fix**: usar helper canónico.

- **P0-A.3** `convex/perfiles.ts:274` — `update()` mutation NO valida que `proyecto_id` pertenezca al org del usuario. `setProyecto()` SÍ valida (líneas 250-256). Gap permite cross-org boundary crossing si user updates self.
  - **Fix**: copiar guard de `setProyecto` a `update`.

### Fleet + GPS (3)

- **P0-F.1** **Mapbox API token expuesto en frontend** — `src/components/Map/MapLibreComponent.jsx:59` inyecta `VITE_MAPBOX_TOKEN` en URL de fetch. Quota exhaust, OSINT de rutas, abuso.
  - **Fix**: mover routing a backend action; frontend llama `/api/route-planning` que invoca Mapbox server-side con secret key.

- **P0-F.2** **`fetchTodayHistory` crash confirmado** — `convex/safetag.ts:455-475`. SafeTag API devuelve string vacío o non-JSON; `JSON.parse("")` throws antes del try/catch en `fetchLocationHistory:431-439`. **Esto es el regression P0-4.1 del audit visual**.
  - **Fix**: `if (!rawText || rawText.trim().length === 0) { locations = []; }` antes del parse.

- **P0-F.3** **IMEI uniqueness no enforced en schema** — `convex/vehiculos.ts:319-328` solo hace `query().first()` check; concurrent inserts pueden race past. Dos vehículos con mismo IMEI → webhook routes location updates al vehículo equivocado.
  - **Fix**: `.index("by_safetag_device", ["safetag_device_id"], { unique: true })` en schema.

### Routes lifecycle (2)

- **P0-R.1** **`route_progress.complete()` sin idempotency** — llamar dos veces crea **2 entries** en `route_reports`. Sin unique constraint + sin guard check al inicio.
  - **Fix**: check `route_progress.estado === "en_progreso"` antes de proceder, throw si ya completada. Considerar unique constraint en `(asignacion_id, estado=completada)`.

- **P0-R.2** **No unique constraint on active route_progress per vehicle** — rapid `start()` calls crean duplicates orphaned. Vehículo queda con múltiples `en_progreso` simultáneos.
  - **Fix**: schema unique constraint en `(vehiculo_id, estado='en_progreso')` o equivalente check pre-insert.

### Operations (4)

- **P0-O.1** **`generateCodigo` race condition** — `convex/inventario.ts:29-36` computa `items.length + 1`. Concurrent calls → códigos duplicados MAT-XXX. Frontend replica el bug en `InventoryComponent.jsx:142`.
  - **Fix**: tabla counter global o hash-based ID.

- **P0-O.2** **Negative stock silently masked** — `asignarDesdeAlmacen:416-421`, `registrarConsumo:799-801` usa `Math.max(0, ...)` para esconder underflow. Race window entre check y patch.
  - **Fix**: validación post-patch o OCC explícito; throw en lugar de mask.

- **P0-O.3** **FK orphaning en risk reports** — al desactivar empleado/borrar vehiculo/ruta, `reportes_riesgo.empleado_reporta_id`/`vehiculo_id`/`ruta_id` quedan apuntando a refs muertos. `perfiles_usuarios.vehiculo_asignado_id` igual.
  - **Fix**: cascade cleanup o backfill job; bloquear delete si hay refs.

- **P0-O.4** **Cross-org leak risk en inventario queries** — `generateCodigo` + `getValorTotalInventario:472` full-scan TODOS los items antes de scope. Si scopeItems falla momentáneamente, PII (salario/cedula líneas ~481) puede leak.
  - **Fix**: query `by_organizacion` index PRIMERO, después scope.

### UI Fluent + PWA + mobile (2)

- **P0-U.1** **Logo mobile sin constraint <480px** — `src/pages/AdminDashboard/AdminDashboard.css:68` define `height: 48px` sin media query para small phones. Domina >30% viewport en iPhone SE/14/Pixel (matches P0-2.1 del audit visual).
  - **Fix**: `@media (max-width: 480px) { .app-bar__logo { height: 32px; } }`

- **P0-U.2** **App-bar fullscreen mode incompleto** — `ConductorDashboard.css:3388-3391` aplica `display: none` solo en breakpoint ≤1024px, no en `monitoring--map-fullscreen` class. Recent commit 73a55ad implementa pero verificar trigger.
  - **Fix**: confirmar class está aplicada en fullscreen state y rule cubre desktop también.

---

## P1 Findings (importantes — 26)

### Auth + tenancy (5)

- **P1-A.1** Route_progress stale cleanup info leak (raw findings detallan).
- **P1-A.2** Assignment conflicts info leak en mensajes de error.
- **P1-A.3** `e2e:bootstrap` idempotency — repeat runs con mismo runId.
- **P1-A.4** Hardcoded legacy IDs en migration paths.
- **P1-A.5** Redundant role checks (defense in depth OK, pero indica falta de pattern).

### Fleet + GPS (3)

- **P1-F.1** Unbounded `.collect()` en `vehiculos.ts` (lines 16, 25, 38, 49, 128, 167, 521). `listWithAssignments:167` carga toda la tabla. A 50K vehículos × 10 req/s → millones de docs/min. Sin paginación.
- **P1-F.2** Vehicle state race condition entre `route_progress.start()` y `complete()` concurrentes para mismo vehículo — puede liberar a "disponible" mientras se inserta nuevo "en_ruta". Vehículo double-assigned.
- **P1-F.3** Geofence boundary bounce spam — `checkVehicleGeofences` no tiene dedup window. GPS jitter ±5m en boundary → 10-50 alertas falsas/min.
  - **Fix**: `last_alert_timestamp` + dedup ventana 60s.

### Routes lifecycle (5)

- **P1-R.1** `paradas` JSONB schema NO validado — acepta `v.array(v.any())`. Permite arrays vacíos, coords duplicadas, lat/lng inválidos.
- **P1-R.2** `paradas_completadas` read-modify-write race → lost updates en mutations concurrentes.
- **P1-R.3** Auth bypass en `route_progress.start()` — cuando `asignacionCheck.conductor_id` es null, skip conductor match → conductor A puede iniciar ruta asignada a conductor B.
- **P1-R.4** Vehicle liberation NO atómica con route completion — write failure deja vehículo stuck en "en_ruta".
- **P1-R.5** `route_progress.complete()` no emite eventos server-side — solo client-side emission, offline → missing audit trail.

### Services (4)

- **P1-S.1** Photo `etapa` field NO enum-validated — acepta cualquier string en lugar de `"antes"|"durante"|"despues"`. Cliente puede corromper categorización.
- **P1-S.2** File `file_size` sin cap — sin max limit. Org quota bypass via uploads grandes (delta tracked pero sin hard ceiling).
- **P1-S.3** Maintenance state machine sin guards — `updateTask` permite transiciones ilegales (`completada` → `pendiente`).
- **P1-S.4** Maintenance alerts NO auto-generadas — `getOverdueTasks` query existe pero ningún cron crea alerts cuando tasks become overdue.

### Operations (5)

- **P1-O.1** Empleado deactivation no limpia `perfiles_usuarios.vehiculo_asignado_id` refs — display stale en Calendar.
- **P1-O.2** `proyectos.delete` FK blocking incompleto — bloquea rutas/asignaciones/perfiles pero NO lugares, inventario_movimientos, reportes_riesgo. Orphans posibles.
- **P1-O.3** Timezone handling undocumented — `ScheduleContext:72-78` hardcodea `T12:00:00` workaround para Panama UTC-5 sin documentar. Maintenance risk si expand.
- **P1-O.4** Movement type validation loose — `tipo_movimiento` (compra/asignacion/consumo/ajuste) sin enforcement de reglas por location type. `addToLocation` no registra `tipo_movimiento`.
- **P1-O.5** RiskReports query ineficiente — `listWithDetails:81-174` usa `by_fecha` (full scan) en lugar de `by_proyecto` cuando proyecto provided.

### UI design (4)

- **P1-U.1** **38 hardcoded colors** violando "Use Variables ONLY". Top offenders: `Costos/CostosComponent.css:230,234,257,261` (#5856d6, #CA5010), `AdminDashboard.css:1957,2196` (#1a1a1a), `:2518` (#b91c1c).
- **P1-U.2** **15+ dramatic shadows** offsets 20-60px, opacity 0.25-0.5 — viola Fluent spec. Files: `Cleaning/ReportDetailModal.css:1530,1536`, `Fumigation/FumigationReportDetailModal.css`, `Fleet/FleetManagement.css:1430`.
- **P1-U.3** **Dark mode coverage 3.6%** — solo 3 de 82 CSS files implementan `@media (prefers-color-scheme: dark)`. Componentes con colores hardcoded rompen en dark.
- **P1-U.4** **Notification chaos** — 15 componentes usan `alert()`, 10 usan `toast()`, 8 solo `console.log()`. Stack imported `react-hot-toast`.

---

## P2 Findings (cosmético / quality — 17)

### Auth + tenancy (4)

- Inconsistent role patterns (inline vs helper), missing vehiculos backfill, admin scope design ambiguity.

### Fleet + GPS (3)

- Haversine math: 2 implementaciones (km en `lib/gps.ts:26-35`, meters en `geofences.ts:11-28`). Riesgo: copy wrong version.
- SafeTag connection threshold OK (5min) — no action.
- Cron interval 11s aggressive — reducir a 60s post-validation webhook.

### Services (2)

- Photo cleanup duplicated across fumigaciones/cleaning/maintenance (3 cascades idénticas).
- Etapa field loose `v.string()` throughout.

### Operations (5)

- Costos hardcoded tipos (`tipoConfig:48-53`).
- PDF report sin role check + sin reportId en filename → no audit trail.
- Denormalization inconsistente (conductor_nombre/vehiculo_placa).
- PersonnelContext implicit filter (listActive sin explicit arg).
- InventoryContext stats recalculan cada render.

### UI design (3)

- Modal styling inconsistency (algunos Acrylic blur, otros no).
- Border-radius hardcoded en BottomSheet + Costos:89 (14px no en escala).
- Status badge contrast en light backgrounds rompe WCAG AA en dark.

---

## Positive Findings (cosas que SÍ funcionan)

- **POS-1** Webhook GPS HMAC-SHA256 signed con constant-time compare + 60s replay window. **Solid.**
- **POS-2** Fumigation frequency validation enforced server-side (interna ≤1/month calendar, externa ≤3/week ISO). **Gov tender compliant.**
- **POS-3** Cross-org isolation en servicios — todas las queries filtran por `organizacion_id` + `proyecto_id`.
- **POS-4** Photo cascade cleanup (storage + DB + quota decrement) funciona correctamente al delete assignment.
- **POS-5** Conductor isolation server-side — `convex/vehiculos.ts` filtra por `vehiculo_asignado_id`.
- **POS-6** PII stripping en `empleados.ts:stripPII` por rol (salario/cedula/telefono).
- **POS-7** Mobile responsive: `mobile.css` cubre touch targets 44px, dvh units, viewport meta correcto, grid collapse strategy.
- **POS-8** No mock/dummy data en Costos o Reports (datos reales de inventario).
- **POS-9** `registrarConsumo` valida available stock antes de deducir.
- **POS-10** 90% de mutations correctamente gated (`requireWriteRole`/`requireAdminWrite`).

---

## Top 10 P0 — Priorización fix

| # | ID | Finding | Effort | Impact |
|---|---|---|---|---|
| 1 | P0-F.2 | safetag fetchTodayHistory JSON.parse crash | 5 líneas | Crítico gov tender GPS demo |
| 2 | P0-F.1 | Mapbox token expuesto en frontend | 1-2 horas (mover a action) | Security, quota abuse |
| 3 | P0-O.1 | inventario generateCodigo race → duplicates | 1 hora (counter table) | Data integrity |
| 4 | P0-O.2 | Negative stock masked con Math.max | 30 min (throw vs mask) | Accounting integrity |
| 5 | P0-R.1 | route_progress.complete sin idempotency | 30 min (guard check) | Duplicate reports |
| 6 | P0-F.3 | IMEI uniqueness solo en índice | schema migration | GPS routing corruption |
| 7 | P0-A.1 | Seed mutations exposed public | refactor a internalMutation | Multi-tenant escape risk |
| 8 | P0-R.2 | No unique constraint route_progress activa | schema + guard | State corruption |
| 9 | P0-O.3 | FK orphaning empleado/vehiculo/ruta | cleanup job + delete guards | Stale data |
| 10 | P0-U.1 | Logo mobile no constraint <480px | 3 líneas CSS | Mobile UX |

**Quick wins (<1h cada)**: P0-F.2, P0-O.2, P0-R.1, P0-U.1, P0-A.2, P0-A.3.

---

## Architectural observations

1. **Foundation sólida**: auth helpers (requireXxx) bien diseñados, fumigation frequency correcta, webhook HMAC OK, mobile responsiveness sólida.

2. **Patterns que faltan propagar**:
   - `useCanWrite()` solo aplica a CRUD buttons, no a tab-locked class (audit visual P0-1.1).
   - Counter pattern para auto-codes (inventario, posiblemente otros).
   - Defensive JSON.parse en todas las acciones que llaman APIs externas (no solo safetag).

3. **Schema-level constraints faltantes**:
   - Unique en `safetag_device_id`, `gps_imei`.
   - Unique en `route_progress (vehiculo_id, estado=en_progreso)`.
   - Enum validation para `etapa`, `tipo_movimiento`.

4. **Cron / async work gaps**:
   - Maintenance overdue alerts no auto-gen.
   - Geofence boundary dedup window.
   - Vehicle liberation post-route-complete no atomic.

5. **Design system migration incompleta**:
   - 38 hardcoded colors + 15 dramatic shadows + 3% dark mode coverage.
   - Notification chaos (alert vs toast).

---

## Comparación con AUDIT_FINDINGS.md (Playwright visual v6)

| Categoría | Audit visual P0 | Code review P0 | Overlap |
|---|---|---|---|
| GPS modal crash | P0-4.1 | P0-F.2 | ✅ Same bug, root cause confirmado |
| Mobile logo | P0-2.1 | P0-U.1 | ✅ Same |
| Enterprise tab lock UI | P0-1.1 | (not surfaced — UI-only) | N/A |
| Super_admin Organizaciones missing | P0-1.2 | (not surfaced — likely render condition) | N/A |
| Viewer Operaciones missing | P0-1.3 | (likely data bootstrap) | N/A |
| WCAG focus rings | P0-3.1 | (not surfaced — UI) | N/A |
| Conductor touch targets | P0-2.3 | (covered en mobile.css review) | Partial |
| Conductor route probes | P0-2.2 | (test infra, not code bug) | N/A |
| **Code review NEW P0** | — | 9 nuevos | Auth/data/race/security |

Code review **agrega 9 P0 que el audit visual no podía detectar** (data integrity, race conditions, security gaps en API surface).

---

## Recommended fix order

**Sprint 1 (quick wins + crítico):**
1. P0-F.2 fetchTodayHistory defensive parse (5 lines, fixes audit P0-4.1)
2. P0-F.1 Mapbox key → backend action
3. P0-O.2 Negative stock throw vs mask
4. P0-R.1 route_progress.complete idempotency guard
5. P0-U.1 Logo mobile CSS
6. P0-A.2, P0-A.3 Auth pattern consistency

**Sprint 2 (data integrity):**
7. P0-O.1 generateCodigo counter table
8. P0-F.3 IMEI unique constraint
9. P0-R.2 route_progress unique constraint
10. P0-O.3 FK cleanup jobs

**Sprint 3 (architecture cleanup):**
11. P0-A.1 Seed mutations a internalMutation
12. P0-O.4 inventario query order
13. P0-U.2 App-bar fullscreen
14. P1s consolidados

---

## Artifacts

```
.code-review/
├── routes.md       (full details, 286 lines)
├── services.md     (full details, 181 lines)
└── CODE_REVIEW.md  (este consolidated doc)
```

Raw findings inline para auth-tenancy, fleet-gps, operations, ui-design (agentes no escribieron archivo individual pero detalles preservados acá).
