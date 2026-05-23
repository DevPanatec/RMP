# Route Lifecycle Code Audit — RMP

## Executive Summary

The route lifecycle (creation → assignment → progress → completion → reports) has **2 P0 critical data integrity issues**, **5 P1 architectural risks**, and **3 P2 quality issues**. Primary concerns: (1) double-completion vulnerability allowing duplicate `route_reports` writes, (2) no unique constraint preventing duplicate active route_progress per vehicle, (3) unvalidated paradas JSONB array accepting arbitrary schema, (4) race condition in read-modify-write of paradas_completadas without atomicity, (5) authorization bypass on conductor-to-route start via loose validation. Immediate mitigation required for P0 issues.

---

## P0: Critical — Data Corruption / Duplicate Writes

### P0-1: Double-Completion Route Report Writes

**Severity**: P0 — data corruption, audit trail falsification  
**Files**: 
- `convex/route_progress.ts:279-330` (complete mutation)
- `src/pages/ConductorDashboard/ConductorDashboard.jsx:1005-1030` (completion flow)
- `convex/route_reports.ts:30-82` (add mutation)

**Issue**: No idempotency guard on `route_progress.complete()`. Calling the mutation twice for the same `route_progress._id` creates:
1. **First call**: inserts route_report, patches route_progress.estado='completada'
2. **Second call** (idempotent failure, UI retry, network stall): patches route_progress again, BUT no guard prevents **re-insertion of route_reports**

Code at convex/route_progress.ts:296-300:
```
await ctx.db.patch(args.id, {
  estado: "completada",
  route_report_id: args.route_report_id,
});
```

❌ NO IDEMPOTENCY CHECK. If function called 2x: first call inserts route_report and patches progress; second call patches progress again without error, but route_reports may be re-inserted upstream.

Frontend at ConductorDashboard.jsx:1005-1030:
- Calls `saveRouteCompletionReport(reportToSave)` without unique constraint
- No idempotency token passed
- On retry: route_reports already exists but no guard prevents duplicate

**Attack**: Conductor calls completeRouteProgress twice (double-click, network retry, manual API) → **2+ route_reports with identical data** → audit trail corrupted, KPIs inflated.

**Recommendation**:
1. Add unique constraint on `route_reports(asignacion_id, conductor_id, fecha_inicio)`
2. Implement idempotency in `route_progress.complete()` — check if already completed before writing
3. Conditional insert in frontend — only call saveRouteCompletionReport if route_progress.estado !== 'completada'

---

### P0-2: No Unique Constraint on Active route_progress per Vehicle

**Severity**: P0 — data corruption, vehicle/conductor state inconsistency  
**Files**: 
- `convex/route_progress.ts:147-250` (start mutation)
- `convex/schema.ts:204-224` (route_progress table definition)

**Issue**: Multiple calls to `route_progress.start()` for the same vehicle create orphaned active route_progress records. Code attempts cleanup but only kills other concurrent progress—does NOT prevent insertion of duplicates:

```
const stale = await ctx.db
  .query("route_progress")
  .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
  .collect();
for (const sp of stale) {
  if (sp.vehiculo_id === args.vehiculo_id) {
    await ctx.db.patch(sp._id, { estado: "completada" });
  }
}

return await ctx.db.insert("route_progress", {
  ...args,
  estado: "en_progreso",
});
```

❌ NO UNIQUE CONSTRAINT. Two rapid calls to start() with same vehiculo_id: Call 1 closes old progress and inserts row A; Call 2 inserts ANOTHER row B. Result: 2 active route_progress for same vehicle.

Schema has no unique constraint on (vehiculo_id, estado) where estado='en_progreso'.

**Attack**: Conductor starts route twice rapidly (network retry, UI double-click) → 2 active route_progress rows for same vehicle → vehicle state machine broken, completion ambiguous.

