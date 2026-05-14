---
name: troop-triage
description: Merge raw findings from all inspectors + break-analyzer into the canonical AUDIT_FINDINGS.md. Deduplicates vs previous run, marks each finding NEW/RESOLVED/PERSISTING, appends timeline entry to AUDIT_HISTORY.md, archives snapshot to .audit-state/history/runId. Single writer to canonical docs. Must run after all inspectors + break-analyzer.
allowed-tools: Read, Write, Edit, Bash, Glob
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/triage.md 2>/dev/null || echo "(no mission)"`

## Current run

!`cat .audit-state/current/runId`

## Steps

1. **Claim**: `node scripts/audit-helpers/state-write.cjs claim triage`. Will fail if any inspector or break-analyzer is not `done` — that's correct.
2. **Read raw findings**: `.audit-state/current/findings-raw/*.md` (super-admin, admin, enterprise, viewer, conductor, security).
3. **Read previous canonical**: `.audit-state/current/findings-previous.md` (snapshot overseer took at run start).
4. **For each finding** in raw files:
   - Compare against previous findings (semantic match by description + severity, not exact string).
   - Tag as **NEW**, **PERSISTING**, or **RESOLVED** (in previous but not in current).
5. **Compose new AUDIT_FINDINGS.md** with structure:
   - `# RMP Audit Findings — <date>, run <runId>`
   - Executive summary: counts of P0/P1/P2 total, NEW/PERSISTING/RESOLVED
   - Per-role sections with bullets (severity + description + screenshot paths)
   - Cross-cutting findings section (security, a11y, console errors)
   - Positive findings section (things that DON'T break)
   - Future work / suggested fixes
6. **Append to AUDIT_HISTORY.md**: timeline entry with timestamp, runId, counts diff vs previous run.
7. **Archive**: `mkdir -p .audit-state/history/<runId>/`. Copy current AUDIT_FINDINGS.md as `.audit-state/history/<runId>/findings.md`. Write manifest.json with run summary.
8. **Mark done**: `node scripts/audit-helpers/state-write.cjs done triage`.
9. Report: total findings, X NEW, Y RESOLVED, Z PERSISTING. Suggest top 3 P0s to fix next.

## Gates

- You are the **single writer** of AUDIT_FINDINGS.md. Atomic write only (write to .tmp then mv).
- DO NOT modify findings-raw/ files (read-only).
- If finding semantics are ambiguous (could be NEW or PERSISTING), prefer PERSISTING (less alarming).

## On failure

- If `findings-raw/` is empty: inspectors didn't run. Mark failed, instruct user to re-run inspectors.
- If `findings-previous.md` missing: this is the first run. Treat all findings as NEW.
