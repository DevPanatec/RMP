---
name: audit-run
description: "Phase 1/3 — Initialize a new audit run and execute Playwright suite. Runs overseer + bootstrapper + spec-runner sequentially in this chat. ~5 min runtime. Creates 1 org + 5 users in Convex/Clerk, runs tests across 9 viewports, captures screenshots. Use in a fresh chat to start an audit cycle."
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
disable-model-invocation: false
---

# Mission

Phase 1 of the audit cycle. Drives 3 internal sub-troops sequentially (they all depend on each other so no parallelism):

1. **overseer** — generate runId, init status, write mission docs
2. **bootstrapper** — create E2E data in Convex + Clerk
3. **spec-runner** — run Playwright across all 9 viewports

Each step writes to `.audit-state/current/`. If any step fails, abort and surface the error — DO NOT continue with a broken state.

## Pre-flight

!`node scripts/audit-helpers/status-board.cjs 2>&1 || echo "(no run)"`

## Steps

### 1. Init overseer

If a run exists with troops in `failed` or `in_progress` state, ABORT and tell the user to `/audit-cleanup` first.

If a run exists fully complete (all `done`), warn the user — overwriting their findings — and confirm before proceeding.

If clean: generate runId + init.

```bash
RUN_ID=$(node scripts/audit-helpers/runId-gen.cjs)
mkdir -p .audit-state/current
echo "$RUN_ID" > .audit-state/current/runId
node scripts/audit-helpers/state-write.cjs init "$RUN_ID"
```

Snapshot previous `AUDIT_FINDINGS.md` for triage diff:
```bash
[ -f AUDIT_FINDINGS.md ] && cp AUDIT_FINDINGS.md .audit-state/current/findings-previous.md
```

### 2. Bootstrapper

Verify `ALLOW_E2E=1` is set on Convex (`npx convex env get ALLOW_E2E`). If not, halt and instruct user.

Claim slot:
```bash
node scripts/audit-helpers/state-write.cjs claim bootstrapper
```

Bootstrap:
```bash
RUN_ID=$(cat .audit-state/current/runId)
npx convex run e2e:bootstrap "{\"runId\":\"$RUN_ID\"}" > .e2e/bootstrap.json
```

Note: on Windows shell, JSON escaping needs PowerShell-style or backslash escape. Use `node` to write the JSON if shell breaks.

Auth setup:
```bash
npx playwright test --project=setup
```

Mark done:
```bash
node scripts/audit-helpers/state-write.cjs done bootstrapper
```

### 3. Spec-runner

Claim slot:
```bash
node scripts/audit-helpers/state-write.cjs claim spec-runner
```

Clean previous screenshots:
```bash
rm -rf audit/headed audit/headless audit/desktop audit/laptop audit/iphone-se audit/iphone-14 audit/pixel audit/ipad-mini audit/ipad-pro audit/break
```

Run all 9 audit projects in parallel:
```bash
npx playwright test --project=audit-headless --project=audit-headed --project=audit-desktop --project=audit-laptop --project=audit-iphone-se --project=audit-iphone-14 --project=audit-pixel --project=audit-ipad-mini --project=audit-ipad-pro 2>&1 | tail -60
```

Some tests will fail on small viewports — that IS the finding. Capture totals from output (e.g. "29 passed, 7 failed").

Write basic spec-results.json:
```bash
node -e "require('fs').writeFileSync('.audit-state/current/spec-results.json', JSON.stringify({ ran_at: new Date().toISOString(), see_logs: 'playwright-report/' }, null, 2))"
```

Mark done:
```bash
node scripts/audit-helpers/state-write.cjs done spec-runner
```

### 4. Report

Print to user:
- runId
- Test counts (pass/fail)
- Screenshot directory: `audit/`
- Next step: **"Open a new chat and run `/audit-analyze`"**

## Gates (pause for human)

- Overwriting an existing complete run.
- Modifying `convex/e2e.ts`, `.env.local`, `.mcp.json`, `CLAUDE.md`.
- Any Convex env mutation outside `ALLOW_E2E=1` check.

## On failure

- Bootstrapper fail: `node scripts/audit-helpers/state-write.cjs failed bootstrapper "<msg>"`. Tell user to fix env then retry.
- Spec-runner fail: not necessarily a code bug — some viewport tests are EXPECTED to fail. Only halt if setup project itself fails (auth broke).