**Recommendation**:
1. Add unique constraint `(vehiculo_id, estado) WHERE estado='en_progreso'`
2. Replace full-table `by_estado` scan with `(vehiculo_id, estado)` compound index

---

## P1: High Risk — Architectural & Race Conditions

### P1-1: No Schema Validation on paradas JSONB Array

**Severity**: P1 — silent data corruption, downstream parsing failures  
**Files**: 
- `convex/rutas.ts:140` - paradas: v.array(v.any())
- `convex/schema.ts:153` - paradas definition
- Downstream consumers assume schema but don't enforce

**Issue**: `paradas` field is defined as `v.array(v.any())` with ZERO schema enforcement. Risks:
- Empty paradas array accepted (creates 0-stop route)
- Duplicate coordinates (same lat/lng in multiple paradas) not rejected
- Invalid lat/lng (e.g., `{latitud: "not a number", longitud: null}`) cause silent failures
- No enforcement of required fields

**Recommendation**:
```
const paradaValidator = v.object({
  nombre: v.string(),
  direccion: v.optional(v.string()),
  latitud: v.number(),
  longitud: v.number(),
  orden: v.optional(v.number()),
});

paradas: v.array(paradaValidator);

// Validation in add():
if (args.paradas.length === 0) throw new Error("Ruta debe tener al menos 1 parada");
const coords = new Set();
for (const p of args.paradas) {
  const key = `${p.latitud},${p.longitud}`;
  if (coords.has(key)) throw new Error(`Parada duplicada: ${key}`);
  coords.add(key);
}
```

---

### P1-2: Race Condition in paradas_completadas Array Update

**Severity**: P1 — data loss under concurrent writes  
**Files**: 
- `convex/route_progress.ts:252-277` (update mutation)

**Issue**: `paradas_completadas` is read-modify-write on array field without atomic guards. Multiple mutations racing cause lost updates:

```
export const update = mutation({
  args: {
    id: v.id("route_progress"),
    paradas_completadas: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(id);
    // Race scenario:
    // Thread A reads existing.paradas_completadas = [A]
    // Thread B reads existing.paradas_completadas = [A]
    // Thread A appends B → [A, B], writes
    // Thread B appends C → [A, C], writes ← OVERWRITES [A,B] with [A,C]
    return await ctx.db.patch(id, updates);
  },
});
```

**Attack**: Conductor marks parada 1, 2, 3 completed in rapid succession (offline sync) → only last parada recorded, others lost from audit trail.

**Recommendation**: 
Send atomic delta from client, not full array. Accept `{parada_index: 2, completedData: {...}}` and merge server-side.

---

### P1-3: Authorization Bypass — Conductor Can Start Unassigned Route

**Severity**: P1 — auth bypass, cross-conductor route hijack  
**Files**: 
- `convex/route_progress.ts:182` - asignacionCheck.conductor_id check

**Issue**: In legacy path (no fixed vehiculo_asignado_id), check skips if `asignacionCheck.conductor_id` is null:

```
if (asignacionCheck.conductor_id && asignacionCheck.conductor_id !== scope.perfil._id) {
  throw new Error("Asignación no pertenece a este conductor");
}
// ^ SKIPPED if asignacionCheck.conductor_id is null!
```

**Attack**: Conductor A queries assignments, sees assignment ID X (no conductor_id set), calls `start({asignacion_id: X, ...})` for Conductor B's route. Check passes. **Conductor A hijacks Conductor B's route**.

**Recommendation**:
```
const isConductorMatch = 
  (asignacionCheck.conductor_id && asignacionCheck.conductor_id === scope.perfil._id) ||
  (asignacionCheck.conductor_nombre && 
   asignacionCheck.conductor_nombre.toLowerCase() === scope.perfil.nombre_completo?.toLowerCase());

if (!isConductorMatch) {
  throw new Error("Asignación no pertenece a este conductor");
}
```

---

### P1-4: Vehicle State Machine Not Atomic with route_progress Completion

