# viewer findings — run fc9587ba

## P0
- None

## P1
- None

## P2
- None

## Notes
- Screenshots analyzed: 97 across 9 viewports
- Viewports covered: headless, headed, laptop, desktop, iphone-se, iphone-14, pixel, ipad-mini, ipad-pro
- Console errors specific to this role: 0 (only standard dev warnings: Clerk, Google Maps, preload hints, Vite)
- Locked tabs (Calendario, Mantenimiento, Inventario, Reportes): Properly disabled with lock icons visible in top navigation across all viewports
- Operaciones subtabs (Personal/Flota/Catálogo/Asignaciones): Accessible and read-only, no CRUD buttons present
- Riesgos tab: Accessible with risk reports displayed, no edit/delete functionality
- Monitoreo: Map displays vehicles only, no routes or personnel visible
- No "Agregar Vehículo", "+ Nueva Ruta", edit/pencil, or trash/delete buttons detected in any view
- Top-nav labels: All tab names visible on desktop/laptop viewports (Monitoreo, Operaciones, Calendario, Riesgos, Inventario, Mantenimiento, Reportes)
- Mobile viewports: Tab navigation shows icon-only with lock icons for restricted tabs, consistent with responsive design
- Cross-org leak check: Fumigación/Limpieza counts not visible in Operaciones views
- v7 regression check: PASS — No regressions detected from v7 baseline (0/0/0)

