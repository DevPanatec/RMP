# Heal-Loop Plan: SuperAdmin "Plataforma" Panel — pristino, completo, profesional

## Context

User clarification: *"admin panel"* in original request = the **Plataforma** tab in `AdminDashboard`, i.e. the **super_admin control center** that manages all organizations (plan, escala, módulos, caps, billing/MRR, audit log).

Scope is therefore narrow + high-stakes:
- **UI**: `src/components/SuperAdmin/PlataformaPanel.jsx` (262 LOC, orgs grid + filters + aggregates) + `src/components/SuperAdmin/OrgDetailDrawer.jsx` (502 LOC, 6 sub-tabs: Uso / Plan / Módulos / Caps / Fechas / Audit).
- **Backend**: `convex/organizaciones.ts` super_admin mutations called by the drawer (`setEscala`, `toggleModulo`, `setCustomCap`, `setDiscount`, `setSetupStatus`, `setPlanFechas`, `setActive`, `recomputeStorage`) + queries (`listWithStats`, `getOrgStats`).
- **Helpers (new, untracked)**: `convex/lib/limits.ts`, `convex/lib/modules.ts` — likely power escala caps + módulo gates. Must verify they're wired and correct.
- **Entry point**: `src/pages/AdminDashboard/AdminDashboard.jsx` tab `plataforma` (super_admin only).
- **Migrations folder** (untracked): `convex/migrations/` — may relate to billing/módulos schema.

The Plataforma panel is the **billing brain** of the SaaS — bad math, missing gates, or broken cascades = revenue leak or cross-tenant exposure. "Pristino" here is non-negotiable.

## Heal-loop config

| Flag | Value | Reason |
|---|---|---|
| `--auditors` | 3 | Backend / Frontend / Cross-cut split fits this surface |
| `--max-cycles` | 3 | Default. Surface is bounded so 1-2 cycles likely enough |
| `--severity` | P0,P1 | "Profesional" implies fixing major UX/design issues too, not just security |
| `--worker-mode` | serial | v1 default |
| `--no-fix` | false | Apply fixes |

## Auditor decomposition

### Auditor 1 — Backend (`convex/organizaciones.ts` + `convex/lib/*`)

Focus files: `convex/organizaciones.ts`, `convex/lib/limits.ts`, `convex/lib/modules.ts`, `convex/migrations/*.ts`.

Hunt for:
- **Every drawer-called mutation gated by `requireSuperAdmin`**: `setEscala`, `toggleModulo`, `setCustomCap`, `setDiscount`, `setSetupStatus`, `setPlanFechas`, `setActive`, `recomputeStorage`. Any missing = P0.
- **Input validation**: escala in `['S','M','L','XL','XXL']`; discount 0-15; caps non-negative numbers; setup_status in `['pendiente','pagado','waived']`; módulo codes in known set; dates sane (not in 1970, not >100y).
- **Audit log integrity**: every mutation appends an audit entry with `before_value`, `after_value`, `changed_by_user_id`, `changed_by_email`, `timestamp`, `field`, `action`. `truncateAuditValue` used to cap at 5KB. Missing audit entry on any mutation = P0.
- **`recomputeStorage` correctness**: counts actual storage from `_storage` table, writes `storage_last_recompute`, returns `{before, after, drift}`. Audit log entry with drift > threshold flagged.
- **`listWithStats` + `getOrgStats`**: super_admin only; `usage.counts/caps/pct/overflow` computed correctly; `mrr_usd = base_usd + modulos_usd + overflow_total_usd` (verify formula); discount applied last.
- **Overflow math**: extras = max(0, current - cap); per-resource USD prices documented in `lib/limits.ts`.
- **Módulo toggle side-effects**: activating `PER-full` deactivates `PER`? Activating roadmap módulo without contract — warning or hard block?
- **`setActive(false)` cascade**: cron/queries hide suspended org data? Conductors logged out? Or just flagged?
- **Race conditions**: concurrent `toggleModulo` calls — `modulos_activos` array updated atomically?
- **Migrations gating**: `requireSuperAdmin` + env var (`ALLOW_BACKFILL=1`)? Idempotent? Documented?

