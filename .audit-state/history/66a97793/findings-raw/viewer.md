# viewer findings — run 66a97793

## Summary

Visual inspection of 57 screenshots across 9 viewports (headless, headed, iphone-se, iphone-14, pixel, ipad-mini, ipad-pro, laptop, desktop) for viewer role. Significant improvement from previous run c312dc4a: CRUD buttons no longer visible, candado lock icons now present on restricted tabs in code. However, Operaciones tab is NOT VISIBLE in current run (module gate issue, not role-gate).

## P0

- [P0] **Operaciones tab not visible** — per audit spec, viewer should have access to dashboard/operaciones/riesgos. Currently operaciones requires one of modules (REC|FUM|LIM|MTO|PER) to render. Test org may lack these. `audit/desktop/viewer/_tabs.json`, `audit/headless/viewer/_tabs.json`, all viewports show `"operaciones": {"visible": false, "clicked": false}` — `audit/headless/viewer/01-Monitoreo.png`, `audit/desktop/viewer/00-landing.png`

## P1

- [P1] Top-nav shows only icons, text labels not visible — "Monitoreo", "Reportes" labels not clearly legible in mobile and tablet viewports. `audit/iphone-14/viewer/01-Monitoreo.png`, `audit/pixel/viewer/01-landing.png` — icon-only nav at top
- [P1] Locked tabs (Calendario, Mantenimiento, Inventario, Reportes) lack visible candado lock indicator on hover in screenshots — code has `{isViewer && <Lock ... />}` but not clearly visible in UI. `audit/desktop/viewer/02-locked-Reportes-hover.png`, `audit/laptop/viewer/02-locked-Reportes-hover.png` — minimal visual feedback

## P2

- [P2] Empty state message "Sin actividad registrada" in Monitoreo not localized properly in some contexts — minor copy issue. `audit/headless/viewer/00-landing.png`

## Notes

- Screenshots analyzed: 57 (across 9 viewports: headless, headed, iphone-se, iphone-14, pixel, ipad-mini, ipad-pro, laptop, desktop)
- Viewports covered: 1280px (laptop), 1920px (desktop), 430px (headless/pixel/iphone-14), 390px (iphone-se), 834px (ipad-mini), 1194px (ipad-pro), 1024px (headed)
- Console errors specific to this role: 0 ERROR, warnings only (Vite, Google Maps deprecated, MapLibre missing image, preload warnings)
- Tab state: Monitoreo and Reportes clickable/visible. Operaciones NOT visible (module gate). Calendario/Mantenimiento/Inventario/Riesgos/Costos/Proyectos/Organizaciones not visible.
- CRUD buttons: NO visible CRUD buttons in current run screenshots — significant improvement from c312dc4a (which had 10 P0 CRUD findings). No "+ Agregar", edit/delete icons, "+ Nueva Ruta" observed.
- Candado icon status: Code has `{isViewer && <Lock />}` for locked tabs, but visual prominence unclear in screenshots. Lock icon size: 12px, may be too small for 375px viewport.
- **RESOLVED vs c312dc4a**: All 10 P0 CRUD button findings from previous run appear RESOLVED (not visible in current screenshots, _crud_buttons.json empty). This suggests server-side role enforcement or CRUD component visibility fixed between runs.
- **NEW finding**: Operaciones unavailability (P0) — may be test data issue (modules not configured for E2E-66a97793 org) rather than role-gate bug. Requires verification: does test org have modules configured?
- **REGRESSED from c312dc4a**: Top-nav text labels visibility — previous run noted "only icons, no text labels" as P1. Still present in current run. Label visibility should be tested explicitly in responsive design.

