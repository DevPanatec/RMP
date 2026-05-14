---
name: troop-overseer
description: Initialize a new audit run. Generates a runId, writes mission docs for every other troop, creates the shared status.json, and prints next steps. Use this FIRST in any new audit cycle. Replaces the previous run if one was abandoned.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
disable-model-invocation: false
---

# Mission

Boot a fresh audit run for the RMP project. Other troops read your mission docs to know what to do.

## Steps

1. **Check env preconditions**:
   - `ALLOW_E2E` must be set on Convex deployment (`npx convex env get ALLOW_E2E`). If missing, instruct the user to run `npx convex env set ALLOW_E2E 1` and STOP.
   - `npx playwright --version` must return ≥1.56 (already installed in this project).

2. **Generate runId**: `node scripts/audit-helpers/runId-gen.cjs > .audit-state/current/runId` (create dir if missing).

3. **Initialize status.json**: `node scripts/audit-helpers/state-write.cjs init $(cat .audit-state/current/runId)`. This sets overseer=done and all other troops=pending.

4. **Write mission docs** to `.audit-state/current/missions/`:
   - One markdown file per troop (`bootstrapper.md`, `spec-runner.md`, `inspector-super-admin.md`, etc).
   - Each mission doc contains: the runId, expected inputs, expected outputs, success criteria, sanity gates. Keep each under ~30 lines — concrete, no padding.
   - Use the templates in `.claude/TROOPS.md` and the bullet-style structure below.

5. **Snapshot current AUDIT_FINDINGS.md** to `.audit-state/current/findings-previous.md` (if exists). Triage uses it for diff.

6. **Output to user**: print runId + next-step instructions ("In a new chat, run `/troop-bootstrapper`. Use `/troops` anywhere to check status.").

## Mission doc template

```markdown
# Mission: <troop-name>

Run: <runId>

## Inputs
- ...

## Outputs
- ...

## Success criteria
- ...

## Sanity gates (PAUSE for human if any apply)
- ...

## On failure
- mark state=failed via `state-write.cjs failed <troop> "<msg>"`
- log root cause to `.audit-state/current/log.jsonl`
```

## Gates

PAUSE and ask the user before:
- Overwriting an existing `.audit-state/current/runId` that has incomplete troops (might be abandoned vs in-progress).
- Modifying `convex/e2e.ts` (the gated module).
- Touching `.env.local`, `.mcp.json`, `CLAUDE.md`, `package.json`.

## On failure

If env check fails: print exact recovery commands. Don't `state-write init`.
If state-write fails: report and stop. Don't write mission docs over a corrupt state.
