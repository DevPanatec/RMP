---
name: troop-inspector-admin
description: Visually analyze admin role screenshots across viewports. Writes findings-raw/admin.md. Focus checks - Organizaciones tab AUSENTE (correct), Costos + Proyectos visible, CRUD buttons present in Operaciones (admin can write). Must run after spec-runner.
allowed-tools: Read, Write, Bash, Glob, Grep
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/inspector-admin.md 2>/dev/null || echo "(no mission)"`

## Audit rubric

!`cat .claude/skills/_audit-rubric.md`

## Steps

1. **Claim**: `node scripts/audit-helpers/state-write.cjs claim inspector-admin`.
2. **Glob screenshots**: `audit/*/admin/*.png` across all viewports.
3. **Read each PNG + JSON** (console, tabs).
4. **Apply rubric**, admin-specific:
   - Organizaciones tab AUSENTE (correct role gate)
   - Costos + Proyectos visible
   - CRUD buttons present in Operaciones (admin should have write)
   - Map shows only own org's vehicles (no cross-org leak)
   - Test vehicle E2E-<runId> visible in Flota
   - Test route [E2E-<runId>] visible in Servicios
5. **Write** `.audit-state/current/findings-raw/admin.md`.
6. **Mark done**: `node scripts/audit-helpers/state-write.cjs done inspector-admin`.
7. Report findings count.

## Gates

- Don't write to AUDIT_FINDINGS.md.
- Don't modify code.
