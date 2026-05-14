---
name: troop-schedule
description: Schedule recurring audit runs via CronCreate. Default - weekly Mondays 9am local. Pass cron expression as argument to customize. Session-scoped (7-day expiry per Anthropic spec). For durable scheduling, use GitHub Actions or Routines (Phase B).
allowed-tools: Bash
disable-model-invocation: false
argument-hint: <cron-expression>
---

# Mission

Schedule a recurring `/troop-overseer` to bootstrap a new audit run on a cron.

## Default cron

If `$ARGUMENTS` empty: `0 9 * * 1` (Mondays 9am).
Otherwise: use `$ARGUMENTS` (validate as 5-field cron).

## Steps

1. **Parse arg**. Validate cron expression format. If invalid, print usage and abort.
2. **Invoke CronCreate** tool with:
   - cron: `<expression>`
   - recurring: true
   - prompt: `"/troop-overseer"` (so the scheduled run kicks off a fresh audit cycle)
3. **Print confirmation**: cron job ID + schedule + next fire time.
4. **Warn user**:
   - CronCreate is session-scoped + 7-day expiry per Anthropic spec.
   - Each fired run still requires user to walk through subsequent troops (or `/audit` auto-pilot in one chat).
   - For durable scheduling (survives session restart), set up GitHub Action or Anthropic Routine.

## Gates

- Don't schedule more than one cron job at a time per project. List existing crons first; if one exists, ask user to confirm replacement.

## Example

```
/troop-schedule "0 9 * * 1"   → Mondays 9am
/troop-schedule "0 */4 * * *" → every 4 hours
/troop-schedule               → default (Mondays 9am)
```
