# Audit visual rubric (shared by inspectors)

Apply this rubric when analyzing screenshots of a role. Output bullets with severity tag + screenshot path.

## Severity

- **P0** = bloqueante: role gate broken, console error crashing app, auth bypass, layout that breaks navigation, cross-org data leak, accessibility WCAG 2.4.7 fail (focus invisible) or contrast <3:1.
- **P1** = importante: Fluent design violation (gradients, shadows dramáticos, radius >12px, typography >21px headers), overflow indebido, scroll horizontal en viewport ≥768px, badges off-scale, dropdown highlight ugly, modal not centered, GPS playback UX issues.
- **P2** = cosmético: empty state copy poor, loading skeleton missing, alignment off, mobile touch <44px, micro typography.

## Per-viewport priorities

- Mobile (375-412): touch targets ≥44px, no horizontal scroll, top-nav fits or has hamburger, text ≥14px, logo NOT dominating viewport.
- Tablet (768-834): top-nav visible (not collapsed entirely), KPIs scannable.
- Desktop (1280+): all tabs visible with TEXT labels, modal not edge-to-edge, sidebar Activity/Alerts properly rendered.

## Per-role gates

- **super_admin**: should see Org switcher + Organizaciones tab + ALL tabs unlocked. Map shows all orgs vehicles.
- **admin**: NO Organizaciones tab. Costos + Proyectos visible. CRUD buttons visible in Operaciones.
- **enterprise**: per CLAUDE.md should be read-only. Verify NO buttons Crear/Editar/Eliminar/Agregar. Tab Calendario/Mantenimiento/Inventario/Reportes status — currently NOT locked (P0 per audit history).
- **viewer**: only dashboard/operaciones/riesgos accessible. OTHERS locked with candado icon visible. NO CRUD buttons in any view.
- **conductor**: separate ConductorDashboard (no top-nav admin). Sees only assigned vehicle. Tabs "Mi Ruta" / "Mis Reportes". Mobile-first design.

## Output format

Write `findings-raw/<role>.md`:

```markdown
# <role> findings — run <runId>

## P0
- [P0] <description> — `audit/<viewport>/<role>/<screenshot>.png` line/area where visible
- ...

## P1
- ...

## P2
- ...

## Notes
- Screenshots analyzed: N
- Viewports covered: <list>
- Console errors specific to this role: <count> (referenced)
```

Keep each finding to 1-2 lines. Triage will dedupe and merge.
