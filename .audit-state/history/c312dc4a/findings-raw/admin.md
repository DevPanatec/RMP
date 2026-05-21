# admin findings — run c312dc4a

## P0

(No P0 findings detected)

## P1

(No P1 findings detected)

## P2

- [P2] Google Maps preload warnings - resource http://localhost:8000/lugares/*.jpeg and /mapas/*.png not used within few seconds; no functional impact but indicates unused preload declarations — `audit/headless/admin/_console.json`

## Notes

- Screenshots analyzed: 13 (landing + 8 tabs + 3 Operaciones subtabs)
- Viewports covered: headless (1280px desktop)
- Console errors specific to this role: 0 (warnings only - Google Maps API v1 deprecation notices, preload resource timing)
- Role gates verified:
  - Organizaciones tab: AUSENTE ✓ (visible=false in _tabs.json)
  - Costos + Proyectos: VISIBLE ✓ (both clickable and rendered)
  - CRUD in Operaciones: PRESENT ✓ ("Agregar Personal", "Crear Perfil", "Agregar Vehiculo", edit/delete icons on resources)
  - Test data: E2E-c312dc4a vehicle + route visible in Flota/Servicios ✓
  - All other tabs (Monitoreo, Calendario, Mantenimiento, Riesgos, Inventario, Reportes): unlocked and accessible ✓

