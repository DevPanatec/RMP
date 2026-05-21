# Conductor Route-Execution Flow Audit — 2026-05-18

> Auditoria funcional E2E de las acciones del conductor durante una ruta activa.
> Tool: Playwright headless (1280x720) + Convex dev (youthful-warbler-749) + Clerk dev.
> Test spec: `tests/audit/conductor-flow.spec.ts`
> Bootstrap runId: `conductor-flow-4000`

---

## Resumen Ejecutivo

| Acción | Resultado | Notas |
|---|---|---|
| 1. Iniciar ruta | ✅ PASS | `route_progress.start` + `asignaciones.updateEstado` ejecutan, `route_events.add` registra `ruta_iniciada` |
| 2. Completar parada con foto | ✅ PASS | WeightModal auto-abre por geofence (radio 150m), foto sube a Convex storage, `route_progress.update` persiste |
| 3. No completar parada → riesgo | ✅ PASS *(post-fix)* | Skip → RiskModal con `skipStopData` vinculado → parada marcada `completada: false` con `motivo_no_completada` |
| 4. Reportar riesgo desde header | ✅ PASS | ConfirmDialog "¿impide completar la parada?" → "No, solo reportar" → reporte independiente |
| 5. Completar última parada con foto | ✅ PASS | Mismo flujo que (2), categoría `alta` |
| 6. Finalizar ruta | ✅ PASS | RouteCompletionModal auto-abre al completar última parada, 2/3 paradas (67%) con 1 saltada |
| **TOTAL** | **6/6 PASS** | Desktop ≥1024px. Mobile/tablet bloquedo por selectores diferentes (ver P1-M1). |

**Errores en consola**: 0 errors / 0 pageerrors durante el flujo completo (94 eventos console totales, todos warnings de Clerk/Google Maps dev mode).

---

## Bugs Encontrados

### P0-CF1 — Race condition en `handleWeightConfirm` clobberea `pendingStopIndex` siguiente ✓ FIXED

**Síntoma observado**: Tras confirmar parada 1 con foto, el geofence (radio 150m) dispara `handleCompleteStop(1)` para parada 2 automáticamente. Pero `handleWeightConfirm` sigue ejecutando los `await` posteriores y al llegar a la última línea `setPendingStopIndex(null)` **clobberea** el `1` que el geofence acababa de setear.

**Consecuencia**: WeightModal queda abierto pero `pendingStopIndex = null`. Si conductor pulsa "No puedo completar esta parada", `handleSkipStop` accede a `paradas[null]` → `parada` undefined → `TypeError: Cannot read properties of undefined (reading 'direccion')` → React error boundary, modal se cierra sin abrir RiskModal.

**Reproducible al 100%** en flujo: completar parada 1 → geofence trigger parada 2 → click skip.

**Archivos afectados**:
- `src/pages/ConductorDashboard/ConductorDashboard.jsx:631-635` (orden de setState)
- `src/pages/ConductorDashboard/ConductorDashboard.jsx:684` (setPendingStopIndex tardío)

**Fix aplicado** (parte de este audit):
```diff
- setCurrentStop(prev => prev + 1);
- setIsModalOpen(false);
+ setCurrentStop(prev => prev + 1);
+ setPendingStopIndex(null);   // ← movido aquí, ANTES del setIsModalOpen
+ setIsModalOpen(false);
  ...
  // al final del handler, removida la línea:
- setPendingStopIndex(null);
```

**Por qué importa**: en producción, todo conductor que opere paradas cercanas (típico en rutas urbanas <150m apart) hubiera tenido modal flickering + crash al saltar paradas. Tender del gobierno requiere demostración en vivo — esto se hubiera caído.

**Severidad**: P0 (bloqueante de funcionalidad core conductor).

---

### P1-CF1 — `dias_semana` requerido pero no documentado en bootstrap E2E ✓ FIXED

**Síntoma**: Conductor logueado veía "Sin Asignación para Hoy" pese a tener asignación válida en `asignaciones_rutas` con `fecha_asignacion` = hoy.

**Causa**: `ConductorDashboard.jsx:211` filtra asignaciones por `dias_semana.includes(todayDayName)`. El bootstrap E2E no setea `dias_semana`.

**Fix**: `convex/e2e.ts` ahora setea `dias_semana: ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"]` + `hora_inicio: "06:00"`.

**Severidad**: P1 (infra de test, no afecta a producción). Pero apunta a que `dias_semana` debería tener fallback en frontend cuando se setea por `fecha_asignacion` directa.

---

### P1-CF2 — `modulos_activos` requerido para que conductor opere ✓ FIXED en bootstrap

**Síntoma**: Conductor veía pantalla "Módulo de Recolección no contratado" tras login.

**Causa**: `ConductorDashboard.jsx:80-82` requiere `hasModulo('REC')`. Bootstrap E2E creaba org sin `modulos_activos`.

**Fix**: `convex/e2e.ts` ahora setea `modulos_activos: ["REC","FUM","LIM","MTO","INV","PER","BI"]` en bootstrap.

**Severidad**: P1 (infra de test). Pero gate funciona correctamente — bug solo en data de prueba.

---

### P1-M1 — Selectores mobile/tablet diferentes a desktop (Reportar Riesgo, Terminar, Finalizar)

**Síntoma**: Test PASS en `audit-headless` (1280px) y `audit-laptop` pero FAIL en `audit-iphone-14` (393px) y `audit-ipad-pro` (1024px).

**Causa**: `isMobileView = window.innerWidth < 1024`. En mobile, los botones de header `Reportar Riesgo` / `Terminar` / `Finalizar` están escondidos detrás del hamburger menu `.map-overlay-header__nav-app` (línea 2081 ConductorDashboard). El test los busca por texto sin abrir el menú.

