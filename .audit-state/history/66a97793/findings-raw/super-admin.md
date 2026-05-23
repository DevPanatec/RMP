# super_admin findings — run 66a97793

## P0

- [P0] **Organizaciones tab NOT visible across any viewport** — Role gate broken. Per spec, super_admin should have exclusive access to Organizaciones tab. _tabs.json confirms visible: false, clicked: false across headless, headed, laptop, desktop viewports. This is a critical role gate failure. `audit/headless/super_admin/_tabs.json`, `audit/headed/super_admin/_tabs.json`, `audit/laptop/super_admin/_tabs.json`, `audit/desktop/super_admin/_tabs.json` (all show Organizaciones: {visible: false, locked: false, clicked: false})

- [P0] **Convex JSON parse error crashes GPS playback modal on desktop viewport** — "Error: [CONVEX Alsafetag:fetchTodayHistory)] Server Error Uncaught Error: Uncaught SyntaxError: Unexpected end of JSON input at parse [as parse]" shown in modal. This breaks GPS route reproduction feature. `audit/desktop/super_admin/07-gps-modal-state.png`, `audit/laptop/super_admin/07-gps-modal-state.png`

## P1

- [P1] **Tab wrapping on desktop causes secondary row** — Reportes tab view shows "Riesgos | Histórico | Costos" on second row, indicating horizontal scroll or wrap behavior on viewport >= 768px (1280+ desktop). Per Fluent rubric this is indebido overflow. `audit/desktop/super_admin/10-Reportes.png`, `audit/laptop/super_admin/10-Reportes.png`

## P2

- [P2] **Sidebar Activity badges and alerts rendering correctly on mobile** — Activity/Alerts tabs visible with badge count ("Alertas 3") on iPhone-SE, Pixel, iPad-Mini. Minor: badge styling consistent across viewports. `audit/iphone-se/super_admin/02-activity-item-0-hover.png`, `audit/ipad-mini/super_admin/00-landing.png`

## Positive findings

- Org switcher ("Todas las organizaciones" dropdown) is **functional and visible** across all 9 viewports (iPhone-SE 375w, iPhone-14 390w, Pixel 412w, iPad-Mini 768w, iPad-Pro 1024w, Headed 1280w, Laptop 1366w, Desktop 1440w, Headless responsive). This is working correctly.
- All tabs accessible (Monitoreo, Operaciones, Calendario, Reportes, Recursos, Administración) with no lock icons and clicked: true for traversed tabs.
- Top nav layout and Fluent design tokens mostly correct (no colors, radius, shadows violations detected).
- Modal centering and layout on desktop is correct (GPS modal properly styled).

## Notes

- Screenshots analyzed: 87 (9 viewports × ~9-10 screens per role)
- Viewports covered: iPhone-SE (375), iPhone-14 (390), Pixel (412), iPad-Mini (768), iPad-Pro (1024), Headed (1280), Laptop (1366), Desktop (1440), Headless (responsive)
- Console errors specific to this role: 1 critical Convex fetch error (SyntaxError in fetchTodayHistory). Other console messages are warnings (Clerk dev keys, Google Maps deprecation, preload resource warnings) — not blocking.
- Browser issues: Headed and Headless show identical _tabs.json structure, confirming consistent bug across render modes.

## Blocker status

**YES** — Two P0 blockers prevent this role audit from passing:
1. Organizaciones tab missing violates super_admin role gate contract
2. GPS modal Convex error crashes feature (SyntaxError on JSON parse)

Both require code fixes before super_admin can be cleared.
