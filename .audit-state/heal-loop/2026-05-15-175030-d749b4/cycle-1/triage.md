# Triage cycle 1 — 2026-05-15

## Stats
- Total findings raw: 15 backend + 15 frontend + 20 cross-cut = 50
- After dedupe (same issue across auditors): ~38 distinct findings
- Severity (post-dedupe, after dispute resolution): **P0=7, P1=14, P2=12, P3=5**

## Disputes resolved
- **Constants drift** (XCUT-01 P0 vs FRNT-04 P1): most-severe vote → **P0**, but current values match between frontend/backend → mitigation is refactor, can be sequenced last in cycle.
- **listWithStats includes suspended** (BKND-09 P1): UI client-side filter expects all orgs returned (Plataforma has "Suspendidas" filter). Not a bug, just payload waste → **demoted to P3**.
- **Date timezone** (BKND-08 + FRNT-07 + XCUT-20): collapses to single finding [TZ-DATE].
- **window.confirm** (FRNT-01 + XCUT-03): collapses to single finding [CONFIRM].
- **Roadmap activation** (XCUT-04 + XCUT-12): collapses to [ROADMAP-GATE].

## P0

- [BKND-01] convex/organizaciones.ts:294-340 — `setEscala` requires `notas` when overflow triggers downgrade; frontend (OrgDetailDrawer.jsx:275) never sends notas. Downgrade flow broken. Fix: backend make notas optional + log "no notas provided" in audit; OR frontend prompts user via modal when downgrade has overflow. → backend-only fix preferred (don't block downgrade, just record).
- [BKND-02] convex/organizaciones.ts:441-447 — `setDiscount` allows non-integer (15.7). Fix: `if (!Number.isInteger(args.pct)) throw`.
- [BKND-03] convex/organizaciones.ts:488-510 — `setPlanFechas` no date sanity. Fix: validate year ∈ [2020, 2100] for each date.
- [BKND-04] convex/organizaciones.ts:504-506 — `setPlanFechas` no inicio<renovacion. Fix: cross-field check.
- [BKND-05] convex/organizaciones.ts:365-383 — `toggleModulo` lets PER + PER-full coexist → double billing. Fix: activating PER-full removes PER; reverse symmetric.
- [BKND-06] convex/organizaciones.ts:387-433 — `setCustomCap` allows cap below current usage → perpetual overflow lock. Fix: warn in audit log + reject if would lock hard_cap_extras.
- [XCUT-01] OrgDetailDrawer.jsx:25-41 + convex/lib/limits.ts + convex/lib/modules.ts — pricing constants duplicated frontend/backend, no parity test. Fix: extract to shared `convex/lib/plan-constants.ts` (TS); frontend imports JSON-compatible export OR mirror via generated file. (Refactor, defer to last if scope explosion.)

## P1

- [BKND-07] convex/organizaciones.ts:521-617 — `recomputeStorage` partial result writes incomplete value + poisons audit. Fix: on partial=true skip storage update.
- [TZ-DATE] OrgDetailDrawer.jsx:441-446, 453-460 — date input parsed local midnight; should be UTC noon. Backend should also reject obviously-wrong epochs. Fix: frontend uses `Date(raw + 'T12:00:00Z')`.
- [BKND-10] convex/organizaciones.ts:158-179 — `truncateAuditValue` returns metadata object dump in audit log. Fix: return clean truncated string + `_truncated` flag only.
- [BKND-11] convex/migrations/seed_plan_fields.ts:70 — migration audit missing email. Fix: pass `migration@system` as email.
- [BKND-12] convex/migrations/seed_plan_fields.ts:102 — default batchSize=200 too low. Fix: raise to 1000.
- [CONFIRM] OrgDetailDrawer.jsx:273, 320 — native `window.confirm` violates Fluent. Fix: replace with custom modal component (or for v1: react-hot-toast confirm pattern).
- [FRNT-02] OrgDetailDrawer.jsx:247-257, 284, 312, 359, 438, 450 — static inline styles → CSS classes. Fix: extract to OrgDetailDrawer.css with classes.
- [FRNT-03] OrgDetailDrawer.jsx drawer focus management — no focus trap / initial focus / restore. Fix: add focus trap (use `focus-trap-react` or manual implementation), initial focus on close button, restore opener focus on close.
- [FRNT-05] OrgDetailDrawer.jsx:345, 372 toggle buttons lack `aria-pressed` + `aria-label`. Fix: add both attrs.
- [FRNT-06] OrgDetailDrawer.jsx:400-414 caps inputs missing `max` bound. Fix: add `max={...}` (use a generous ceiling like 100000 for camiones, 10000 for proyectos/usuarios, 100000 for storage GB).
- [ROADMAP-GATE] convex/organizaciones.ts:343-384 + OrgDetailDrawer.jsx:374 — roadmap módulos can be activated without discount or notas. Fix: backend reject roadmap activation if `discount_pct < 30 && !notas`; frontend prompt for notas + warning modal on roadmap toggle.
- [XCUT-05] convex/crons.ts — no recompute storage cron. Fix: add daily cron to recompute storage for all orgs.
- [XCUT-07] src/components/SuperAdmin/ — no OrgDetailDrawer.css; styles live in PlataformaPanel.css. Fix: create OrgDetailDrawer.css + extract drawer styles + import.
- [XCUT-10] PlataformaPanel.jsx — empty state has no "Create org" CTA. Fix: add button → link to Organizaciones tab.

## P2 (deferred — outside --severity scope)

- [BKND-13] modules.ts:142 error message hardcodes undefined
- [BKND-14] organizaciones.ts:410 comment vs error message mismatch
- [BKND-15] sumModulosUsd silently skips unknown códigos
- [FRNT-08] mobile breakpoint <480px verify
- [FRNT-09] audit value truncation no hover tooltip
- [FRNT-10] discount UI vs backend validation parity
- [FRNT-11] activeTab URL hack guard
- [FRNT-13] PlataformaPanel.css drawer styles split (maintainability)
- [XCUT-06] .env.example / README env var docs
- [XCUT-08] server-side aggregation for >100 orgs
- [XCUT-13] KPI client-side compute future concern
- [XCUT-18/19] no bulk ops / no export

## P3
- [BKND-09] listWithStats payload includes suspended (UI expects all)
- [FRNT-12/13/14] minor a11y / loading polish
- [XCUT-16] Spanish/English label mixing
- [XCUT-11] no tests (deferred per CLAUDE.md roadmap)
- [XCUT-17] CSS split maintainability

## Worker batches (P0 + P1 only)

Sized to respect "patch >5 files = PAUSE for approval" sanity gate.

### Batch A — backend P0/P1 (single file)
File: `convex/organizaciones.ts` only.
Findings: BKND-01, BKND-02, BKND-03, BKND-04, BKND-05, BKND-06, BKND-07, BKND-10, ROADMAP-GATE (backend half).

### Batch B — backend migrations + crons (3 files)
Files: `convex/migrations/seed_plan_fields.ts`, `convex/crons.ts`, possibly `convex/migrations/storage_backfill.ts` (verify).
Findings: BKND-11, BKND-12, XCUT-05.

### Batch C — frontend OrgDetailDrawer fixes (1-2 files)
Files: `src/components/SuperAdmin/OrgDetailDrawer.jsx`, new `src/components/SuperAdmin/OrgDetailDrawer.css`.
Findings: TZ-DATE, CONFIRM, FRNT-02, FRNT-03, FRNT-05, FRNT-06, ROADMAP-GATE (frontend half).

### Batch D — frontend PlataformaPanel + drawer CSS extract (2 files)
Files: `src/components/SuperAdmin/PlataformaPanel.jsx`, `src/components/SuperAdmin/PlataformaPanel.css`.
Findings: XCUT-10.

### Batch E — constants extraction (3 files — REQUIRES APPROVAL per sanity gate if combined)
Files: new `convex/lib/plan-constants.ts`, `convex/lib/limits.ts` (refactor to use), `convex/lib/modules.ts` (refactor to use), `src/shared/plan-constants.js` (or similar), `OrgDetailDrawer.jsx` (consume).
Findings: XCUT-01 (constants drift P0).

**Total batches: 5. Total files touched: ~10. No single batch >5 files except Batch E (5 files, at threshold — will pause).**
