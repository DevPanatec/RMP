# conductor findings — run ef5f474f

## P0

- [P0] Admin top-nav visible on Laptop and Desktop (ConductorDashboard should have NO admin top-nav) — \udit/laptop/conductor/_state.json\ line 2 hasTopNav=true, \udit/desktop/conductor/_state.json\ line 2 hasTopNav=true
- [P0] Route assignment COMPLETELY MISSING across all 9 viewports — No "Ruta" section visible, no parada list, no "Iniciar Ruta" button. All viewports show empty \uta-section: false\, \parada-section: false\, \start-button: false\ in _state.json and _route_visibility.json. Role gate broken: conductor cannot see assigned route.
- [P0] Test route "[E2E-ef5f474f] Ruta Test" not mentioned on any viewport — \_route_visibility.json\ shows \mentionsRutaTest: false\ across all viewports (iphone-se, iphone-14, pixel, ipad-mini, ipad-pro, laptop, desktop)

## P1

- [P1] Assigned vehicle "E2E-ESF474F" displayed only as bottom sheet title "Ruta Completada" on mobile, not as prominent vehicle card — \udit/iphone-se/conductor/00-landing.png\ shows only map + sheet; actual vehicle assignment should be top-level element
- [P1] Mobile tab navigation ("Mi Ruta" / "Mis Reportes") not visible until scroll in headless view — \udit/headless/conductor/02-mi-ruta.png\ shows sidebar but landing appears map-only initially
- [P1] Fluent typography issue: "Ruta Completada" heading on mobile uses inconsistent size/weight vs. expected Fluent hierarchy — should be smaller, less prominent per enterprise standards

## P2

- [P2] Empty state messaging absent: When no paradas visible, should show "Sin Asignación para Hoy" or similar state — currently shows only map + route status sheet with no explanation text
- [P2] Mobile logo sizing acceptable (not dominating viewport) but could be slightly smaller on Pixel/iPhone-14 to reduce header footprint

## Notes

- Screenshots analyzed: 9 viewports (iphone-se, iphone-14, pixel, ipad-mini, ipad-pro, headless, headed, laptop, desktop)
- Viewports covered: iphone-se (375px), iphone-14 (390px), pixel (412px), ipad-mini (768px), ipad-pro (1024px), laptop (1440px), desktop (1920px)
- Console errors specific to this role: 0 critical; expected dev warnings (Clerk dev keys, Google Maps async, preloaded resources)
- **Route visibility probes FAILING across 100% of viewports** — indicates server-side filter or context issue, not CSS/layout
- **Top-nav gate issue**: spec shows conductor should ONLY see ConductorDashboard (separate component), but appears AdminDashboard nav leaking through on desktop/laptop sizes
