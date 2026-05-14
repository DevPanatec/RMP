---
name: troops
description: Show live status board of the current audit run. Lists all troops, their state (pending/in_progress/done/failed), and suggests the next troop to run. Use anytime to check progress without claiming any troop.
allowed-tools: Bash(node:*)
disable-model-invocation: false
---

# Status board

!`node scripts/audit-helpers/status-board.cjs`

## What this skill does

Read-only view of `.audit-state/current/status.json`. Does NOT claim any troop.

If no run is in progress: suggests `/troop-overseer` to start.
Otherwise: shows the table above + next suggested troop.

See `.claude/TROOPS.md` for the full troop catalog and dependencies.
