# RMP Audit History

Timeline de audit runs ejecutados. Cada entry = un run completo (audit-run → analyze → cleanup).

---

## 2026-05-18 — run c312dc4a (v5)

- **Specs**: crawl + deep + break (adversarial) × 9 viewports (chromium)
- **Findings**: 22 P0 / 9 P1 / 9 P2 (vs v4: 14 / 22 / 9)
- **Diff vs v4**:
  - 0 NEW critical defects
  - Role-gate findings itemized per-button (was grouped in v4) → P0 count +8 visually, defects identical
  - RESOLVED (apparent): P0-2/P0-9 (GPS safetag JSON.parse), P0-10 (activity dedupe)
  - PERSISTING: enterprise + viewer CRUD/locked tabs, WCAG contrast + focus rings, conductor logo + route visibility, logout localStorage
- **Security**: ✓ clear (no XSS, no auth bypass, no token leak)
- **Top 5 fix priorities**: useCanWrite() hook (18 findings), focus-visible CSS, side-panel-tab contrast, conductor logo responsive, conductor route data-testid
- **Snapshot**: `.audit-state/history/c312dc4a/findings.md`

---

## 2026-05-13 — v4 (snapshot)

- **Findings**: 14 P0 / 22 P1 / 9 P2 / 5 positive
- **New adversarial layer**: break.spec.ts (XSS, race conditions, WCAG, keyboard nav, network sniff)
- **Critical new findings v4**: WCAG contrast fail `.side-panel-tab` (P0-12), focus rings invisible (P0-13), logout localStorage no clear (P0-14)
- **Run IDs purgados**: 53c6b40e, 8d8418f1, 82e50c43, 57b87421

---

## Pre-v4 (legacy)

- v1: 1 viewport, crawl-only
- v2: 3 viewports, deep interaction
- v3: 9 viewports + manual screenshot review
