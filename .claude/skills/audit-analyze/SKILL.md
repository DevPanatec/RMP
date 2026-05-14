---
name: audit-analyze
description: "Phase 2/3 — Analyze screenshots in parallel, then triage findings into AUDIT_FINDINGS.md. Spawns 6 subagents simultaneously (5 role inspectors + break-analyzer), waits for all, then merges into canonical findings doc with NEW/PERSISTING/RESOLVED diff. ~3-5 min. Use AFTER /audit-run."
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
disable-model-invocation: false
---

# Mission

Phase 2 of the audit cycle. Drives 7 internal sub-troops:

- **In parallel (6 subagents at once)**:
  - 5 × inspector-<role> (super-admin, admin, enterprise, viewer, conductor)
  - 1 × break-analyzer
- **Sequential after all 6 done**:
  - triage — merge raw findings → AUDIT_FINDINGS.md

## Pre-flight

!`node scripts/audit-helpers/status-board.cjs`

Confirm `spec-runner` is `done` before starting. If not, halt — user needs to run `/audit-run` first.

## Steps

### 1. Verify state

```bash
node scripts/audit-helpers/state-read.cjs troops.spec-runner.state
```

Must equal `"done"`. If not, abort with instruction to run `/audit-run` first.

### 2. Spawn 6 subagents in parallel

Use the Agent tool with `subagent_type=Explore` for each. Send ALL 6 in ONE message (multiple tool calls in single response — Anthropic parallel pattern).

Each subagent prompt should:
- State its target role (e.g. "super-admin") OR "break artifacts"
- Reference the SKILL.md instructions for `troop-inspector-<role>` (read `.claude/skills/troop-inspector-<role>/SKILL.md`)
- Tell it to claim its slot, do the work, write `findings-raw/<role>.md`, mark done
- Return a 5-10 line summary of findings count by severity

Example prompts (paraphrased — use actual full prompts when invoking):

```
[Agent #1] subagent_type=Explore
Prompt: Inspect super_admin role for this audit run. Read .claude/skills/troop-inspector-super-admin/SKILL.md for instructions. Run:
  1. node scripts/audit-helpers/state-write.cjs claim inspector-super-admin
  2. Glob audit/*/super_admin/*.png, Read each PNG visually.
  3. Apply rubric from .claude/skills/_audit-rubric.md.
  4. Write .audit-state/current/findings-raw/super-admin.md.
  5. node scripts/audit-helpers/state-write.cjs done inspector-super-admin
Return summary (count by severity, top 3 findings).
```

Repeat for admin, enterprise, viewer, conductor, and break-analyzer.

**Important**: send all 6 Agent calls in ONE assistant message (parallel execution). Don't wait between.

### 3. Wait for results

All 6 subagents return summaries. If any failed: report which + reason. Do NOT continue to triage with incomplete raw findings.

### 4. Triage (sequential)

Claim:
```bash
node scripts/audit-helpers/state-write.cjs claim triage
```

Do the work inline (NOT a subagent — triage is the canonical AUDIT_FINDINGS.md writer, needs main session control):

1. Read all `.audit-state/current/findings-raw/*.md`
2. Read `.audit-state/current/findings-previous.md` (if exists)
3. Apply diff logic: NEW / PERSISTING / RESOLVED
4. Compose new `AUDIT_FINDINGS.md` with structure per `.claude/skills/troop-triage/SKILL.md`
5. Append entry to `AUDIT_HISTORY.md` (create if missing)
6. Archive snapshot:
   ```bash
   RUN_ID=$(cat .audit-state/current/runId)
   mkdir -p ".audit-state/history/$RUN_ID"
   cp AUDIT_FINDINGS.md ".audit-state/history/$RUN_ID/findings.md"
   ```
7. Mark done:
   ```bash
   node scripts/audit-helpers/state-write.cjs done triage
   ```

### 5. Report

Print to user:
- Total findings: X (Y P0, Z P1, W P2)
- Diff vs previous: A NEW, B RESOLVED, C PERSISTING
- Top 3 P0 to fix next (with their IDs for /troop-fix-applier)
- Next step: **"Open a new chat and run `/audit-cleanup`"**

## Gates (pause for human)

- If any inspector reports CRITICAL (e.g. XSS fired = true, auth bypass detected), halt and alert user before triage.
- If diff shows >5 NEW P0s vs previous: surface clearly, ask user if they want to proceed with triage (might indicate the audit infra itself broke).

## On failure

- If 1-2 inspectors fail: retry those specific ones with their granular `/troop-inspector-<role>` instructions. Triage works with whatever raw findings exist.
- If ≥3 fail: halt, instruct user to investigate (probably stale screenshots).
