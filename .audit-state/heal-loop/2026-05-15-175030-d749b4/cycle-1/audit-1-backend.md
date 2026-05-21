# Audit 1 cycle 1 — Backend (organizaciones + lib + migrations)

## P0

- [BKND-01] convex/organizaciones.ts:294-340 — `setEscala` requires `notas` only if downgrade triggers overflow (line 327 conditional), but frontend (OrgDetailDrawer.jsx:275) calls `setEscala({id, escala})` without notas. Any overflow-triggered downgrade throws. Fix: either remove notas requirement, OR frontend must prompt + pass notas for downgrades.
- [BKND-02] convex/organizaciones.ts:441-447 — `setDiscount` validates `0 <= pct <= 15` but allows non-integer (15.7, 10.5). Frontend `step={1}` not enforced. MRR drift risk. Fix: `if (!Number.isInteger(args.pct)) throw new Error("discount debe ser entero")`.
- [BKND-03] convex/organizaciones.ts:488-510 — `setPlanFechas` no date sanity validation. Accepts year 1970 or 2500, poisons audit log + renewal cron. Fix: validate year >= 2020 AND <= 2100 for both dates.
- [BKND-04] convex/organizaciones.ts:504-506 — `setPlanFechas` no cross-field check: renewal can be before inicio. Fix: `if (fecha_renovacion && fecha_inicio && fecha_renovacion <= fecha_inicio) throw`.
- [BKND-05] convex/organizaciones.ts:365-383 — `toggleModulo` ignores PER vs PER-full mutual exclusivity. Both can be active → double billing. Fix: when activating PER-full, remove PER from `modulos_activos`; symmetric for the inverse.
- [BKND-06] convex/organizaciones.ts:387-433 — `setCustomCap` allows setting cap below current usage without warning. Locks org in perpetual overflow billing. Fix: append warning entry to audit log when cap < current count; reject if would lock hard_cap_extras.

## P1

- [BKND-07] convex/organizaciones.ts:521-617 — `recomputeStorage` paginated (MAX_PHOTOS_PER_TABLE). On partial result still writes incomplete `storage_bytes_used` + audit entry with wrong after_value. Re-runs cause false drift spikes. Fix: if `partial=true`, skip storage update; return `{partial:true, before, after:null, note}`.
- [BKND-08] convex/organizaciones.ts:488-510 — date timezone: frontend `new Date(raw).getTime()` is local midnight. Should be UTC noon (frontend fix). Backend should at least reject obviously-wrong epoch ms (< 86400000 ⇒ before 1970-01-02).
- [BKND-09] convex/organizaciones.ts:206-252 — `listWithStats` returns suspended orgs (no `activo` filter). Plataforma "Activas" filter is client-side; suspended orgs still fetched (privacy/payload waste). Fix: backend filter by `activo=true` unless explicit param `includeSuspended=true`.
- [BKND-10] convex/organizaciones.ts:158-179 — `truncateAuditValue` returns metadata object `{_truncated, _size, _preview}` instead of string. Audit log table displays object dump. Fix: return clean truncated string + `_truncated:true` flag only, drop `_size`.
- [BKND-11] convex/migrations/seed_plan_fields.ts:70 — migration audit entries set `changed_by_user_id="migration:backfill"` but no email. Frontend shows blank "Por" column. Fix: pass `changed_by_email` from auth scope or fixed `migration@system`.
- [BKND-12] convex/migrations/seed_plan_fields.ts:102 — `backfillStorageCounters` default batchSize=200 too low; 50k+ photos timeout. Fix: raise default to 1000, or require explicit param.

## P2

- [BKND-13] convex/lib/modules.ts:142 — error message hardcodes undefined when code invalid. Fix: include codigo in error.
- [BKND-14] convex/organizaciones.ts:410 — MAX_CAPS comment "sanity check" but error message says "excede máximo permitido". Align comment vs UX message.
- [BKND-15] convex/organizaciones.ts:224 — `sumModulosUsd` silently skips unknown módulo codes. MRR under-counted for stale lists. Fix: log warning + still skip, or audit-trail unknown codes.

## Stats

- Mutations audited: 8 (setEscala/toggleModulo/setCustomCap/setDiscount/setSetupStatus/setPlanFechas/setActive/recomputeStorage)
- Queries audited: 2 (listWithStats, getOrgStats)
- Migrations audited: 2 (seed_plan_fields + storage backfill)
- Files touched: ~6
- Findings: P0=6, P1=6, P2=3 (total 15)
