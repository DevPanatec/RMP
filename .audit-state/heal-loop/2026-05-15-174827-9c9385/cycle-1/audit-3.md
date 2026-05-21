# Audit 3 cycle 1 — Integration / Cross-Cut

## P0
- [lint-01] .eslintrc.cjs:9 — ESLint `ignorePatterns` lacks `playwright-report` (and `audit/`, `test-results/`). 460 build-blocking errors come from `playwright-report/trace/assets/codeMirrorModule-Ds_H_9Yq.js`, a vendored minified file. `npm run lint` exits non-zero → CI/build-guard fails. Fix: add `'playwright-report', 'audit', 'test-results', 'tests-e2e/**/*.spec.ts'` to `ignorePatterns` in `.eslintrc.cjs`.

## P1
- [env-01] convex/perfiles.ts:508 — `process.env.CLERK_FRONTEND_DOMAIN` falls back to hardcoded `https://peaceful-mustang-86.clerk.accounts.dev`. Same pattern in `convex/auth.config.ts:4` (`CLERK_ISSUER`). CLAUDE.md explicitly warns this fallback breaks non-default deploys but the fallback persists. Fix: throw at module init when env var is unset in production (e.g. guard on `CONVEX_DEPLOYMENT_TYPE === 'prod'`).
- [env-02] convex/http.ts:64 — SAFETAG_WEBHOOK_SECRET / TOKEN missing returns 503 (good) but no startup-time validation; silent prod misconfig possible. Fix: log a warning at module-load if neither is set (best-effort observability).
- [migrations-01] convex/migrations/seed_plan_fields.ts:188 — `ctx.db.patch(orgId as any, …)` writes to ANY org doc; correctly gated by `ALLOW_BACKFILL=1` + `requireSuperAdmin` and supports `dryRun`. However `backfillStorageCounters` uses `.take(batchSize)` (default 200) without offset/cursor — running it twice processes the SAME first N rows. No idempotency token, so re-runs double-count `storage_bytes_used` per org if `file_size` already populated (line 130/154/180 add bytes regardless of whether they were already counted in the org total). Fix: track a `migration_state` table or set a `migration_marker` field per photo to skip on rerun.
- [docs-01] CLAUDE.md:393 — Lists `geofenceAlerts.ts` as an existing module; no such file exists (only `convex/geofences.ts`). Update doc or merge expectation. Fix: remove `geofenceAlerts.ts` bullet — alerts live inside `geofences.ts`.
- [docs-02] CLAUDE.md:373-376 — Function lists drift from reality: `rutas.ts` doc says `create/update/delete` but code has `add/update/remove`; `route_progress.ts` doc says `create` but code has `start`; `route_reports.ts` doc says `create` but code has `add`; `perfiles.ts` doc says `create` but code has `createByUserId` + `createUserWithClerk`. Fix: align doc to actual exports.
- [docs-03] CLAUDE.md:397 — `crons.ts` description claims "GPS connection monitoring, alert cleanup" but actual crons are `sync-safetag-devices` (11s), `clean-old-gps-history` (daily), `update-gps-connection-status` (60s). No "alert cleanup" cron exists. Fix: replace bullet to match `convex/crons.ts` reality.

## P2
- [schema-01] convex/schema.ts (uncommitted, +44 lines) — Adds plan/billing fields (`escala`, `modulos_activos`, `custom_caps`, `setup_status`, `discount_pct`, `storage_bytes_used`) + new `org_audit_log` table. `[NEEDS-HUMAN]` per CLAUDE.md sanity gate — schema edits require human approval. Fix: surface in next sanity-gate review; ensure migration `seed_plan_fields.ts` is paired and applied before deploy.
- [docs-04] CLAUDE.md:81 vs CLAUDE.md:593 vs CLAUDE.md:705 — Triple inconsistency in provider count: line 81 says "**14 providers**", line 593 says "(10 providers)", line 705 says "(13 providers: …)". Fix: settle on one count (count `App.jsx` providers directly and update all three refs).
- [docs-05] CLAUDE.md:31 — Lists 5 user roles but section header still says "supports **5 user types**" while bullets enumerate 5 (super_admin, admin, enterprise, viewer, conductor) — consistent now, but earlier `tipo_usuario: 'admin' | 'enterprise' | 'conductor'` at line 250 omits `super_admin` and `viewer`. Fix: update the typedoc on perfiles_usuarios to include all 5 roles.
- [lint-02] AdminDashboard.jsx + multiple files — 295 `no-unused-vars` / `react-hooks/exhaustive-deps` warnings. Not blocking but signal dead code (lines 32-172 of AdminDashboard.jsx have ~25 unused imports/vars). Fix: cleanup pass, prefix unused with `_` or remove.
- [crons-01] convex/crons.ts:30 — Comment says "11s" is intentional offset but no rationale for picking 11s vs 13s vs 17s (any non-multiple of 10 would work). Cost impact noted but no monitoring tag. Fix: add a TODO or env-driven interval so it can be lowered to 60s once webhook is solid (already mentioned in comment, formalize).
- [gitignore-01] .gitignore:69 — `audit/` is ignored, but the ESLint config doesn't mirror this (see lint-01). Functional but inconsistent. Fix: keep `.gitignore` as is; sync ESLint `ignorePatterns`.

## Stats
- Cross-cut areas audited: 9 (api-drift, env, migrations, lint, docs, schema, crons, http, gitignore)
- Findings: P0=1 P1=6 P2=6
- Lint errors: 460 (100% from vendored `playwright-report/trace/assets/codeMirrorModule-Ds_H_9Yq.js` — 0 in real source). Warnings: 295 (in real source).
