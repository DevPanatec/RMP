# RMP Audit History

Timeline de audit runs ejecutados. Cada entry = un run completo (audit-run → analyze → cleanup).

---

## 2026-05-22 — run 6599a735 (v9) — VERIFICATION + 1 new finding

- **Specs**: 359 pass / 689 skipped / 1184 total. 37.2 min.
- **Findings**: 1 P0 / 0 P1 / 0 P2 (vs v8: 1 / 1 / 0)
- **Headline**: P0-1 v8 (Login button focus) FIXED ✓ verified. Conductor mentionsRutaTest now true. P1 super_admin button color: resolved. NEW P0 discovered: `.top-nav__tab.active` "Monitoreo" contrast 2.54:1 (same emerald token issue as v7 side-panel-tab in a different location). Fix applied this turn: `.top-nav__tab.active color: var(--color-success-dark)` in `AdminDashboard.css:334-343`.
- **Verified resolved from v8**: Login button outline visible (`solid 2px`), all 6 inspector roles 0 P0
- **Need v10**: verify top-nav__tab contrast fix landed
- **Snapshot**: `.audit-state/history/6599a735/findings.md`

---

## 2026-05-22 — run fc9587ba (v8) — VERIFICATION

- **Specs**: same suite × 9 viewports. Playwright: 361 pass / 690 skipped / 1184 total. 37.5 min (vs v7 59 min — faster with stable setup).
- **Findings**: 1 P0 / 1 P1 / 0 P2 (vs v7: 9 / 10 / 7) — **89% P0 reduction, 90% P1, 100% P2**
- **Headline**: Massive cleanup. 8 product fixes + 3 test infra patches landed correctly.
  - 5 real product fixes verified: P0-2.1 meta-viewport, P0-2.3 contrast, P0-3.1 modal escape, P1-2 enterprise tab lock (re-eval), P1-5 Maps deprecation (warning only)
  - 3 test-infra false positives patched: P0-1.1 super_admin Plataforma tab naming, P0-1.2 conductor `.top-nav` shared class, P0-1.3 conductor English class names
  - 1 P0 still pending verification: Login button `:focus-visible` (cascade conflict with global `.btn:focus-visible`, second-pass fix applied in `index.css:661` this run)
- **Per-role status**: super_admin (0/1/0), admin (0/0/0 ✓), enterprise (0/0/0 ✓), viewer (0/0/0 ✓), conductor (0/0/0 ✓ — was CRITICAL in v7), security (1/0/0)
- **Test infra patches** prevent future false positives — selectors now match actual product class names (English + Spanish bilingual).
- **Security**: ✓ XSS blocked, server gates intact, no plaintext credentials, contrast fixed
- **Snapshot**: `.audit-state/history/fc9587ba/findings.md`

---

## 2026-05-21 — run ef5f474f (v7)

- **Specs**: crawl + deep + break (adversarial) × 9 viewports (chromium). Playwright: 370 pass / 596 skipped / 1184 total.
- **Findings**: 9 P0 / 10 P1 / 7 P2 (vs v6: 8 / 9 / 6)
- **Headline**: GPS modal crash RESOLVED ✓. Console clean (0 errors). Viewer perfect (0/0/0). Enterprise EXCELLENT (0 P0). Pero 3 P0 nuevos en conductor (admin nav leak desktop+laptop + route assignment 100% invisible) + 1 P0 WCAG admin meta-viewport user-scalable=no. Setup flaky con Google Places init (fixed via retries=2).
- **Diff vs v6**:
  - **RESOLVED (4)**: GPS playback modal Convex JSON crash, viewer Operaciones tab missing, super_admin tab row wrap, conductor touch targets <44px (not directly flagged)
  - **NEW (6)**: admin WCAG meta-viewport (P0), conductor admin top-nav leak (P0), conductor route assignment missing 100% viewports (P0), dirty modal state leak (P0), enterprise tab lock visual missing (P1 — downgraded from v6 P0), setup Google Places flakiness (P1 infra)
  - **PERSISTING (8)**: super_admin Organizaciones tab missing, focus rings invisible login, side-panel-tab contrast 2.24:1, logout localStorage residue, rapid-click no feedback, conductor route probe regex, mobile tab labels icon-only, conductor logo mobile
- **Security**: ✓ clear (XSS blocked, server-gate viewer enforced, no plaintext credentials, race conditions handled)
- **Per-role**: viewer ✓ PERFECT (0/0/0), enterprise ✓ EXCELLENT (0 P0), admin ⚠ (1 P0 a11y), super_admin ⚠ (1 P0 role gate), conductor ✗ CRITICAL (3 P0), security ✓ (3 P0 a11y/state)
- **Top 5 fix priorities**: P0-1.3 conductor route missing (investigate bootstrap vs product), P0-2.1 admin meta-viewport (1-line fix), P0-2.2 focus rings (5-line global CSS), P0-1.1 super_admin Organizaciones tab, P0-1.2 conductor admin nav isolation
- **Infra change**: `playwright.config.ts` setup project now `retries: 2` (Google Places API flakiness mitigation)
- **Snapshot**: `.audit-state/history/ef5f474f/findings.md`

---

## 2026-05-21 — run 66a97793 (v6)

- **Specs**: crawl + deep + break (adversarial) × 9 viewports (chromium). Playwright: 290 pass / 57 fail / 347 total.
- **Findings**: 8 P0 / 9 P1 / 6 P2 (vs v5: 22 / 9 / 9)
- **Headline**: 14 P0 fixed since v5. `useCanWrite()` pattern propagated to viewer + enterprise CRUD (16 RESOLVED).
- **Diff vs v5**:
  - **RESOLVED (16)**: viewer 10 CRUD + enterprise 4 CRUD P0s, `.side-panel-tab` contrast (not retested), enterprise empty-state CTA
  - **NEW (6)**: super_admin Organizaciones tab missing (P0), GPS modal JSON crash (P0 regressed from v4), viewer Operaciones missing (P0), conductor touch targets escalated to P0, super_admin tab wrap (P1), enterprise "Modo Lectura" UX (P1)
  - **PERSISTING (10)**: enterprise tab lock UI, conductor logo + probes, WCAG focus rings, viewer top-nav labels + candado, conductor Días N/A + empty state, logout localStorage, Clerk metadata
- **Security**: ✓ clear (XSS blocked, no auth bypass, window.convex undefined, direct URL bypass mitigated)
- **Admin role**: 100% clean — 0 findings any severity (reference implementation)
- **Top 5 fix priorities**: GPS Convex JSON crash, enterprise tab lock UI, WCAG focus rings, conductor logo responsive, super_admin Organizaciones render
- **Snapshot**: `.audit-state/history/66a97793/findings.md`

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
