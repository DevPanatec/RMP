# viewer findings — run auto

## P0
- [P0] CRUD button "+ Agregar Personal" visible in Personal subtab — `audit/headless/viewer/02-Operaciones-personal.png` line 284
- [P0] CRUD button "+ Crear Perfil" visible in Personal subtab — `audit/headless/viewer/02-Operaciones-personal.png` line 284
- [P0] CRUD button "+ Agregar Vehículo" visible in Flota subtab — `audit/headless/viewer/02-Operaciones-flota.png` right panel
- [P0] CRUD button "+ Nueva Ruta" visible in Servicios/Gestión de Rutas section — `audit/headless/viewer/02-Operaciones-servicios.png` line 518
- [P0] Edit (pencil) and delete (trash) icons visible on vehicle card — `audit/headless/viewer/02-Operaciones-flota.png` row action buttons
- [P0] Edit (pencil) and delete (trash) icons visible on route card — `audit/headless/viewer/02-Operaciones-servicios.png` row action buttons
- [P0] iPhone-SE: "+ Agregar Personal" and "+ Crear Perfil" buttons both visible — `audit/iphone-se/viewer/02-Operaciones.png` bottom
- [P0] iPhone-SE: "+ Agregar Vehículo" button visible on mobile — `audit/iphone-se/viewer/02-Operaciones-flota.png`
- [P0] Locked tabs (Calendario, Mantenimiento, Inventario, Reportes) show NO candado lock icon, only grayed icons — `audit/headless/viewer/02-locked-Calendario-hover.png` and related
- [P0] Edit/delete pencil+trash visible for Recolección service routes — `audit/headless/viewer/02-Operaciones-servicios.png` card action buttons

## P1
- [P1] Top-nav shows only icons, no text labels visible (Calendario, Mantenimiento, Riesgos, etc.) — `audit/headless/viewer/03-Calendario-locked.png` icon bar at y=94
- [P1] Locked tabs Calendario/Mantenimiento/Inventario/Reportes lack visual candado indicator — should show lock icon on hover — `audit/headless/viewer/02-locked-Calendario-hover.png`

## P2
- [P2] Mobile layout: "Agregar Personal" and "Crear Perfil" buttons stack vertically taking full width on iPhone-SE — `audit/iphone-se/viewer/02-Operaciones.png`

## Notes
- Screenshots analyzed: 47 (across 9 viewports)
- Viewports covered: headless, headed, iphone-se, iphone-14, pixel, ipad-mini, ipad-pro, laptop, desktop
- Console errors specific to this role: 0
- PERSISTING issues: All 10 P0 findings match previous audit run — viewer role CRUD buttons intentionally visible, no candado lock icons on restricted tabs