### Auditor 2 — Frontend (`PlataformaPanel.jsx` + `OrgDetailDrawer.jsx` + CSS)

Focus files: `src/components/SuperAdmin/PlataformaPanel.jsx`, `src/components/SuperAdmin/OrgDetailDrawer.jsx`, their `.css` files (verify exist), `src/components/Icons/index.js` (modified).

Hunt for:
- **Fluent compliance**: hardcoded hex (`PlataformaPanel.jsx:10-15` has `ESCALA_COLORS` with literal hex — acceptable for data viz, but verify no other hardcoded colors), spacing tokens, radius 2-8px, shadows xs/sm, font sizes from scale.
- **Inline styles vs CSS** (`OrgDetailDrawer.jsx:143, 246-257, 284, 312, 359, 438, 450` — multiple inline-style blocks): should move to CSS class for consistency.
- **Loading + error + empty states**: every tab in drawer + panel handles `undefined`/`null`/empty list?
- **Optimistic UI**: mutations are awaited, `busy` flag locks buttons. Good. But no rollback on failure beyond error feedback. Critical?
- **Accessibility**: drawer has `role="dialog"`, `aria-modal`, `aria-labelledby` ✓, Esc close ✓. Focus trap? Initial focus on close button? Tab order?
- **`window.confirm` usage** (lines 273, 320): blocking native dialog — should be replaced with toast or Fluent-styled modal? CLAUDE.md design system implies custom modals.
- **Number inputs without min/max enforcement on submit** (line 286-308 discount — good, validates onBlur; line 400-414 caps — no max, what if user enters 999999?).
- **Date input timezone**: lines 441-446, 453-460 — `new Date(raw).getTime()` parses as local; for global SaaS should use UTC noon to avoid off-by-one-day in audit log.
- **Audit log table**: lines 480-489 — `safeStringify` truncates at 200 chars. Backend truncates at 5KB. Mismatch causes truncation-of-truncation, ugly. Or fine?
- **Mobile responsiveness**: drawer width? grid breakpoints? Panel header on small screens?
- **Search + filters**: debounced? Persisted in URL or session?
- **Empty `modulos_activos`** rendering: `modulo-chip--empty` shown. Good.
- **MODULOS_PRODUCCION / MODULOS_ROADMAP / ESCALA_BASE_USD constants duplicated** (line 25, 27-41) — should live in shared lib alongside `convex/lib/limits.ts` / `lib/modules.ts` to keep frontend + backend in sync. Currently a drift hazard.
- **Hardcoded prices** (line 28-41 modules, line 25 escala base) — if backend `lib/limits.ts` has the same numbers and they drift, MRR computed in backend ≠ price shown to admin in UI.

### Auditor 3 — Integration / cross-cut

Focus: gaps between Plataforma feature intent and reality, dead code, missing wiring.

