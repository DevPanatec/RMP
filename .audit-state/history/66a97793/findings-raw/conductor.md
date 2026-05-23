# conductor findings — run 66a97793

## P0

- [P0] **Logo domina >30% viewport on mobile (iphone-se, iphone-14, pixel)** — `audit/iphone-se/conductor/01-landing.png`, `audit/iphone-14/conductor/01-landing.png`, `audit/pixel/conductor/01-landing.png` show massive logo + branding text blocking content. Fixes accessibility + mobile UX critically. PERSISTING from previous audit.
- [P0] **Route assignment visibility broken in DOM probes** — `audit/iphone-14/conductor/_route_visibility.json` shows `mentionsRutaTest=false`, `mentionsParadaCount=0` but route card `[E2E-66a97793] Ruta Test` IS visible in DOM across all viewports. Selector fragility. PERSISTING from previous audit.
- [P0] **Tab buttons (Mi Ruta / Mis Reportes) fail 44px touch target on mobile** — buttons visible in `audit/iphone-se/conductor/01-landing.png` appear <44px height. iPhone SE viewport (375px) compounds issue. Critical for mobile-first PWA.

## P1

- [P1] **Route "Días" field displays "N/A - N/A"** — visible in `audit/iphone-se/conductor/01-landing.png`, `audit/iphone-14/conductor/01-landing.png`. Bootstrap issue: `e2e.ts` doesn't set `dias_semana` array. Confuses conductor about availability.
- [P1] **"Sin Asignación para Hoy" shown when assignment exists** — `audit/iphone-se/conductor/01-landing.png` displays empty state copy even though route card below shows `[E2E-66a97793] Ruta Test`. UI state mismatch when `dias_semana` empty.
- [P1] **ConductorDashboard top-nav admin controls absent (correct behavior)** — verified across all viewports. Separate dashboard enforced (good) but probes miss the route element.

## P2

- [P2] **Tab text visibility slightly compressed on iPhone SE** — `audit/iphone-se/conductor/01-landing.png` shows icon + text tabs but padding marginal on 375px width.
- [P2] **Logo container scaling inconsistent across mobile viewports** — iPhone SE shows larger proportions than iPhone 14 / Pixel. Should use `clamp()` for responsive scaling.
- [P2] **Scroll state captures identical (`scroll-[0-2].png`)** — no vertical scroll movement visible across iphone-se captures, suggesting page fits viewport or scroll tracking issue in test.

## Notes

- Screenshots analyzed: 54 (9 viewports × 6 screenshot types)
- Viewports covered: iphone-se (375px), iphone-14 (390px), pixel (412px), ipad-mini (768px), ipad-pro (1024px), laptop (1280px), desktop (1920px), headed (visible), headless
- Console errors specific to this role: 0 (no JavaScript errors). Warnings: preload false positives (P2-1 from global, not conductor-specific).
- Mobile-first assessment: **DEGRADED** — logo regression blocks >30% viewport, tab targets subminimal. Route visibility probes broken (test infrastructure issue, not runtime).
- Route assignment confirmed server-side filtered (correct) but DOM probe regex fragility prevents verification.
- Service Worker disabled in dev (expected log present in `_console.json`).

