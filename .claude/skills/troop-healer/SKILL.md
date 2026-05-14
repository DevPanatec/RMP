---
name: troop-healer
description: Heal broken Playwright tests when UI selectors changed. Uses the existing playwright-test-healer subagent. Reads test-results/*/error-context.md + test-failed-1.png + trace.zip, proposes selector fixes, applies them. Use when /troop-spec-runner reports unexpected failures.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/healer.md 2>/dev/null || echo "(no mission — healer runs ad-hoc)"`

## Steps

1. **Glob failed tests**: `test-results/*/error-context.md`. If empty, nothing to heal — report + exit.
2. **For each failed test**:
   - Read error-context.md (Playwright already explains the failure)
   - Read test-failed-1.png (visual of state at failure)
   - Inspect trace.zip metadata via `npx playwright show-trace --report-only`
3. **Delegate to Playwright Healer subagent** via Agent tool:
   - `subagent_type: playwright-test-healer`
   - Prompt: include test name, error message, screenshot path, current selector
   - Healer proposes fix
4. **Apply healer's fixes** to `tests/audit/*.spec.ts` (Edit tool).
5. **Verify**: re-run only the affected specs.
6. **If still failing**: collect more context, retry once. If still failing: report + abort.
7. **Output** summary: N tests healed, M still failing.

## Gates

- Don't modify spec files unrelated to the failures.
- If healer wants to change a `data-testid` that doesn't exist → propose adding it to the source component (separate fix via /troop-fix-applier).
- Don't auto-commit.

## On failure

- If Playwright Healer subagent unavailable: fall back to manual selector update (use Read on the source component, find new selector, update spec).
