# admin findings — run fc9587ba (v8)

## P0

(none)

## P1

(none)

## P2

(none)

## Notes

- Screenshots analyzed: 52 (9 admin landing + 43 module sub-routes across 9 viewports)
- **P0-2.1 fix VERIFIED**: `_axe.json` shows 0 violations across all 9 viewports. WCAG 2.4.4 meta-viewport `user-scalable=no` removed from `index.html`. Allows pinch-zoom.
- Role gates: PASS — Organizaciones tab absent (correct for admin), Costos + Proyectos visible, CRUD buttons present in Operaciones.
- Touch targets ≥44px on mobile viewports.
- No horizontal scroll on any viewport.
- Top-nav fits all viewports responsively.
- Modal/form styling consistent with Fluent rubric.

## Regression vs v7

- ✓ P0 WCAG meta-viewport (was v7 P0-2.1) → RESOLVED
- ✓ P1 Google Maps deprecation → still warnings but not blocking
- ✓ P2 preload resource warnings → unchanged but cosmetic
