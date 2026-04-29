---
name: responsive
description: Audit and fix mobile/tablet responsiveness on RMP pages (React + Fluent Design tokens). Use when user says "hazlo responsive", "responsive en celular", "mobile friendly", "no se ve bien en mobile", "/responsive", or asks to adapt a page/dashboard/component to phones. Mirrors the ConductorDashboard responsive pattern as reference implementation. Enforces mobile-first, dvh units, Fluent tokens, touch targets ≥44px, breakpoint ladder (480/768/1024), no hardcoded heights that trap content, and `:has()` class-based fallbacks.
---

# RMP Responsive Skill

Activate when user requests mobile/tablet adaptations for RMP. Use Fluent Design tokens from `src/styles/index.css` only — NEVER hardcode colors/spacing.

## Reference implementation
`src/pages/ConductorDashboard/ConductorDashboard.css` + `.jsx` — follow its patterns for every new responsive work.

## Breakpoint ladder (RMP standard)
- `≤480px` → phone (1col, stacked, icon-only nav)
- `481–768px` → large phone (1–2col)
- `769–1024px` → tablet (2–3col, collapse sidebar to top-nav)
- `≥1025px` → desktop (full layout)

## Mandatory checklist (run in order)

### 1. Audit hardcoded heights
Grep first:
```
height: \d+px   inside @media (max-width: ...)
min-height: 100vh
```
Replace with `100dvh`, `flex: 1 1 auto`, or relative units. Fixed `height: 720px` in mobile media is a red flag — kill it.

### 2. Viewport units
- Use `100dvh` / `100svh`, NOT `100vh` (mobile browser chrome eats vh).
- Pair: `height: 100vh; height: 100dvh;` for fallback.

### 3. Flex height chains
Child of flex column that must fill requires `min-height: 0` OR it overflows. Check every level of the chain:
```
.dashboard-container { display:flex; flex-direction:column; }
.main-content { flex:1; min-height:0; }
.monitoring-layout { flex:1; min-height:0; }
.map-area { flex:1; min-height:0; }
```

### 4. `:has()` fallback
Never rely on `:has()` alone for load-bearing layout. Add class fallback:
```jsx
<div className={`dashboard-container ${activeTab === 'dashboard' ? 'monitoring-active' : ''}`}>
```
Then CSS mirrors both `.dashboard-container:has(.monitoring-layout)` AND `.dashboard-container.monitoring-active`.

### 5. Touch targets
Buttons, logout, FAB, tabs: ≥44x44px on phone. Icon-only buttons need `min-width: 44px; min-height: 44px`.

### 6. Grid collapse
| Breakpoint | Grid |
|-----------|------|
| ≥1025px | Original (3-4 col) |
| 769–1024px | 2-3 col |
| 481–768px | 1-2 col |
| ≤480px | 1 col |

### 7. Top-nav pattern (mirror conductor)
- Hide sidebar on `≤1024px`
- Horizontal scrollable tabs in header
- Icon-only + active label on `≤768px`:
```css
@media (max-width: 768px) {
  .top-nav__tab span:not(:empty) { display: none; }
  .top-nav__tab.active span:not(:empty) { display: inline; }
}
```

### 8. Bottom-sheet for secondary content
Activities, alerts, details → bottom sheet on mobile, NOT scroll-below-map. Use `position: absolute; bottom: 0` with collapsed (~56px) / expanded (~60dvh) states.

### 9. Tables
```css
@media (max-width: 768px) {
  table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
}
```
Never force tables to stacked card rows — breaks admin muscle memory.

### 10. Modals
≤480px: near-fullscreen, `max-height: 100dvh`, `border-radius: 0` on edges, stack buttons column-reverse, min-height 44px.

### 11. Root horizontal scroll
Always add on root at mobile:
```css
@media (max-width: 768px) {
  .dashboard-container { overflow-x: hidden; }
}
```

## Fluent tokens reference (NEVER hardcode)
```
--space-4, --space-8, --space-12, --space-16, --space-20, --space-24
--radius-sm (2px), --radius-base (4px), --radius-md (6px), --radius-lg (8px), --radius-full
--shadow-xs, --shadow-sm, --shadow-md, --shadow-lg
--color-primary, --color-surface, --color-background, --color-border, --color-text, --color-text-secondary
--color-success, --color-error, --color-warning, --color-info (+ `-light` variants)
--font-size-xs/sm/base/md/lg/xl
--font-weight-regular/medium/semibold
--duration-fast, --ease-out
```

## Anti-patterns — REJECT on sight
- `height: 100vh` on mobile viewport (use dvh)
- Hardcoded `height: 720px` (or any px) inside `@media (max-width: ...)`
- `min-height` on flex children without `min-height: 0`
- Relying on `:has()` without class fallback for critical layout
- Hardcoded colors (`#fff`, `rgba(0,0,0,.5)`) — use tokens
- `box-shadow: 0 10px 40px` dramatic — Fluent uses subtle `--shadow-xs/sm`
- `border-radius: 12px+` — Fluent is flat, 2-4-6-8
- `font-size: 28px+` headers — Fluent is dense
- Row heights >56px in tables
- New component without its own `.css` file

## Workflow when user invokes

1. **Ask breakpoint scope** if unclear ("phone only? tablet too?")
2. **Audit:** read target `.css` + `.jsx`, grep for `@media`, hardcoded heights, `:has()`
3. **Report root cause** in 1-2 sentences before editing
4. **Edit mobile-first:** add/fix `≤480px` → `≤768px` → `≤1024px`
5. **Verify:** no horizontal scroll, no hardcoded px heights in media, flex chains have `min-height: 0`
6. **Report:** files touched with line numbers, breakpoints affected, tokens used

## Output format
```
ROOT CAUSE: [1 sentence — which rule trapped layout]
BREAKPOINT: [≤480px / ≤768px / ≤1024px]
FIX: [file:line — what changed]
VERIFIED: [mapa llena viewport / sin gap / sin scroll-x]
```

## Escalation
If fix doesn't hold after 2 iterations → inspect library-internal wrappers (`.maplibregl-map`, `.leaflet-container`, `.maplibre-component-wrapper`) for fixed heights, inline styles, or `min-height: 400px` that bypass outer flex. Override with `!important` scoped to the mobile/monitoring context only.
