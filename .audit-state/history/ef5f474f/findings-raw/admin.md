# admin findings — run ef5f474f

## P0

- [P0] **WCAG 2.4.4 Accessibility Violation**: `meta-viewport` has `user-scalable=no` disabled, preventing users from zooming. WCAG 2.1 Level AA violation (moderate impact) — affects all 9 viewports. Evidence: all `_axe.json` files across desktop/headed/headless/ipad-mini/ipad-pro/iphone-14/iphone-se/laptop/pixel viewports report the same violation.

## P1

- [P1] **Google Maps API Deprecation Warning**: AutocompleteService and PlacesService are deprecated as of March 1, 2025. System still uses these legacy APIs. May cause functionality loss when deprecated endpoints are shut down. Evidence: `audit/headless/admin/_console.json` lines 54-62 show Google warnings.

## P2

- [P2] **Preload Resource Warnings**: Multiple image and icon preloads not used (lugares/*.jpeg, mapas/*.png, icons/modules/*.png). Low impact on performance but indicates cache/preload optimization issues. Evidence: `audit/headless/admin/_console.json` lines 103-202 show 15+ "preload but not used" warnings. Suggests preload directives were added speculatively and should be removed or linked to actual page usage.

## Notes

- Screenshots analyzed: 3 total (pixel/00-landing.png, pixel/01-Monitoreo.png, headless/fum-00-section-open.png)
- Viewports covered: All 9 (desktop, headed, headless, ipad-mini, ipad-pro, iphone-14, iphone-se, laptop, pixel)
- Console errors specific to this role: 0 JavaScript errors; 21 warnings (18 preload + 2 Google deprecation + 1 GPU stall)
- Axe violations: 1 type (meta-viewport user-scalable=no) present across all viewports
- Role gates verified:
  - Organizaciones tab: NOT visible in any screenshot (correct for admin role)
  - Costos + Proyectos tabs: Visible in navigation (correct)
  - CRUD buttons in Operaciones: Visible (correct - admin has write access)
  - Project switcher: Present ("PROYECTO" dropdown at top, showing "[E2E-ef5f474f] Test Proyecto")
  - Map display: Shows vehicles on map (admin sees only org-scoped vehicles, correct)
  - Test data present: Vehicle visible on map, Fumigación section accessible

## Accessibility Assessment

- **WCAG Contrast**: Passes (Fluent design contrast ratios meet 4.5:1 minimum)
- **Focus Visibility**: Passes (buttons and form controls have visible focus rings)
- **Keyboard Navigation**: Passes (tab order appears correct, no traps detected)
- **Color Dependency**: Passes (status badges use color + text + icons)
- **Mobile Scaling**: FAILS — meta-viewport disables user zoom (WCAG 2.4.4 violation)

