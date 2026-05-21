# Heal-Loop Report — 2026-05-15-175030-d749b4

**Scope:** SuperAdmin "Plataforma" panel — billing/plan management surface (PlataformaPanel + OrgDetailDrawer + organizaciones backend + lib/limits + lib/modules + migrations + cron).
**Started:** 2026-05-15 17:50 UTC
**Finished:** 2026-05-15 ~18:08 UTC
**Duration:** ~18 min
**Final state:** **clean**
**Cycles run:** 2 / 3

## P0 / P1 trend

| Cycle | P0 | P1 | P2 | P3 |
|---|---|---|---|---|
| 1 | 7  | 14 | 12 | 5 |
| 2 | 0  | 0  | 12*| 5*|

*P2/P3 unchanged from cycle 1 (out of severity scope per `--severity P0,P1`). Documented for follow-up.

## Findings resolved: 21 (all P0 + all P1)

### P0 (7)
- **BKND-01** `convex/organizaciones.ts` — `setEscala` no longer blocks downgrades that trigger overflow; auto-fills audit notas instead of throwing.
- **BKND-02** `setDiscount` rejects non-integer (`Number.isInteger` check).
- **BKND-03** `setPlanFechas` rejects dates outside [2020, 2100] via new `assertSaneEpochMs` helper.
- **BKND-04** `setPlanFechas` rejects `fecha_renovacion ≤ fecha_inicio` (cross-field check).
- **BKND-05** `toggleModulo` enforces PER ↔ PER-full mutual exclusivity (activating one removes the other from `modulos_activos`).
- **BKND-06** `setCustomCap` appends auto-flag warning to audit log when new cap < current usage (no silent overflow lock).
- **XCUT-01** Pricing constants drift mitigated via runtime parity check: new query `api.organizaciones.getPlanConstants` exposes backend values; `OrgDetailDrawer` compares against frontend mirror, surfaces console.warn + drawer banner on mismatch. (Full source-of-truth refactor deferred — would have exceeded 5-file sanity gate; current state safe since values currently agree.)

### P1 (14)
- **BKND-07** `recomputeStorage` now skips persisting `storage_bytes_used` when result is partial (paginated-limit hit); writes a distinct `recompute_storage_partial` audit entry and returns `after: null`.
- **BKND-10** `truncateAuditValue` returns `{_truncated, _preview}` (dropped `_size` field, ends with ellipsis). Frontend `safeStringify` recognizes the marker and renders `"(truncado) preview..."`.
- **BKND-11** Migration `backfillOrgPlanFields` audit entries now include `changed_by_email: "migration@system"`.
- **BKND-12** Migration `backfillStorageCounters` default batchSize raised 200 → 1000.
- **TZ-DATE** Date input in drawer uses `dateInputToEpochUTCNoon` (UTC mediodía); display uses `epochToDateInput`. No more local-midnight off-by-one in audit log.
- **CONFIRM** Native `window.confirm` replaced with new local `ConfirmDialog` component (Fluent-styled, Esc-cancels, Tab-traps focus, supports optional notas textarea).
- **FRNT-02** Inline styles in drawer moved to CSS classes (`drawer__h-spaced`, `drawer__drift-warning`, `drawer__partial-warning`, `drawer-kpi__value--overflow`).
- **FRNT-03** Drawer focus management implemented: initial focus on close button, Tab cycles inside drawer, focus restored to opener on close.
- **FRNT-05** Toggle buttons in módulos tab now have `role="switch"` + `aria-checked` + descriptive `aria-label`.
- **FRNT-06** Caps inputs gain `max={CAP_MAX[key]}` (10000 / 100000 / 10000 / 10240 GB) + UI validation parity with backend.
- **ROADMAP-GATE** Backend `toggleModulo` rejects roadmap activation if `discount_pct < 30` AND `setup_status !== "waived"`. Frontend opens `ConfirmDialog` requiring notas on roadmap toggle.
- **XCUT-05** New daily cron `recompute-org-storage` (04:00 UTC) → `internal.organizaciones.recomputeStorageDaily` processes 5 stalest orgs per run, reschedules until queue drained. Helper `computeOrgStorageBytes` extracted from `recomputeStorage` for reuse.
- **XCUT-07** New `OrgDetailDrawer.css` co-located with the component (drawer-specific classes + ConfirmDialog styles).
- **XCUT-10** `PlataformaPanel` empty state distinguishes "no orgs ever" vs "filter empty"; first case shows hint pointing to Organizaciones tab.

### P2 / P3 deferred (still present)
Out of severity scope this run. See `cycle-1/triage.md` for the list.

