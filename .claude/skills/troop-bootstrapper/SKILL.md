---
name: troop-bootstrapper
description: Bootstrap E2E test data in Convex + Clerk for the current audit run. Creates 1 org [E2E-runId], 5 users (one per role), 1 vehicle, 1 route with 3 stops, 10 GPS history points. Idempotent per runId. Writes credentials to .e2e/bootstrap.json. Must run before spec-runner.
allowed-tools: Bash, Read, Write
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/bootstrapper.md 2>/dev/null || echo "(no mission doc — run /troop-overseer first)"`

## Current run

!`cat .audit-state/current/runId 2>/dev/null || echo "(no runId — overseer not run)"`

## Steps

1. **Claim slot**: `node scripts/audit-helpers/state-write.cjs claim bootstrapper`. If "Already claimed" or "Blocked by", STOP and report.
2. **Generate creds + bootstrap**: invoke Convex action with the current runId.
   - Read runId: `cat .audit-state/current/runId`
   - Run: `npx convex run e2e:bootstrap "{\"runId\":\"<RUN_ID>\"}"` (escape JSON for Windows shell).
   - Save full output to `.e2e/bootstrap.json` (gitignored).
3. **Verify**: `npx convex data organizaciones` should show `[E2E-<RUN_ID>] Test Org`.
4. **Run auth setup** (logs in each role, saves storageState):
   - `npx playwright test --project=setup` should succeed (5 logins).
5. **Mark done**: `node scripts/audit-helpers/state-write.cjs done bootstrapper`.
6. **Report to user**: print "Bootstrap complete. Next: `/troop-spec-runner` in a new chat."

## On failure

- If Clerk API rejects emails: known issue with `.local` TLD; `e2e.ts` uses `@example.com` already.
- If duplicate user error: previous run wasn't purged. Run `/troop-teardown` for the OLD runId then retry.
- Mark failed: `node scripts/audit-helpers/state-write.cjs failed bootstrapper "<message>"`.

## Gates

- If `bootstrap.json` already exists with a different runId, don't overwrite — ask user to teardown previous first.
