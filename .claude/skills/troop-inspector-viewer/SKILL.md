---
name: troop-inspector-viewer
description: Visually analyze viewer role screenshots. viewer is most-restricted role - only dashboard/operaciones/riesgos accessible, others LOCKED with candado icon visible. NO CRUD buttons in any view. Writes findings-raw/viewer.md. Must run after spec-runner.
allowed-tools: Read, Write, Bash, Glob, Grep
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/inspector-viewer.md 2>/dev/null || echo "(no mission)"`

## Audit rubric

!`cat .claude/skills/_audit-rubric.md`

## Steps

1. **Claim**: `node scripts/audit-helpers/state-write.cjs claim inspector-viewer`.
2. **Glob screenshots**: `audit/*/viewer/*.png`.
3. **Read each PNG + JSON**.
4. **Apply rubric**, viewer-specific (HIGHLY CRITICAL):
   - Locked tabs (Calendario, Mantenimiento, Inventario, Reportes) → SHOULD have candado icon visible. Click should be disabled.
   - Operaciones subtabs (Personal/Flota/Servicios) → ACCESSIBLE but NO CRUD buttons.
   - Buttons "Agregar Vehículo", "+ Nueva Ruta", pencil, trash, "Crear Perfil" → SHOULD NOT EXIST. If seen, P0.
   - Top-nav text labels → should be visible (current bug: top-nav shows only icons — P1).
   - Map → vehicles only, no routes/personnel/geofences.
   - Cross-org leak Fumigación/Limpieza counts → check same as enterprise.
5. **Write** `.audit-state/current/findings-raw/viewer.md`.
6. **Mark done**: `node scripts/audit-helpers/state-write.cjs done inspector-viewer`.
7. Report findings count.

## Gates

- Don't write to AUDIT_FINDINGS.md.
- viewer P0s are KNOWN — mark PERSISTING if same as previous run; NEW if novel.
