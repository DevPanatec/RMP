# super_admin findings — run 20260518

## P0
- None identified. Role gates functioning: Org switcher visible, Organizaciones tab accessible, all 10 tabs unlocked (clicked + visible flags confirmed in _tabs.json across headless/headed/desktop/laptop).

## P1
- Calendar KPIs header (Calendario tab) uses dark navy background with white text at viewport laptop/desktop — Fluent design permits dark modes, but typography consistency should be verified across mobile — `audit/laptop/super_admin/03-Calendario.png` shows no accessibility issues.
- Operaciones tab subtitle text color (gray) on light background meets >3:1 contrast. Design compliant.

## P2
- Mobile (pixel 375px, iphone-se): Org switcher dropdowns + tab nav icons render correctly with no horizontal scroll; touch targets appear >44px. Sidebar Activity/Alerts badges visible in bottom section as expected (commit 890bed5).
- Operaciones Personal section: "Crear Perfil" button uses bright blue (Fluent accent). Consistent.
- Costos tab: Card headers + KPI badges render as expected, no off-scale sizing.

## Notes
- Screenshots analyzed: 24 (across 9 viewports: headless, headed, desktop, laptop, iphone-se, iphone-14, pixel, ipad-mini, ipad-pro)
- Viewports covered: mobile (375-412px), tablet (768-834px), desktop (1280+px)
- Console errors specific to this role: 0 (warnings only: preload/CSS+Maps APIs—standard)
- All tabs verified clickable + visible: Monitoreo, Operaciones, Calendario, Mantenimiento, Riesgos, Inventario, Costos, Proyectos, Organizaciones, Reportes
- Org switcher functional with dropdown (Todas las organizaciones) + CRUD actions present in Organizaciones table (edit/delete icons per row + "Nueva organización" button)
- Map integration (GPS playback visible in landing page)
- No candado (lock) icons observed—all tabs accessible per spec
