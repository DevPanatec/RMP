# viewer findings — run ef5f474f

## P0

(none — viewer role fully compliant across all 9 viewports)

## P1

(none)

## P2

(none)

## Notes

- Screenshots analyzed: 9 viewports (viewer/*.png)
- **Tab Access Gating**: PASS — viewer restricted to dashboard/operaciones/riesgos (VIEWER_ALLOWED_TABS in AdminDashboard.jsx:260). Blocked tabs (Calendario, Mantenimiento, Inventario, Reportes) show candado Lock icon + disabled state (lines 875-942).
- **CRUD Button Visibility**: PASS — All write operations gated by `userRole === 'admin' || userRole === 'super_admin'`. No "Agregar Vehículo" in FleetManagement (line 10), no edit/delete icons in PersonnelTable, no "Crear Reporte" in RiskComponent (lines 52-53).
- **Read-Only Enforcement**: PASS — "Modo Lectura" badge in app-bar (line 831). Server-side `requireWriteRole` mutation guards active.
- **Viewport Coverage**: All 9 viewports — Desktop/Laptop full tab bar + candado, Tablet responsive intact, Mobile (iPhone SE/14/Pixel) restrictions preserved.
- **Historical P0s**: All RESOLVED — no regressions detected.