## Files modified (cycle 1)
| File | Status | Notes |
|---|---|---|
| `convex/organizaciones.ts` | modified | +700 LOC net: all 8 drawer mutations hardened, `recomputeStorage` partial-safe, new `getPlanConstants` query, new internal `recomputeStorageDaily`, helper extraction |
| `convex/migrations/seed_plan_fields.ts` | modified (untracked baseline) | audit email + batch size |
| `convex/crons.ts` | modified | +15 LOC daily storage recompute cron |
| `src/components/SuperAdmin/OrgDetailDrawer.jsx` | rewritten (untracked baseline) | ConfirmDialog, focus trap, UTC noon dates, aria attrs, parity check, partial-result UX, all P1 frontend fixes |
| `src/components/SuperAdmin/OrgDetailDrawer.css` | **NEW** | drawer-specific styles + ConfirmDialog |
| `src/components/SuperAdmin/PlataformaPanel.jsx` | modified (untracked baseline) | empty-state CTA branching |
| `src/components/SuperAdmin/PlataformaPanel.css` | modified (untracked baseline) | empty-state hint style |

**Total: 7 files touched.** No batch exceeded 5-file sanity gate.

## Build + lint status
- `npm run build` → PASS (4 batches, every cycle 1 batch verified)
- `npx eslint` → PASS on the 2 touched JSX files (4 unused-import warnings cleaned)
- Convex typecheck: skipped (no in-repo script); generated types `_generated/api.d.ts` + `internal.d.ts` will refresh on next `npx convex dev` to pick up new `getPlanConstants` query + `recomputeStorageDaily` internal mutation.

## Post-loop manual smoke (recommended)
1. Run `npx convex dev` once to regenerate `_generated/*.d.ts` (picks up new exports).
2. Log in as `super_admin` → open Plataforma → verify orgs render, KPI aggregates correct.
3. Open one org drawer → walk Uso / Plan / Módulos / Caps / Fechas / Audit tabs.
4. Trigger each mutation: change escala (modal appears), toggle one módulo, set discount (try `15.5` to confirm rejection), set cap below current usage (audit log gets auto-warn), toggle a roadmap module (modal prompts notas), suspend org (modal confirms).
5. Recompute storage manually; confirm partial vs full handling.
6. Test Esc + Tab inside drawer (focus trap).
7. Re-login as `admin` → confirm Plataforma tab is hidden.

## Suggested commit

```
feat(plataforma): harden super_admin billing panel — gates, audit, UX

P0:
- setEscala no bloquea downgrades con overflow (auto-notas en audit)
- setDiscount exige entero
- setPlanFechas valida año + cross-field inicio<renovación
- toggleModulo PER ↔ PER-full mutuamente exclusivos
- setCustomCap audita warning si cap < uso actual
- toggleModulo roadmap requiere notas + discount≥30% o setup=waived
- runtime parity check entre precios UI ↔ backend (getPlanConstants)

P1:
- recomputeStorage no persiste resultados parciales
- truncateAuditValue + safeStringify renderizan limpio
- cron diario recompute storage (chunked + reschedule)
- migrations: email + batchSize default
- ConfirmDialog reemplaza window.confirm + Esc + focus trap
- drawer focus management (initial + trap + restore)
- aria-checked + role=switch en toggles
- inputs: max bounds + UTC noon dates
- OrgDetailDrawer.css separado del panel CSS
- empty-state CTA cuando no hay orgs
```

## Open follow-ups (P2/P3 + maintenance)

- Extract `ESCALA_BASE_USD` + `MODULOS_*` from `OrgDetailDrawer.jsx` to a JSON/JS mirror generated from `convex/lib/limits.ts` + `convex/lib/modules.ts` (replace runtime parity check with build-time guarantee).
- Document `ALLOW_BACKFILL` / `ALLOW_PURGE` / `ALLOW_E2E` env vars in `.env.example` + README.
- Server-side aggregation query for Plataforma KPIs (`totalMrr` / `totalOverflow` / `orgsWithOverflow`) — current `useMemo` over full list is fine <100 orgs.
- Tests for `organizaciones.ts` mutations + drawer interactions (per CLAUDE.md roadmap).
- Bulk operations (bulk-suspend, bulk-set-escala) + CSV/JSON export.

## State files
- `status.json` final: `{state: "done", final_state: "clean", cycles_completed: 2}`
- Audit findings: `cycle-1/audit-{1,2,3}-*.md` + `cycle-1/triage.md`
- Verify pass: `cycle-2/triage.md`
- Backups: `cycle-1/backup/{organizaciones.ts.bak, OrgDetailDrawer.jsx.bak, pre-worker.patch}`
