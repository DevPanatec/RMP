# conductor findings — run E2E-c312dc4a

## P0
- [P0] Logo + branding text dominates >30% of mobile viewport (iphone-se, iphone-14, pixel) — `audit/iphone-se/conductor/01-landing.png` header area
- [P0] Route assignment visibility broken: _route_visibility.json shows mentionsRutaTest=false, mentionsParadaCount=0 across all viewports — route "[E2E-c312dc4a] Ruta Test" visible in DOM but probes not matching

## P1
- [P1] Route "Días" field shows "N/A - N/A" instead of assigned days — bootstrap bug, dias_semana not populated — `audit/iphone-se/conductor/01-landing.png` line Días field
- [P1] Tab buttons (Mi Ruta / Mis Reportes) appear at minimum touch target threshold on mobile — may fail 44px requirement on smallest devices

## P2
- [P2] Scroll state identical across all 3 scroll-[0-2].png captures on iphone-se — no content change, suggests scrolling not working or single-screen content
- [P2] Empty state copy "Sin Asignación para Hoy" displays when assignment exists (expected when dias_semana empty) — correct fallback behavior but confusing UX when actual assignment visible below

## Notes
- Screenshots analyzed: 63 PNG files (9 viewports × 7 states)
- Viewports covered: iphone-se, iphone-14, pixel (mobile priority), ipad-mini, ipad-pro, laptop, desktop, headless, headed
- Console errors specific to this role: 0 (no crashes detected)
- Role gates verified: ConductorDashboard renders (no admin top-nav), correct tabs present
