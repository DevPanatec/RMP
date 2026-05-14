---
name: troop-inspector-conductor
description: Visually analyze conductor role screenshots. conductor uses separate ConductorDashboard (no admin top-nav) - sees ONLY assigned vehicle, Mi Ruta/Mis Reportes tabs. Mobile-first PWA. Prioritize mobile viewport analysis (iPhone SE, iPhone 14, Pixel 7). Writes findings-raw/conductor.md. Must run after spec-runner.
allowed-tools: Read, Write, Bash, Glob, Grep
disable-model-invocation: false
---

# Mission

!`cat .audit-state/current/missions/inspector-conductor.md 2>/dev/null || echo "(no mission)"`

## Audit rubric

!`cat .claude/skills/_audit-rubric.md`

## Steps

1. **Claim**: `node scripts/audit-helpers/state-write.cjs claim inspector-conductor`.
2. **Glob screenshots**: `audit/*/conductor/*.png`. PRIORITIZE mobile viewports (iphone-se, iphone-14, pixel) over desktop — conductor is PWA mobile-first.
3. **Read each PNG + JSON** including `_route_visibility.json` (probes for assigned vehicle/route).
4. **Apply rubric**, conductor-specific:
   - Logo FMP should NOT dominate viewport (current bug: gigante in all viewports — P0).
   - Top-nav admin should NOT be present.
   - Tabs "Mi Ruta" / "Mis Reportes" visible.
   - Assigned vehicle `E2E-<runId>` should be visible.
   - Assigned route `[E2E-<runId>] Ruta Test` with 3 paradas visible.
   - "Sin Asignación para Hoy" copy when `dias_semana` empty (known P0 — bootstrap doesn't set days).
   - Touch targets ≥44px on mobile.
   - PWA: service worker disabled in dev (expected log).
5. **Write** `.audit-state/current/findings-raw/conductor.md`.
6. **Mark done**: `node scripts/audit-helpers/state-write.cjs done inspector-conductor`.
7. Report findings count.

## Gates

- Don't write to AUDIT_FINDINGS.md.
- conductor P0s are KNOWN — mark PERSISTING if same.