**Pasos pendientes**: 
1. Mobile spec necesita: tap hamburger → click "Reportar Riesgo" del menú desplegable.
2. Mobile usa `.weight-sheet` (bottom sheet) en lugar de `.modal-content`.
3. Mobile usa `.sheet--risk` en lugar de `.modal-content.risk-modal`.

Los selectores ya tienen comma-OR para soportar ambos, pero el flujo de "abrir menú primero" no está implementado en el spec.

**Severidad**: P1 (no es bug de UI, solo gap en test coverage). Mobile UI funciona — conductor PWA mobile-first per CLAUDE.md.

---

## Mejoras Aplicadas en Infraestructura

### `convex/e2e.ts` — patches
1. **`bootstrap`**: Org con `modulos_activos` completo + asignación con `dias_semana` semana completa + `hora_inicio: "06:00"`.
2. **`resetRouteState`** (nueva action): Limpia `route_progress`, `route_events`, `route_reports`, `reportes_riesgo`, resetea `asignaciones_rutas.estado = 'asignada'` y `vehiculos.estado = 'disponible'` para un runId dado. Permite re-correr tests sin re-bootstrap completo (no toca Clerk).

   Uso: `npx convex run e2e:resetRouteState '{"runId":"conductor-flow-4000"}'`

### `tests/audit/conductor-flow.spec.ts` — nuevo spec
- 6 acciones en una sola pasada lineal.
- Selectores duales desktop+mobile (mobile aún no usable, ver P1-M1).
- Helpers: `processWeightModal`, `fillRiskModal`, `dismissSuccessModal`, `waitForWeightModal`, `openWeightModalForCurrentStop`.
- Captura de console errors en tiempo real → log inmediato de `pageerror`.
- Screenshots en `audit/headless/conductor/00-..07-*.png`.

---

## Evidencia (Screenshots)

Path: `audit/headless/conductor/`

| Snap | Acción capturada |
|---|---|
| `00-landing.png` | Conductor dashboard pre-ruta — botón "Iniciar Ruta" visible |
| `01-route-started.png` | Ruta iniciada — WeightModal auto-abierto para Parada 1 |
| `02a-stop1-weight-modal-open.png` | WeightModal Parada 1 — categorías visibles |
| `02b-stop1-completed.png` | Post-confirm Parada 1 — WeightModal auto-abre para Parada 2 (geofence trigger) |
| `03a-stop2-weight-modal.png` | WeightModal Parada 2 — botón "No puedo completar" visible |
| `03b-risk-modal-from-skip.png` | RiskModal abierto con `skipStopData` vinculado a Parada 2 |
| `03c-stop2-skipped-with-risk.png` | Success modal "Reporte creado y parada marcada como no completada" |
| `04a-risk-modal-from-header.png` | RiskModal independiente (sin link) — tipo Interno seleccionable |
| `04b-risk-from-header-submitted.png` | Success post-submit del segundo reporte |
| `05a-stop3-weight-modal.png` | WeightModal Parada 3 |
| `05b-stop3-completed.png` | RouteCompletionModal auto-abre — "¡Ruta Completada! 67% Completado (2 paradas)" |
| `06a-completion-modal.png` | Misma vista — info general + paradas completadas |
| `06c-route-finalized.png` | Post-confirmar y finalizar |
| `07-post-completion.png` | Dashboard limpio post-ruta |

Console events full dump: `audit/headless/conductor/_console.json` (94 eventos, 0 errors).

---

## Estado Convex Verificable

Tras correr el flujo completo (sin reset), la DB de `youthful-warbler-749` contiene:
- 1 `route_progress` (estado: completada)
- ~13 `route_events` (ruta_iniciada + 3× parada_llegada + 2× parada_completada + ruta_completada + skips)
- 1 `route_reports` (tiempo_total_segundos + paradas_completadas[3])
- 2 `reportes_riesgo` (1 vinculado a parada 2, 1 independiente desde header)
- 1 `asignaciones_rutas` con `estado = 'completada'`
- 1 `vehiculos` con `estado = 'disponible'` (post-completion reset)
- N foto blobs en `_storage` (2 fotos de parada subidas exitosamente)

Reset: `npx convex run e2e:resetRouteState '{"runId":"conductor-flow-4000"}'`

---

## Comando para Reproducir

```bash
# 1. (Si no existe) bootstrap fresh
npx convex run e2e:bootstrap '{"runId":"conductor-flow-4000"}'

# 2. Sincronizar bootstrap.json + runid
# (manual o script — los IDs los imprime bootstrap)

# 3. (Opcional) Reset entre corridas
npx convex run e2e:resetRouteState '{"runId":"conductor-flow-4000"}'

# 4. Auth setup (genera cookies por rol)
npx playwright test --project=setup

# 5. Correr conductor flow
npx playwright test tests/audit/conductor-flow.spec.ts --project=audit-headless
```

---

## Próximos Pasos Sugeridos

1. **P0-CF1 ya fixed** → necesita PR aparte para merge a main (parche en `ConductorDashboard.jsx`).
2. **Mobile coverage**: implementar variant del spec que abra hamburger menu antes de buscar acciones de header.
3. **Test isolation**: hook `beforeEach` que llame `resetRouteState` automáticamente.
4. **CI integration**: agregar `conductor-flow.spec.ts` al pipeline regular de audit (`audit-run.skill`).
5. **Geofence radius**: 150m parece generoso para urbano. Considerar configurable por org/proyecto.
