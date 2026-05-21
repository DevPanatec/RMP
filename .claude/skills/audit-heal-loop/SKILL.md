---
name: audit-heal-loop
description: "Self-healing code audit cycle. Overseer analiza scope, spawnea N auditores Explore en paralelo, worker (Claude) arregla findings P0/P1, re-audita. Loop hasta cero P0, max-cycles, build-fail, o worker-stuck. Persiste state a .audit-state/heal-loop/<runId>/. Útil pa' validar implementaciones complejas vs plan/requirements o cualquier PR grande."
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
disable-model-invocation: false
argument-hint: <scope> | --from-plan <path> | --resume <runId> [--auditors N] [--max-cycles N] [--severity P0,P1] [--no-fix]
---

# Mission

You are the **OVERSEER** of a self-healing code audit cycle. Drive the heal-loop end-to-end.

## Roles in this cycle

- **Overseer** (you, this session): parses args, init state, decomposes scope, spawns auditors, triages, dispatches worker, decides stop
- **Auditor** (Explore subagents, N in parallel): investigate code, write findings P0/P1/P2/P3 with `file:LINE` refs
- **Worker** (you again, serial): applies fixes via Edit/Write, runs build guard

## Pre-flight

Validate flags + parse mode (scope-inline / --from-plan / --resume). Set defaults:
- `--auditors 3` (max 5, min 1)
- `--max-cycles 3` (max 5)
- `--severity P0` (comma list, may include P1/P2)
- `--worker-mode serial` (parallel disabled in v1)
- `--no-fix false` (diagnostic mode)

If `--from-plan <path>`: read the plan file. The plan IS the scope.

If `--resume <runId>`: skip init, read existing `status.json`, jump to cycle N+1 where N=`cycles_completed`.

## Steps

### 1. Init state

```bash
RUN_ID=$(node scripts/audit-helpers/heal-loop-helpers.cjs gen-runid)
echo "$RUN_ID" > /tmp/heal-loop-runid

# Scope: inline text OR plan file path
node scripts/audit-helpers/heal-loop-helpers.cjs init "$RUN_ID" "<scope-text-or-path>"
```

Print to user: `Starting heal-loop run <RUN_ID>. State in .audit-state/heal-loop/<RUN_ID>/`.

### 2. Loop cycles (1..max-cycles)

For each cycle N:

#### 2a. Set state + ensure dir

```bash
node scripts/audit-helpers/heal-loop-helpers.cjs ensure-cycle "$RUN_ID" "$N"
node scripts/audit-helpers/heal-loop-helpers.cjs update "$RUN_ID" "{\"cycle\":$N,\"state\":\"audit\"}"
```

#### 2b. Decompose scope into K auditor focus areas

You (overseer) write K prompts. Default decomposition for K=3:
1. **Backend/data layer**: schemas, mutations, validators, type safety, audit log integrity, race conditions, transactions
2. **Frontend/UI**: component gating, accessibility, design tokens, UX (keyboard, focus, validation), missing components per plan
3. **Integration/cross-cut**: plan-vs-reality diff, tests, docs, migration scripts, env vars, build/deploy concerns

For K=1: single auditor gets full scope. For K=5: split backend into 2 (mutations vs queries+robustness) and frontend into 2 (gating vs UX).

#### 2c. Spawn K Explore agents IN PARALLEL

Send ALL K Agent tool calls in a **single assistant message**. Each prompt should:
- State its focus area
- Reference scope.md path: `.audit-state/heal-loop/<RUN_ID>/scope.md`
- Tell auditor to write findings to `.audit-state/heal-loop/<RUN_ID>/cycle-<N>/audit-<K>.md` using format:

```markdown
# Audit <K> cycle <N> — <focus area>

## P0
- [<ID>] <file:LINE> — <description>. Fix: <one-line>.

## P1
- ...

## P2
- ...

## Stats
- Mutations audited: X
- Files touched: Y
- Findings: P0=a P1=b P2=c
```

- Cap each auditor response at 1500 words
- Require ID format `<file-prefix>-<NN>` (e.g. `cleaning-01`, `drawer-05`)

#### 2d. Wait for all auditors, then triage

You (overseer) merge `cycle-<N>/audit-*.md` into `cycle-<N>/triage.md`:

```markdown
# Triage cycle <N> — <date>

## Stats
- Total findings: T (P0=a P1=b P2=c P3=d)
- New vs cycle <N-1>: +X -Y persisting=Z

## P0
- [<ID>] <description> · <file:LINE> · src: audit-K
- ...

## P1
- ...
```

Then count:

```bash
node scripts/audit-helpers/heal-loop-helpers.cjs count-findings "$RUN_ID" "$N"
# returns: {"P0":N, "P1":N, "P2":N, "P3":N, "total":N}
```

Append to history:

```bash
node scripts/audit-helpers/heal-loop-helpers.cjs update "$RUN_ID" "{\"p0_history\":[...,$P0],\"p1_history\":[...,$P1]}"
```

