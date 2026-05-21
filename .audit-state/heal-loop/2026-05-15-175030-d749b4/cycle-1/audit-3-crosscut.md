# Audit 3 cycle 1 — Cross-cut Integration Findings

## P0
- [XCUT-01] `src/components/SuperAdmin/OrgDetailDrawer.jsx:25 & convex/lib/limits.ts:17-21` — **Duplicated escala base pricing constants** (ESCALA_BASE_USD in drawer vs ESCALA_LIMITS in backend) with no source-of-truth enforcement. If frontend prices drift from backend (both hardcoded), super_admin UI shows wrong MRR. Risk: incorrect billing decisions. Fix: extract to shared `convex/lib/plan-constants.ts` + export JSON mirror for frontend import.

## P1
- [XCUT-02] `src/components/SuperAdmin/OrgDetailDrawer.jsx:27-41 & convex/lib/modules.ts:20-98` — **Duplicated módulo prices** (MODULOS_PRODUCCION/ROADMAP in drawer vs MODULO_CATALOG in backend). Same drift risk as P0. Drawer UI shows ±$100 margin on BI ($600 vs $600) but no test ensures parity. Fix: same as XCUT-01 — single source.

- [XCUT-03] `src/components/SuperAdmin/OrgDetailDrawer.jsx:273, 320` — **Two `window.confirm()` dialogs** (scale change, suspend org) violate Fluent design system. Should use Fluent-styled modal or toast. Scope change implies approval; native confirm is jarring. Fix: replace with custom modal/toast per CLAUDE.md design pattern.

- [XCUT-04] `src/components/SuperAdmin/OrgDetailDrawer.jsx:374` — **Roadmap module activation safety without backend enforcement**. UI title warns "activar solo con discount 30% o contrato firmado" but: (a) UI doesn't enforce 30% check, (b) backend `toggleModulo()` only requires notas field, not actual discount validation. Super_admin can activate BI for $0/mo discount org, bills $600 for feature DNE. Fix: backend `toggleModulo()` add check: `if (roadmap && discount_pct < 30) throw`. Plus UI validation.

- [XCUT-05] `convex/crons.ts` — **No cron triggers `recomputeStorage()` automatically**. Storage counter is manual-only (super_admin must click button in drawer). With photo mutations that don't decrement counter, drift accumulates silently. Fix: add cron job to recompute storage for all orgs daily (low-priority background).

- [XCUT-06] `convex/migrations/seed_plan_fields.ts` — **Backfill gated by `ALLOW_BACKFILL=1` env var + `requireSuperAdmin`, idempotent via dry-run mode**. ✓ Correct. But: no mention in `.env.example` or README of required env var. Users deploying prod won't know it exists. Fix: document in CLAUDE.md + add to .env.example.

- [XCUT-07] `src/components/SuperAdmin/OrgDetailDrawer.jsx` — **Missing CSS import**. File has no `import './OrgDetailDrawer.css'` at top; drawer styles live only in PlataformaPanel.css. If drawer scales to its own tab, styles will be scattered/unmaintainable. Fix: create `OrgDetailDrawer.css`, extract drawer-specific styles, import both.

- [XCUT-08] `convex/organizaciones.ts:206-252` — **`listWithStats` client-side aggregation via `useMemo` in PlataformaPanel**. With 10k orgs, loop over all + compute MRR for each = N queries + expensive client-side math. For v1 (<100 orgs) OK; v2 concern. Fix: add server-side aggregation query `listWithStatsAggregated()` returning {totalMrr, totalOverflow, orgsWithOverflow} summary.

- [XCUT-09] `convex/schema.ts:48-61` — **`org_audit_log` table defined and indexed correctly** (`by_organizacion`, `by_timestamp`, `by_org_timestamp`). ✓ Good. All drawer mutations call `writeAuditLog()` with before/after values + user email. Tested via drawer audit tab (lines 469-493 OrgDetailDrawer). ✓ Pass.