Hunt for:
- **CSS files exist**: `PlataformaPanel.css` referenced at line 6 but is it in repo? `OrgDetailDrawer.css` — referenced? Without CSS, classes like `drawer-overlay`, `org-card`, `agg-kpi` render unstyled.
- **Tab gate in AdminDashboard**: `plataforma` tab visible only if `userRole === 'super_admin'`. Verify both `userRole` derivation AND tab definition gate.
- **`OrganizationSwitcher` interaction**: super_admin can switch org context; when in Plataforma tab, does switching affect the displayed orgs list? (Probably not — list always shows all orgs.)
- **Constants drift risk**: ESCALA_BASE_USD + MODULOS prices live in `OrgDetailDrawer.jsx` AND in `convex/lib/limits.ts`. Source of truth? Pick one, import from the other (frontend can't import from `convex/` directly — needs shared `.json` or generated file).
- **`recomputeStorage` UX**: drift > 1 GB shows warning. Good. But does it auto-trigger anywhere? Cron in `convex/crons.ts`?
- **Roadmap módulos** (BI, API, SSO, WL, PER-full) — backend supports activating them, but no actual feature code? Activating = paying for nothing? Hard block in UI or in backend?
- **Missing tabs vs spec**: drawer has 6 tabs. Is there a planned "Invoices" / "Notes" / "Contact" / "Activity" tab missing per CLAUDE.md or any plan doc?
- **`setDiscount` max 15%**: enforced in UI (line 287 `max={15}` on input) AND in backend? UI-only validation is a security smell.
- **No bulk operations**: super_admin can't bulk-suspend or bulk-set escala. Acceptable for v1 or P2?
- **No export**: no CSV/JSON export of orgs list, audit log. P2 or P1?
- **Plataforma KPIs** (`totalMrr`, `totalOverflow`, etc.) — computed in `useMemo` over full orgs list client-side. With 100+ orgs OK; 10k orgs not. Future concern.
- **Untracked migrations**: `convex/migrations/*` — what do they do? Run-once scripts to backfill `escala`, `modulos_activos`, `custom_caps`, `discount_pct`, `setup_status`, `fecha_inicio_plan`, `fecha_renovacion_plan` columns? Documented?
- **`convex/lib/modules.ts` `requireModulo`** — referenced from `convex/empleados.ts` (per CLAUDE.md). Verify every per-modulo mutation gates correctly + module-disabled error message is user-friendly.

## Critical files (likely touched in worker phase)

- `convex/organizaciones.ts` (gates, validation, audit log)
- `convex/lib/limits.ts` (caps + overflow pricing)
- `convex/lib/modules.ts` (modulo gates)
- `src/components/SuperAdmin/PlataformaPanel.jsx`
- `src/components/SuperAdmin/PlataformaPanel.css` (if missing, create)
- `src/components/SuperAdmin/OrgDetailDrawer.jsx`
- `src/components/SuperAdmin/OrgDetailDrawer.css` (verify exists)
- Possibly: a new `src/shared/plan-constants.js` (or `convex/lib/plan-constants.ts` + JSON export) to dedupe escala/módulo prices

## Sanity gates (PAUSE for approval)

Per skill spec — pause before:
- Editing `convex/schema.ts` (any structural change to organizaciones table)
- Patch touching >5 files in a single batch
- Modifying `CLAUDE.md`, `package.json`, `.env.local`, `.mcp.json`
- Worker-stuck (P0 flat 2 cycles in row)
- Build guard fails
- Any `git reset --hard` / `git apply -R` revert of uncommitted baseline (heal-loop only reverts its OWN batch via per-cycle patch file)

## Stop conditions

1. **CLEAN** — P0 == 0 AND P1 == 0 → final report
2. **MAX-CYCLES** — N == 3 → final report with remaining findings flagged
3. **STUCK** — P0 count flat across cycles → pause
4. **BUILD-FAILED** — `npm run build` fails → revert cycle batch, halt

## Verification (end-of-loop)

- `npm run build` PASS (build guard runs each cycle automatically)
- `npm run lint` PASS on touched files
- Manual smoke: log in as super_admin → open Plataforma → verify orgs render with usage bars + KPIs → open one org drawer → walk all 6 tabs → trigger a mutation in each tab (toggle one módulo, change escala on a test org, set discount, recompute storage) → verify audit log appends → verify no console errors → verify Esc closes drawer → verify suspended-org filter works
- Re-log as `admin` → confirm Plataforma tab is hidden
- `git diff --stat` to confirm scope of changes matches plan

## Output

`.audit-state/heal-loop/<RUN_ID>/FINAL_REPORT.md` with P0/P1 trend table, files modified, suggested commit message in conventional commit format.

## Pre-flight note

Working tree currently has 18 modified/untracked files (per git status). Heal-loop snapshots its own per-cycle diff for revert safety; **your uncommitted baseline is never touched on revert**. If a cycle's edits break build, only those cycle edits revert.

Proceed?
