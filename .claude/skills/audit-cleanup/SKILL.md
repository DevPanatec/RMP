---
name: audit-cleanup
description: "Phase 3/3 — Teardown E2E data. Purges 5 Clerk users + Convex org + projects + vehicles + routes + assignments + GPS history. Verifies NOTHING left behind. Archives run state to .audit-state/history/. ~1 min. MANDATORY after every audit cycle. Use AFTER /audit-analyze."
allowed-tools: Bash, Read, Write
disable-model-invocation: false
---

# Mission

Phase 3 of the audit cycle. Drives 1 internal sub-troop:

- **teardown** — purge E2E (Clerk + Convex) + verify clean + archive run

This is MANDATORY. Without it, test data lingers in dev environments.

## Pre-flight

!`node scripts/audit-helpers/status-board.cjs`

Verify `triage` is `done` (or skip-confirm if user wants to teardown WITHOUT having run analyze — e.g. abandoned run).

## Steps

### 1. Confirm runId

```bash
RUN_ID=$(cat .audit-state/current/runId 2>/dev/null)
echo "About to purge run: $RUN_ID"
```

If runId empty: nothing to teardown. Skip to step 4 (cleanup state dir).

### 2. Claim + purge

```bash
node scripts/audit-helpers/state-write.cjs claim teardown
RUN_ID=$(cat .audit-state/current/runId)
npx convex run e2e:purge "{\"runId\":\"$RUN_ID\"}"
```

(On Windows: if JSON escape fails, use PowerShell — `$jsonArg = '{\"runId\":\"' + $RUN_ID + '\"}'; npx convex run e2e:purge $jsonArg`)

Expected output: counts of deleted records (5 Clerk users, 1 org, 1 project, 1 vehicle, 1 route, 1 assignment, 10 GPS history entries, 5 perfiles).

### 3. Verify nothing left

```bash
npx convex data organizaciones 2>&1 | grep "\[E2E-$RUN_ID" && echo "WARN: leftover records!" || echo "✓ Convex clean"
rm -f tests/auth/*.cookies.json
echo "✓ Cookies cleared"
```

### 4. Archive state

```bash
RUN_ID=$(cat .audit-state/current/runId 2>/dev/null || echo "unknown")
mkdir -p ".audit-state/history/$RUN_ID"
# Snapshot what's still in current (overlaps with triage archive — idempotent)
cp -r .audit-state/current/findings-raw ".audit-state/history/$RUN_ID/" 2>/dev/null || true
cp .audit-state/current/log.jsonl ".audit-state/history/$RUN_ID/log.jsonl" 2>/dev/null || true
node -e "require('fs').writeFileSync('.audit-state/history/$RUN_ID/manifest.json', JSON.stringify({ runId: '$RUN_ID', ended_at: new Date().toISOString(), state: 'cleaned' }, null, 2))"
```

### 5. Clear current

```bash
rm -rf .audit-state/current
mkdir -p .audit-state/current
```

(Re-create empty dir so next overseer init can write into it.)

### 6. Report

Print to user:
- Purged counts (echo Convex output)
- Verification: ✓ Convex clean, ✓ Cookies cleared
- Archive: `.audit-state/history/<runId>/`
- **"Audit cycle complete. To start a fresh one, open a new chat and run `/audit-run`."**

## Gates (pause for human)

- If verification step finds leftover records: STOP, print exact records, ask user to manually purge before clearing state.
- If runId is unknown but `.audit-state/current/` has data: ask user before deleting (might be active work).

## On failure

- Clerk delete 404: user already gone. Continue.
- Convex purge error: log + retry once. If still fails, halt and surface error.
