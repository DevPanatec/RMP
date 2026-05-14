# Troops — Self-healing Audit System

## TL;DR — 3 chats

```
Chat 1:  /audit-run       ~5 min  → init + bootstrap E2E + run Playwright (9 viewports)
Chat 2:  /audit-analyze   ~3-5 min → 6 subagents parallel + triage → AUDIT_FINDINGS.md
Chat 3:  /audit-cleanup   ~1 min  → purge Convex+Clerk, verify clean, archive
```

That's the whole audit cycle. Inside each phase the granular troops self-orchestrate.

`/troops` (plural) anytime shows live status board.

## What runs inside each phase

| Phase | Sub-troops | Order |
|---|---|---|
| `/audit-run` | overseer → bootstrapper → spec-runner | sequential |
| `/audit-analyze` | 5 inspectors + break-analyzer in PARALLEL, then triage | parallel then sequential |
| `/audit-cleanup` | teardown | (single step) |

## Granular troops (advanced / recovery)

Use these when a phase fails partway and you need to retry just one step, or when you want explicit control:

| Slash command | Mission |
|---|---|
| `/troops` | Status board (read-only) |
| `/troop-overseer` | Init run: generate runId, write missions, status.json |
| `/troop-bootstrapper` | Bootstrap E2E (1 org + 5 users + seed) |
| `/troop-spec-runner` | Run Playwright across 9 viewports |
| `/troop-inspector-super-admin` | Inspect super_admin screenshots |
| `/troop-inspector-admin` | Inspect admin screenshots |
| `/troop-inspector-enterprise` | Inspect enterprise screenshots |
| `/troop-inspector-viewer` | Inspect viewer screenshots |
| `/troop-inspector-conductor` | Inspect conductor screenshots (mobile priority) |
| `/troop-break-analyzer` | Analyze break.spec.ts (XSS, WCAG, race, leaks) |
| `/troop-triage` | Merge findings → AUDIT_FINDINGS.md (single writer) |
| `/troop-fix-applier <id>` | Apply patch for a finding ID (sandboxed) |
| `/troop-fix-verifier <id>` | Re-run affected specs, suggest revert if regression |
| `/troop-healer` | Fix broken selectors via Playwright Healer |
| `/troop-teardown` | Purge E2E data (mandatory) |
| `/troop-schedule [cron]` | CronCreate recurring audit |

## Dependency graph

```
overseer (no dep)
  └─ bootstrapper
       └─ spec-runner
            ├─ inspector-super-admin ─┐
            ├─ inspector-admin ───────┤
            ├─ inspector-enterprise ──┤
            ├─ inspector-viewer ──────┤── triage
            ├─ inspector-conductor ───┤      │
            └─ break-analyzer ────────┘      │
                                             └─ teardown
```

Each troop checks deps automatically. Trying to claim a troop whose dep isn't `done` returns "Blocked by: X" and aborts.

## Concurrency safety

- Each troop atomically claims its slot in `.audit-state/current/status.json`.
- Same troop in 2 chats simultaneously → second aborts with "Already claimed".
- Inside `/audit-analyze`, the 6 subagents run in parallel (single message, multiple Agent calls — Anthropic parallel pattern).

## Shared state

```
.audit-state/
├── current/          # gitignored — work in progress
│   ├── runId
│   ├── status.json
│   ├── missions/<troop>.md
│   ├── findings-raw/<role>.md
│   ├── findings-previous.md
│   └── log.jsonl
└── history/<runId>/  # committed — archive per run
    ├── findings.md
    └── manifest.json
```

## Self-healing commands

After `/audit-analyze` writes AUDIT_FINDINGS.md, fix individual findings:

```
Chat A:  /troop-fix-applier P0-13   # apply patch (sandboxed, no commit)
Chat B:  /troop-fix-verifier P0-13  # re-run specs, suggest revert on regression
```

If Playwright tests start failing because the UI changed (not because of a bug):

```
/troop-healer
```

## Sanity gates — auto-pause for human approval

Each phase + granular troop pauses for confirmation before:

1. Editing `convex/schema.ts`, `.env.local`, `.mcp.json`, `CLAUDE.md`, `package.json`
2. Patch touching >5 files
3. Any `git commit`, `git push`, `git reset --hard`
4. Deleting tests or `convex/e2e.ts`
5. Modifying server-side gates (`requireAdminWrite`, `requireOrgAccess`)
6. Test pass rate would drop >5%

## Cleanup guarantee

`/audit-cleanup` (or `/troop-teardown` directly) is **mandatory**. Defense in depth:

1. `convex/e2e.ts` gated by `ALLOW_E2E=1` env + tag prefix `[E2E-` check
2. Teardown verifies `npx convex data organizaciones` shows no `[E2E` remaining
3. Cookies cleared (`tests/auth/*.cookies.json`)

If a run crashes mid-cycle, recover with:

```bash
npx convex run e2e:purge "{\"runId\":\"<runId>\"}"
```

## Scheduling

```
/troop-schedule "0 9 * * 1"      # weekly Mondays 9am
/troop-schedule                  # default (Mondays 9am)
```

Uses `CronCreate` — session-scoped, 7-day expiry. For durable scheduling (survives session restart), use GitHub Actions or Anthropic Routines (Phase B future work).