**Severity**: P1 — partial-transaction risk, stale vehicle state  
**Files**: 
- `convex/route_progress.ts:296-326` (complete mutation)

**Issue**: Route completion writes span multiple separate patches with no guarantee of atomicity:

```
await ctx.db.patch(args.id, { estado: "completada", ... });
if (progress?.asignacion_id) {
  await ctx.db.patch(progress.asignacion_id, { estado: "completada", ... });
}
if (progress?.vehiculo_id) {
  await ctx.db.patch(progress.vehiculo_id, { estado: "disponible" });
}
```

Failure scenario: complete route_progress ✓, update assignment ✓, error before patching vehicle → vehicle remains `estado: "en_ruta"` but route_progress is `"completada"` → stale state.

**Recommendation**: Move vehicle liberation to route_reports.add() trigger or separate cron cleanup.

---

### P1-5: Missing route_events for route_progress.complete()

**Severity**: P1 — audit trail incomplete  
**Files**: 
- `convex/route_progress.ts:279-330` (complete mutation)

**Issue**: Only event-less mutation is `route_progress.complete()`. All other transitions emit route_events. If frontend offline or fails → event never created.

**Recommendation**:
```
// Emit event server-side (always) in route_progress.complete()
await ctx.db.insert("route_events", {
  ruta_id: progress.ruta_id,
  asignacion_id: progress.asignacion_id,
  tipo_evento: "ruta_completada",
  timestamp: new Date().toISOString(),
  organizacion_id: progress.organizacion_id,
});
```

---

## P2: Medium Risk — Code Quality

### P2-1: Stale Assignment Cleanup Missing

**Severity**: P2 — orphaned data, manual intervention required  

**Issue**: No mechanism to auto-close assignments that never complete or are abandoned. Admin must manually update asignaciones_rutas.estado to "cancelada".

**Recommendation**: Add cron job to clean up assignments older than 24h in "en_progreso" state.

---

### P2-2: WeightModal Does Not Validate Non-Negative Weight

**Severity**: P2 — data quality, nonsensical reporting  

**Issue**: No minimum/maximum validation on weight input. Conductor can enter negative weight.

**Recommendation**: Add client + server validation: `if (!weight || weight <= 0) throw new Error("Peso debe ser > 0")`

---

### P2-3: route_events Legacy conductor_nombre Index Inefficiency

**Severity**: P2 — performance  
**Files**: 
- `convex/schema.ts:285` - by_conductor index

**Issue**: Legacy `by_conductor` index on conductor_nombre string maintained for backward compatibility. New code uses `by_conductor_id`.

**Recommendation**: Deprecate by_conductor index, add migration to populate missing conductor_id.

---

## Summary Table

| Issue ID | Severity | Category | File(s) | Impact |
|----------|----------|----------|---------|--------|
| P0-1 | P0 | Duplicate Writes | route_progress.ts:279, route_reports.ts:30 | Multiple route_reports per completion |
| P0-2 | P0 | Missing Constraint | schema.ts:204, route_progress.ts:147 | Multiple active route_progress per vehicle |
| P1-1 | P1 | Schema Validation | rutas.ts:140, schema.ts:153 | Arbitrary paradas structure |
| P1-2 | P1 | Race Condition | route_progress.ts:252 | Lost paradas_completadas on concurrent writes |
| P1-3 | P1 | Auth Bypass | route_progress.ts:182 | Conductor hijacks unassigned route |
| P1-4 | P1 | Partial Transaction | route_progress.ts:296 | Vehicle estado stale on write failure |
| P1-5 | P1 | Audit Trail | route_progress.ts:279 | Missing ruta_completada event |
| P2-1 | P2 | Stale Data | asignaciones.ts | No cleanup for abandoned assignments |
| P2-2 | P2 | Data Quality | WeightModal | Negative weight accepted |
| P2-3 | P2 | Performance | schema.ts:285 | Legacy conductor_nombre index |

---

Audit completed: 2026-05-21
