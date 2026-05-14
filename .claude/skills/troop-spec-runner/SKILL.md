---
name: troop-spec-runner
description: Run the full Playwright audit suite (crawl + deep + break + a11y + perf + visual) across all 9 viewports for the current run. Captures screenshots, console errors, network failures. Produces audit/<viewport>/<role>/*.png + spec-results.json. ~3-5 min runtime. Must run after bootstrapper.
allowed-tools: Bash, Read, Write
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/spec-runner.md 2>/dev/null || echo "(no mission)"`

## Current run

!`cat .audit-state/current/runId 2>/dev/null`

## Steps

1. **Claim slot**: `node scripts/audit-helpers/state-write.cjs claim spec-runner`.
2. **Pre-check**: confirm `.e2e/bootstrap.json` exists (bootstrapper ran) and `tests/auth/*.cookies.json` exist (auth setup ran).
3. **Clean previous screenshots**: `rm -rf audit/headed audit/headless audit/desktop audit/laptop audit/iphone-se audit/iphone-14 audit/pixel audit/ipad-mini audit/ipad-pro audit/break` (keep `audit/history/`).
4. **Run audit projects in parallel**:
   ```
   npx playwright test --project=audit-headless --project=audit-headed --project=audit-desktop --project=audit-laptop --project=audit-iphone-se --project=audit-iphone-14 --project=audit-pixel --project=audit-ipad-mini --project=audit-ipad-pro
   ```
   Some tests will fail on small viewports — that IS the finding. Capture pass/fail counts.
5. **Write spec-results.json** to `.audit-state/current/spec-results.json`:
   - viewports run, pass/fail per project, list of failed test names with file paths to error-context.md.
6. **Mark done**: `node scripts/audit-helpers/state-write.cjs done spec-runner`.
7. **Report**: total tests, pass/fail counts, runtime, suggest "/troop-inspector-* and /troop-break-analyzer in parallel chats now".

## On failure

- If `webServer` fails to start: dev server probably already on port 8000; that's fine, Playwright reuses it.
- If Convex deployment unreachable: bootstrap was broken; suggest `/troop-bootstrapper` re-run.
- If Clerk login fails during setup: cookies stale; `rm tests/auth/*.cookies.json` and retry.
- Mark failed: `state-write.cjs failed spec-runner "<msg>"`.

## Gates

- Do NOT modify `playwright.config.ts`, `tests/audit/*.spec.ts`, or `tests/auth/auth.setup.ts` while this runs.
