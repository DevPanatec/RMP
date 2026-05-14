---
name: troop-fix-applier
description: Apply a code patch for a specific finding ID (e.g. P0-13). Reads AUDIT_FINDINGS.md to understand the issue, locates affected files, generates + applies patch to working tree (NO commit). Sandboxed. Use after /troop-triage. Requires finding ID as argument.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
disable-model-invocation: false
argument-hint: <finding-id>
---

# Mission

!`cat .audit-state/current/missions/fix-applier.md 2>/dev/null || echo "(no mission)"`

## Target finding

ID: $ARGUMENTS

## Steps

1. **Validate arg**: if `$ARGUMENTS` is empty, print usage and abort.
2. **Read AUDIT_FINDINGS.md**, locate finding `$ARGUMENTS`. Extract: description, affected files (or infer from screenshot paths), suggested fix.
3. **Sanity-check blast radius**:
   - List files to be edited.
   - If touches `convex/schema.ts`, `.env.local`, `.mcp.json`, `CLAUDE.md`, `package.json`, `convex/e2e.ts` → PAUSE, ask user explicit OK.
   - If touches >5 files → PAUSE, summarize + ask OK.
4. **Generate patch document**: `.audit-state/current/patches/$ARGUMENTS.patch.md`:
   - Description of fix approach
   - Per-file before/after snippets
   - Risk assessment
5. **Apply** via Edit tool (one file at a time, with read-verify-edit pattern).
6. **Output**: `git diff` summary + suggest `/troop-fix-verifier $ARGUMENTS` in another chat to validate.

## Gates

- NEVER `git commit` or `git push`. User's job.
- NEVER `git reset --hard` or `git checkout -- .`. Use `git restore <specific-file>` if reverting.
- If finding ID not in AUDIT_FINDINGS.md → abort, don't guess.
- If fix would change schema/env/config → PAUSE for user confirmation.

## On failure

- If Edit fails: don't try same file twice. Report error + state filed for fix.
- Mark failed via state-write if assigned to a slot (note: fix-applier is run-on-demand, not in troop schedule).