#### 2e. Stop check

Apply in order:

1. **CLEAN** if P0 == 0 AND (severity excludes P1 OR P1 == 0) → break, generate FINAL_REPORT, `final_state: "clean"`
2. **MAX-CYCLES** if N == max-cycles → break, `final_state: "max-cycles"`
3. **STUCK** if N >= 2 AND P0 count >= prev cycle's P0 count → break, `final_state: "stuck"`. Flag in report.
4. Otherwise: continue to worker phase.

#### 2f. Worker phase (skip if --no-fix)

```bash
node scripts/audit-helpers/heal-loop-helpers.cjs update "$RUN_ID" "{\"state\":\"worker\"}"
```

You (overseer) acting as worker (serial):

1. Snapshot pre-edit state for revert:
   ```bash
   cd <REPO_ROOT> && git diff > /tmp/pre-heal-<RUN_ID>-<N>.patch
   ```
2. For each finding in target severities (default P0 only), open the file at `file:LINE`, apply fix per the finding's "Fix:" hint. Use Edit tool. Log to `cycle-<N>/worker-log.md`:
   ```markdown
   ## <ID> — <file:LINE>
   Before: <quote 1-3 lines>
   After:  <quote 1-3 lines>
   Status: applied | skipped (reason)
   ```
3. After all fixes in batch: run build guard
   ```bash
   cd <REPO_ROOT> && npm run build 2>&1 | tail -20
   ```
4. Build PASS → continue loop.
5. Build FAIL → write `cycle-<N>/build-error.log`. Revert via:
   ```bash
   git apply -R /tmp/pre-heal-<RUN_ID>-<N>.patch
   ```
   Set `final_state: "build-failed"`. Break loop.

### 3. Final report

Generate `.audit-state/heal-loop/<RUN_ID>/FINAL_REPORT.md`:

```markdown
# Heal-Loop Report — <RUN_ID>

**Scope:** <one-line>
**Started:** <iso>  **Finished:** <iso>  **Duration:** <Nm>
**Final state:** <clean|max-cycles|stuck|build-failed>
**Cycles run:** N / max-cycles

## P0 trend
| Cycle | P0 | P1 | P2 |
|---|---|---|---|
| 1 | 28 | 12 | 6 |
| 2 | 0  | 0  | 6 |

## Files modified (cycle 1 + 2)
- convex/cleaning.ts (+12 lines, requireModulo + storage decrement)
- ...

## Findings resolved: N
## Findings deferred: M (out of severity range)
## Next steps
- Suggested commit: `<feat|fix|chore>(<scope>): <one-line>`
- Open issues: <list any [NEEDS-HUMAN] flags>
```

Update status:

```bash
node scripts/audit-helpers/heal-loop-helpers.cjs update "$RUN_ID" "{\"state\":\"done\",\"finished_at\":$(date +%s)000,\"final_state\":\"<X>\",\"cycles_completed\":$N}"
```

Print summary to user with path to FINAL_REPORT.md.

## Sanity gates (PAUSE for human approval)

Pause and ask user before:

- Editing `convex/schema.ts` (any structural change)
- Patches touching >5 files in a single batch
- `git reset --hard`, `git apply -R`, or any revert of user-uncommitted changes
- Disabling/skipping tests (`.skip`, `xit`, etc.)
- Modifying `CLAUDE.md`, `package.json`, `.env.local`, `.mcp.json`
- Worker-stuck detected (same P0 count 2 cycles in row): ask if user wants manual intervention or `--max-cycles +1`
- Build guard fails (before revert): show error, ask if user wants revert or manual fix

## Failure modes

| Symptom | Action |
|---|---|
| Auditor times out / returns garbage | Mark that auditor as failed in `status.json`, continue triage with N-1 sources, flag in report |
| Triage merge ambiguous (auditors disagree on severity) | Use most-severe vote (P0 wins). Flag in triage with `[DISPUTED]` tag |
| Build guard fails | Revert + write build-error.log + halt loop with `final_state: "build-failed"` |
| `npm run build` not available | Halt, instruct user to add a build script |
| Disk full / permission denied on state dir | Halt, surface to user |

## Output to user (final)

```
Heal-loop done · run 2026-05-15-143022-abc123 · 2 cycles · CLEAN
P0: 28 → 0   P1: 12 → 0   Files modified: 14   Build: PASS

Report: .audit-state/heal-loop/2026-05-15-143022-abc123/FINAL_REPORT.md

Suggested commit:
  feat(super-admin): gate all module mutations + storage counter cascades
```

## On resume (--resume <runId>)

1. Verify state dir exists. If not, abort with message.
2. Read `status.json`. If `final_state != null`, ask user if they want to start a new cycle on top (extending) or abort.
3. Set starting cycle = `cycles_completed + 1`.
4. Continue loop from step 2a.
