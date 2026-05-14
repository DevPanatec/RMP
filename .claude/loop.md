Check the state of the audit system and suggest the next action.

## Checks

1. **Current run status**: `node scripts/audit-helpers/state-read.cjs` — print state if a run is in progress.
2. **Pending P0s in AUDIT_FINDINGS.md**: grep for `[P0]` lines marked `NEW` or `PERSISTING`.
3. **Failed troops**: any troop with state `failed` in current run?

## Suggested action priority

If `failed` troop exists:
  → "Troop X failed. Recover via /troop-X or /troop-healer."

Else if run is incomplete (pending troops):
  → Print next suggested troop per the dependency graph in .claude/TROOPS.md.

Else if no run + pending P0s in AUDIT_FINDINGS.md:
  → "Run /troop-fix-applier <top-P0-id> in a new chat to start fixing."

Else if no run + no pending P0s:
  → "All P0s clear. Run /troop-overseer for a fresh audit cycle."

## Output

One paragraph summary. Don't perform any state changes — this is read-only health check.
