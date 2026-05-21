# enterprise findings — run c312dc4a

## P0

- [P0] PERSISTING: Agregar Vehiculo button visible in Flota tab (should be read-only, no CRUD) — `audit/desktop/enterprise/02-Operaciones-flota.png` top-right button + `audit/laptop/enterprise/02-Operaciones-flota.png`
- [P0] PERSISTING: Agregar Personal button visible in Personal tab (Gestión de Personal, should be read-only) — `audit/desktop/enterprise/02-Operaciones.png` top section, blue "Crear Perfil" + "Agregar Personal" buttons
- [P0] PERSISTING: Nueva Ruta button visible in Servicios/Rutas tab (should be read-only) — `audit/laptop/enterprise/02-Operaciones-servicios.png` top-right "Nueva Ruta" button
- [P0] PERSISTING: Nuevo Item button visible in Inventario tab (should be read-only) — `audit/desktop/enterprise/06-Inventario.png` top-right "+ Nuevo Item" button
- [P0] PERSISTING: Tab "Calendario" UNLOCKED and clickable (CLAUDE.md says enterprise should NOT access, currently navigates freely) — `audit/desktop/enterprise/03-Calendario.png` visible in tab bar
- [P0] PERSISTING: Tab "Mantenimiento" UNLOCKED and clickable (should be restricted) — `audit/desktop/enterprise/04-Mantenimiento.png` shows full access, no lock icon
- [P0] PERSISTING: Tab "Inventario" UNLOCKED and clickable (should be restricted) — `audit/desktop/enterprise/06-Inventario.png` tab visible, full access to inventory management
- [P0] PERSISTING: Tab "Reportes" UNLOCKED and clickable (should be restricted) — `audit/desktop/enterprise/10-Reportes.png` tab visible, full access to reports section

## P1

- [P1] Fluent radius on buttons slight excess (Agregar buttons ~4px OK, but modal buttons dashboard/tareas consistency) — multiple locations
- [P1] Overflow on mobile viewports — `audit/iphone-14/enterprise/01-Monitoreo.png` top nav may compress

## P2

- [P2] Empty state copy for vehicles says "Agrega tu primer vehiculo..." but enterprise cannot add (UX confusion) — `audit/desktop/enterprise/02-Operaciones-flota.png`
- [P2] KPI badges alignment on desktop slightly off scale — Operaciones-personal, Operaciones-flota sections

## Notes

- Screenshots analyzed: 54 (9 viewports × 6 main screens)
- Viewports covered: headless, headed, iphone-se, iphone-14, pixel, ipad-mini, ipad-pro, laptop, desktop
- Console errors specific to enterprise: 0 (no auth/role errors detected in screenshots)
- **CRITICAL**: All 8 P0s are PERSISTING from previous audit runs. The role-gate enforcement via `requireWriteRole` (CLAUDE.md) is NOT being applied to frontend buttons/tabs. This is a blocker: enterprise can invoke mutations that should fail server-side, breaking trust model.
