---
name: troop-fix-verifier
description: Verify a fix applied by /troop-fix-applier. Runs only the specs related to the affected files. If tests fail, reports + suggests git restore (does NOT auto-revert without confirmation). Requires finding ID as argument.
allowed-tools: Read, Bash, Glob
disable-model-invocation: false
argument-hint: <finding-id>
---

# Mission

ID to verify: $ARGUMENTS

## Steps

1. **Validate arg**.
2. **Read patch doc**: `.audit-state/current/patches/$ARGUMENTS.patch.md`. Extract affected files.
3. **Determine specs to run**: map files to test specs.
   - `convex/*.ts` → `tests/audit/api-surface.spec.ts`
   - `src/components/Login/*` → `tests/audit/crawl.spec.ts` (auth)
   - `src/pages/*Dashboard/*` → `tests/audit/crawl.spec.ts` + `tests/audit/deep.spec.ts`
   - CSS-only → `tests/audit/visual.spec.ts` (visual regression)
4. **Run targeted specs only**:
   ```
   npx playwright test <spec-paths> --project=audit-headless
   ```
5. **Report**:
   - Tests passed/failed before fix (compare to last spec-results.json if available)
   - Tests passed/failed after fix
   - Delta (regression? improvement? no change?)
6. **Write** verify report to `.audit-state/current/verify-$ARGUMENTS.md`.
7. **If REGRESSION** (new failures): output suggested commands `git restore <files>` for user (do NOT execute automatically).
8. **If PASS**: suggest user `git diff` + commit with `--author="DevPanatec <DevPanatec@users.noreply.github.com>"`.

## Gates

- NEVER auto-commit, auto-revert, or `git reset --hard`. Only print suggested commands.
- If specs don't exist for the affected file type, run the full `audit-headless` suite as fallback.
