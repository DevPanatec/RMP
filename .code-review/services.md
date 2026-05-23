# Code-Level Audit: Service Modules (Cleaning, Fumigation, Maintenance)

**Date**: May 2026  
**Scope**: convex/{cleaning.ts, fumigaciones.ts, maintenance.ts, files.ts} + context layers + photo components  
**Thoroughness**: Very thorough (compliance-critical fumigation frequency validation audited in detail)

---

## Executive Summary

The service modules implement **multi-tenant isolation** and **critical compliance validation** (fumigation frequency limits per government tender requirements). **Core strengths**: server-side enforcement of frequency rules, per-org storage quota tracking, cascading photo cleanup on assignment delete, proper access gating. **P0 vulnerabilities**: None identified. **P1 issues**: Photo category validation only client-side (no server enum), missing max file size enforcement, maintenance state machine lacks illegal backward transitions. **P2 debt**: Etapa field not strongly typed (allows arbitrary strings), maintenance alerts not auto-generated on overdue tasks, photo cleanup logic duplicated across modules.

---

## Findings

### **P0: Critical**  
*Bypassable compliance rules, unprotected file access, cross-org leaks*

**None identified.**

✅ **Fumigation frequency validation**: Enforced server-side in mutation handlers  
✅ **File access control**: ctx.storage.getUrl() requires authenticated user (via equireUser in iles.ts)  
✅ **Cross-org isolation**: All service queries filter by organizacion_id or proyecto_id  

---

### **P1: High Priority**

#### 1. **Photo Etapa/Category Validation: No Server-Side Enum**

**File**: convex/fumigaciones.ts:516, convex/cleaning.ts:261, convex/maintenance.ts:504-509

**Issue**: The etapa field is defined as .string() with no validation constraint. Client sends "antes" | "durante" | "despues", but server accepts ANY string. Someone could upload to etapa: "admin_only" or etapa: "", bypassing categorization logic.

**Schema Definition** (furnishes problem):
- fumigaciones.ts:516: etapa: v.optional(v.string()) — No enum validation
- cleaning.ts:261: etapa: v.string() — No validation
- maintenance.ts:504-509: etapa: v.string() — No validation

**Impact**: 
- Report generation filters by specific etapa values. Invalid etapa values silently excluded from reports.
- Potential data loss if typo in client.

**Remediation**: Use union type:
`	ypescript
etapa: v.union(v.literal("antes"), v.literal("durante"), v.literal("despues"))
`

---

#### 2. **Missing File Size Max Validation**

**Files**: convex/files.ts, convex/fumigaciones.ts:savePhoto, convex/cleaning.ts:addPhoto, convex/maintenance.ts:savePhoto

**Issue**: No max file size check in mutations. Client sends ile_size, but server does not validate. Storage counter increments blindly without bounds checking.

**Current Code** (fumigaciones.ts:513–537):
- Accepts ile_size: v.optional(v.number()) without bounds
- Increments org storage without validating against org cap

**Risk**: 
- User uploads massive files (100MB+) → storage counter increments without limit
- Org quota bypass: repeatedly upload large files → bloat storage without hitting hard limit

**Remediation**: Add 50MB max limit validation before insert

---

#### 3. **Maintenance State Machine: No Illegal Backward Transitions**

**File**: convex/maintenance.ts:168–194 (updateTask mutation)

**Issue**: updateTask allows ANY state transition. No validation of state machine rules.

Current allowed:
- completada → pendiente (undo completion)
- cancelada → en_progreso (resurrect canceled task)
- Any arbitrary state string

Expected state machine:
`
  pendiente → en_progreso → completada
     ↓
  cancelada (terminal)
`

**Risk**: Unintended state rollbacks. Task marked complete, then reverted to pending = audit trail loss.

**Remediation**: Add state transition validation with enum union and illegal-path prevention

---

#### 4. **Maintenance Alerts: Not Auto-Generated on Overdue Tasks**

**Files**: convex/maintenance.ts:getOverdueTasks (query exists), but no cron or mutation trigger

