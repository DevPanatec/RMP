---
name: troop-inspector-enterprise
description: Visually analyze enterprise role screenshots. enterprise is supposed to be READ-ONLY per CLAUDE.md but currently sees CRUD buttons + unlocked tabs (known P0). Writes findings-raw/enterprise.md. Must run after spec-runner.
allowed-tools: Read, Write, Bash, Glob, Grep
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/inspector-enterprise.md 2>/dev/null || echo "(no mission)"`

## Audit rubric

!`cat .claude/skills/_audit-rubric.md`

## Steps

1. **Claim**: `node scripts/audit-helpers/state-write.cjs claim inspector-enterprise`.
2. **Glob screenshots**: `audit/*/enterprise/*.png`.
3. **Read each PNG + JSON**.
4. **Apply rubric**, enterprise-specific (HIGHLY CRITICAL — known P0s):
   - Buttons "Agregar", "Crear", "Nueva", "+", "Editar", "Eliminar" → SHOULD NOT EXIST. If seen, P0.
   - Tabs Calendario/Mantenimiento/Inventario/Reportes → SHOULD BE LOCKED per CLAUDE.md. If unlocked, P0.
   - Cross-org data in Servicios counts (Fumigación, Limpieza) → SHOULD be 0/0 if E2E org. If non-zero, P0 leak.
   - UpcomingRoutes widget visible in dashboard (read-only design).
5. **Write** `.audit-state/current/findings-raw/enterprise.md`.
6. **Mark done**: `node scripts/audit-helpers/state-write.cjs done inspector-enterprise`.
7. Report findings count.

## Gates

- Don't write to AUDIT_FINDINGS.md.
- These P0s are KNOWN from previous runs. Mark them PERSISTING if same; NEW if new variation.
