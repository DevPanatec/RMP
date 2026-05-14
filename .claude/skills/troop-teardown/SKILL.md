---
name: troop-teardown
description: Purge all E2E test data for the current run. Deletes 5 Clerk users + Convex org + projects + vehicles + routes + assignments + GPS history. Mandatory after every audit cycle — leaves NOTHING behind. Safe to re-run if partially completed.
allowed-tools: Bash, Read, Write
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/teardown.md 2>/dev/null || echo "(no mission doc)"`

## Current run

!`cat .audit-state/current/runId 2>/dev/null || echo "(no runId)"`

## Steps

1. **Claim slot**: `node scripts/audit-helpers/state-write.cjs claim teardown`. May be blocked by triage — that's OK, force-claim is supported manually if user confirms.
2. **Run purge action**: `npx convex run e2e:purge "{\"runId\":\"<RUN_ID>\"}"`. Capture output.
3. **Verify nothing left**:
   - `npx convex data organizaciones` — should NOT show `[E2E-<RUN_ID>`.
   - `rm -f tests/auth/*.cookies.json` — stale storageState.
4. **Archive run**: copy `.audit-state/current/*` → `.audit-state/history/<runId>/` (mkdir if needed). Triage may have already done this; idempotent.
5. **Clear current**: `rm -rf .audit-state/current/*` (keep dir for next run).
6. **Mark done**: `node scripts/audit-helpers/state-write.cjs done teardown` (note: status.json itself is in current/ which we just cleared — write to history/<runId>/manifest.json instead).
7. **Report to user**: show counts purged (5 Clerk users, N Convex records) + confirm clean.

## On failure

- If Clerk delete returns 404: user was already gone; OK, continue.
- If Convex purge returns error: log + retry once.
- If verification shows leftover `[E2E-<RUN_ID>` records: STOP, print exact records, ask user to purge manually with `npx convex run e2e:purge`.

## Gates

- ALWAYS confirm runId before purging. Output should show exactly what will be deleted BEFORE the action runs.
- If runId doesn't match `[E2E-` tagged data, ABORT — this is defense in depth (convex/e2e.ts also checks but extra layer here).
