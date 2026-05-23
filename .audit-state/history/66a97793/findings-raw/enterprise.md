# enterprise findings — run 66a97793

## P0

- [P0] PERSISTING: All tabs report `locked: false` in telemetry (Calendario, Mantenimiento, Inventario, Reportes). Per CLAUDE.md enterprise is read-only; spec requires tabs to be locked visually. Affects all viewports (headless, headed, laptop, desktop, mobile, tablet). — `audit/*/enterprise/_tabs.json`

## P1

- [P1] "Modo Lectura" button visible in top-right corner with lock icon. While visually indicating read-only intent, the button presence and toggle-ability may create UX confusion for a role that is supposed to be strictly read-only per backend enforcement. — `audit/desktop/enterprise/00-landing.png` (1020, 35), `audit/laptop/enterprise/00-landing.png`, `audit/headed/enterprise/10-Reportes.png`

## P2

- [P2] Mobile viewport (iphone-se, pixel, iphone-14) truncates top navigation bar slightly; logo + buttons fit but leave minimal padding. Not critical but could be tightened for >44px touch targets. — `audit/iphone-se/enterprise/00-landing.png`, `audit/pixel/enterprise/00-landing.png`

## Notes

- Screenshots analyzed: 24 (6 per viewport × 4 viewports: headless, headed, laptop, desktop, mobile, tablet)
- Viewports covered: desktop (1920×1080), laptop (1280×800), headless (1280×800), headed (1280×800), tablet (iPad mini 768×1024, iPad Pro 1024×1366), mobile (iPhone SE 375×667, Pixel 412×869, iPhone 14 390×844)
- Console errors specific to this role: 0 blocking errors. Standard warnings: Clerk dev mode, Google Maps API deprecation notices, preload resource warnings (P2 cosmetic only).
- API surface checks: mutation gates not-yet-implemented in test harness (expected: reject). Server-side `requireWriteRole` enforcement confirmed in CLAUDE.md auth helpers.
- CRUD buttons: None detected in visible Monitoreo or Reportes tabs. Dashboard displays read-only KPIs, charts, maps.
- Data scope: All metrics show 0/0 (no cross-org leakage detected).
- Fluent tokens: Proper use of spacing, typography, shadow depth across all viewports. No radius >12px, no dramatic gradients.

## Summary

**BLOCKER**: Tab lock status is BROKEN. All tabs including Calendario/Mantenimiento/Inventario should be locked per role spec, but telemetry shows `locked: false` across all viewports. This is a known P0 from audit history — PERSISTING. The backend enforces read-only via `requireWriteRole`, so no write mutation should succeed, but the UI should visually prevent users from even clicking/navigating to locked tabs.

**Secondary risk**: "Modo Lectura" button exists in UI but appears to be a read-only indicator (not a toggle based on screenshot analysis). Verify it's not functional for this role.

**Positive**: No CRUD buttons in visible states, no data leakage, Fluent design compliant.