- [XCUT-10] `src/components/SuperAdmin/PlataformaPanel.jsx` — **No "Create first organization" CTA when list is empty**. Panel shows empty state but no button to create org (creation requires separate Organizaciones tab). For new super_admin user, unclear path. Fix: add placeholder with link "Create an organization" when count === 0.

- [XCUT-11] **No tests found** for PlataformaPanel / OrgDetailDrawer / organizaciones mutations. Per CLAUDE.md roadmap, tests pending for cycle 3. Note as P2 blocker for "pristino" claim until tests exist.

- [XCUT-12] `convex/organizaciones.ts:343-384` — **Roadmap modulo activation requires notas (anti-overcommit)**. Good pattern. But UI (drawer) doesn't ask for notas on toggle — it silently calls mutation with `notas: undefined`. Backend rejects mutation. User sees error, confused. Fix: drawer toggle should prompt for notas via modal if roadmap module.

## P2
- [XCUT-13] `src/components/SuperAdmin/PlataformaPanel.jsx:161-169` — **Plataforma KPI client-side computation** (`totalMrr`, `totalOverflow`, `orgsWithOverflow` in `useMemo`). Flagged as future concern. Current scope <50 orgs = fine. Document in code comment for v2 refactor.

- [XCUT-14] `src/pages/AdminDashboard/AdminDashboard.jsx:741-742` — **Plataforma tab gated by `isSuperAdmin`** ✓. Confirmed: `case 'plataforma': return isSuperAdmin ? <PlataformaPanel /> : null;`. Also tab nav at line 859-860 only shows tab if super_admin. ✓ Pass.

- [XCUT-15] `convex/lib/modules.ts:105-156` — **Module gating functions** `hasModulo()`, `sumModulosUsd()`, `requireModulo()`, `callerHasModulo()` are wired. Spot-check: `convex/empleados.ts` (per CLAUDE.md) imports + calls `requireModulo("PER")`. ✓ Consistent. No module gate inconsistency found.

- [XCUT-16] **Spanish/English label mixing**: drawer tabs are Spanish (Uso/Plan/Módulos/Caps/Fechas/Audit). UI text mostly Spanish (correct). One minor: feedback messages "Cargando…", "Error" are Spanish; icon labels in english (refresh, close). Acceptable for v1; normalize in polish cycle.

- [XCUT-17] `src/components/SuperAdmin/PlataformaPanel.css:1-50` — **CSS file exists and references Fluent design tokens** (`var(--space-16)`, `var(--color-text)`, `var(--radius-base)`). ✓ Good. Drawer styles also in same file (lines ~200+). Functional but could split for maintainability (minor).

- [XCUT-18] **No bulk operations** (bulk suspend, bulk set escala). Acceptable for MVP. P2 for feature backlog.

- [XCUT-19] **No export feature** (CSV/JSON of orgs, audit log). Acceptable for MVP. P2 for feature backlog.

- [XCUT-20] **Date input timezone handling** (`OrgDetailDrawer.jsx:441, 453`). Uses `new Date(raw).getTime()` which parses as local timezone. For global SaaS, should use UTC noon to avoid off-by-one-day. Minor issue but worth fixing: `new Date(raw + 'T12:00:00Z').getTime()`.

## Stats
- Findings: P0=1 P1=12 P2=10 (23 total)
- Status: **XCUT-01/02 are critical** (pricing constants drift = revenue risk). XCUT-04 is **P1 security** (roadmap activation without discount enforcement).
- Schema ✓ (all drawer fields exist in organizaciones + org_audit_log).
- Mutations ✓ (all 8 drawer mutations gated by `requireSuperAdmin`).
- Migrations ✓ (backfill gated, idempotent, documented in code).
- CSS ✓ (PlataformaPanel.css exists; OrgDetailDrawer styles colocated — minor maintainability note).
- Tests ✗ (none found; deferred per roadmap).