**Issue**: getOverdueTasks query computes overdue tasks (fecha_programada < today, estado != completada/cancelada). However, **no alert is auto-created** when a task becomes overdue. Alerts only created manually via ddAlert mutation.

**Risk**: Overdue tasks visible in query but no alert in DB until manually created. UI relies on client-side polling (not reliable if offline).

**Remediation**: Add cron job check-overdue-maintenance to auto-generate alerts every 5 minutes for newly overdue tasks.

---

### **P2: Code Quality & Debt**

#### 1. **Etapa Field Not Strongly Typed**

All photo tables use loose .string() for etapa. Should be enum union throughout for type safety and IDE autocomplete.

#### 2. **Photo Cleanup Logic Duplicated Across Modules**

Identical cleanup pattern in:
- umigaciones.ts:448–466 (deleteAssignment)
- cleaning.ts:234–251 (deleteAssignment)
- maintenance.ts:400–425 (deletePhoto)

Should extract to shared helper function in lib/cleanup.ts to reduce duplication.

#### 3. **Fumigation Frequency Validation: Calendar Month vs Rolling 30 Days**

Internal fumigation max 1/month is implemented as **calendar month** (month/year boundaries). Per CLAUDE.md, gov tender spec says "1/month" but may expect **rolling 30-day window** instead. E.g., Jan 30 + Feb 5 = 2 fumigations in 7 days (different calendar months but technically within 7-day window).

**Clarify with PO** whether calendar month or rolling 30-day interpretation is required.

#### 4. **Report Denormalization: Missing Location Snapshot Verification**

**Files**: umigaciones.ts:699–761 (createReport), cleaning.ts:349–382 (createReport)

✅ **Verified**: Reports store snapshots of lugar_nombre, latitud, longitud at completion time.

⚠️ **Issue**: Context layer (FumigationContext.jsx:completeAssignment) passes user-provided lugar_nombre, latitud, longitud without server verification. Server should re-fetch lugar and use official values.

**Remediation**: Mutation handler should verify lugar_id exists and use server-fetched values for snapshot.

---

## Verification Results

| Check | Status | Details |
|-------|--------|---------|
| Fumigation frequency server-side enforcement | ✅ PASS | Interna 1/month + Externa 3/week enforced in create/update mutations |
| Frequency date range accuracy | ✅ PASS | Calendar month for interna; ISO week for externa |
| Per-org isolation | ✅ PASS | All queries filter by organizacion_id. No cross-org leakage. |
| File access control | ✅ PASS | getUrl requires requireUser auth gate |
| Photo cleanup on delete | ✅ PASS | Cascades to photos (storage + DB + quota decrement) |
| Photo etapa categorization | ❌ FAIL | No enum; accepts any string value |
| File size validation | ❌ FAIL | No max size check. Quota bypass possible. |
| Maintenance state machine | ❌ FAIL | No illegal transition prevention |
| Maintenance alerts auto-gen | ❌ FAIL | Manual only. No cron for overdue tasks. |
| Storage quota enforcement | ⚠️ PARTIAL | Delta-tracked on add/delete, recomputed daily. No hard limit at upload. |

---

## Recommendations

### Immediate (P1 fixes)
1. Add etapa enum validation to all photo mutations (fumigaciones, cleaning, maintenance)
2. Enforce max file size (50MB suggested) in photo save mutations
3. Validate state transitions in maintenance updateTask
4. Auto-generate overdue alerts via cron job

### Follow-up (P2 improvements)
5. Extract photo cleanup to shared library function
6. Verify lugar snapshot in createReport (fetch from server, not client)
7. Clarify fumigation frequency spec with PO (calendar month vs rolling 30 days)
8. Add storage quota hard limit check at upload boundary

### Testing
- Invalid etapa values should reject
- File size boundary testing (under/over limit)
- Maintenance state machine backward path rejection
- Overdue task alerts auto-created
- Cross-org query isolation

---

## Conclusion

The service modules demonstrate **solid compliance architecture** with server-side frequency enforcement and proper multi-tenant isolation. **No P0 vulnerabilities found.** Four P1 issues identified: weak photo categorization, missing file size limits, unguarded state machine, missing alert automation. **Recommend addressing P1 items before next government tender submission.**
