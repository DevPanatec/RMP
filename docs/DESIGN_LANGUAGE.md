# RMP Design Language — Cronograma Style

Reference for upgrading all RMP UI to match the polished aesthetic of `src/components/Cronograma/`.

**Single source of truth**: `src/components/Cronograma/Cronograma.css` (esp. `:root` tokens at top).

---

## 1. Design Tokens (already global)

These `:root` vars are defined in `Cronograma.css` and available app-wide. **Reuse them — do not re-declare.**

### Domain colors (gradient pairs)
```css
--crono-rec: #0078d4   /* Rutas / blue */
--crono-lim: #107c10   /* Limpieza / green */
--crono-fum: #d97706   /* Fumigación / amber */
--crono-mto: #6264a7   /* Mantenimiento / purple */
```
Plus `--crono-{X}-soft` (12% alpha bg) and `--crono-{X}-glow` (35% alpha for shadows).

When applying to other domains, map semantically:
- **Operations / primary actions** → `--crono-rec` (blue)
- **Success / health** → `--crono-lim` (green)
- **Warning / attention** → `--crono-fum` (amber)
- **Neutral / admin / system** → `--crono-mto` (purple)

### Shadows (multi-layer)
```css
--crono-shadow-1: 0 1px 2px ..., 0 1px 3px ...     /* resting */
--crono-shadow-2: 0 4px 12px ..., 0 2px 4px ...    /* hover, cards */
--crono-shadow-3: 0 10px 30px ..., 0 4px 8px ...   /* modals, popovers */
--crono-shadow-glow-{rec|lim|fum|mto}              /* hover glow per domain */
```

### Easings
```css
--crono-ease-soft:   cubic-bezier(0.32, 0.72, 0, 1)     /* default, in/out */
--crono-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)  /* toggles, scale-in */
```

### Standard transitions
- **Fast** (hover, color): 180-200ms `var(--crono-ease-soft)`
- **Medium** (entrance, slide): 280-340ms
- **Slow** (modal slide-in): 340ms `var(--crono-ease-spring)`

---

## 2. Core Animations (already defined)

Reuse these `@keyframes` (already in Cronograma.css):

| Name | Use case |
|---|---|
| `crono-fade-up` | Container/page entry (400ms ease-soft) |
| `crono-fadein` | Overlay backdrop appears (240ms) |
| `crono-slidein` | Side panel/modal slide-in (340ms spring) |
| `crono-shimmer` | Skeleton loaders (1.4s linear-gradient bg slide) |
| `crono-pulse` | "Live" status dots (1.8s) |
| `crono-sparkle` | Subtle accent icons (2.4s) |
| `crono-cell-in` | Grid item entrance with scale + fade |
| `crono-item-in` | List item stagger (translateX + fade) |

**Stagger pattern** (apply to lists/grids):
```jsx
{items.map((item, i) => (
  <div key={item.id} style={{ animationDelay: `${i * 40}ms` }} className="my-item">
```
```css
.my-item {
  opacity: 0;
  animation: crono-item-in 320ms var(--crono-ease-soft) forwards;
}
```
Cap delay at ~600ms total (use `Math.min(600, i * stepMs)`).

---

## 3. Visual Patterns (copy verbatim)

### Pattern A — KPI/metric card with accent bar
Used in `CronogramaMetrics`. Apply to any "stat" surface.

```css
.my-metric {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-12);
  padding: var(--space-14) var(--space-16);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--crono-shadow-1);
  overflow: hidden;
  transition: transform 200ms var(--crono-ease-soft), box-shadow 200ms var(--crono-ease-soft);
}
.my-metric:hover { transform: translateY(-2px); box-shadow: var(--crono-shadow-2); }
.my-metric::before {
  content: ''; position: absolute; top: 0; left: 0;
  width: 4px; height: 100%;
  background: var(--crono-rec);  /* domain color */
  border-radius: 4px 0 0 4px;
}
```

### Pattern B — Icon glow box (titles, modal headers)
```css
.my-glow-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--crono-rec), #1488d8);
  color: white;
  box-shadow: 0 6px 16px rgba(0, 120, 212, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
```
For "premium" hero titles, add ::after halo:
```css
.my-glow-icon::after {
  content: ''; position: absolute; inset: -4px;
  border-radius: 14px;
  background: inherit; opacity: 0.25; filter: blur(12px); z-index: -1;
}
```

### Pattern C — Primary CTA gradient
```css
.cta-primary {
  background: linear-gradient(135deg, var(--crono-rec) 0%, #1488d8 100%);
  color: white;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: var(--space-8) var(--space-16);
  font-weight: var(--font-weight-semibold);
  box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 200ms var(--crono-ease-soft);
}
.cta-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0, 120, 212, 0.4); }
```

### Pattern D — Modal/Side panel
```css
.my-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
  animation: crono-fadein 240ms var(--crono-ease-soft);
}
.my-modal {
  background: var(--color-surface);
  border-radius: 12px;
  box-shadow: var(--crono-shadow-3);
  animation: crono-slidein 340ms var(--crono-ease-spring);  /* or fade+scale */
}
.my-modal__header {
  position: relative;
  padding: var(--space-20) var(--space-16) var(--space-16);
  border-bottom: 1px solid var(--color-border);
}
/* Top accent bar 3px (domain color) */
.my-modal__header::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0;
  height: 3px; background: var(--crono-rec);
}
.my-modal__close {
  width: 32px; height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 180ms var(--crono-ease-soft);
}
.my-modal__close:hover { transform: rotate(90deg); }
```

### Pattern E — Chip / Pill (filter, tag, badge)
```css
.my-chip {
  display: inline-flex; align-items: center; gap: var(--space-6);
  padding: var(--space-6) var(--space-12);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all 200ms var(--crono-ease-soft);
}
.my-chip:hover { transform: translateY(-1px); border-color: var(--color-border-strong); }
.my-chip--active {
  color: var(--crono-rec); border-color: var(--crono-rec);
  background: var(--crono-rec-soft);
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.08);
}
```

### Pattern F — Segmented control (toggle 2-3 options)
```css
.my-seg { position: relative; display: inline-flex; padding: 3px;
  background: var(--color-surface-secondary, #f3f2f1);
  border-radius: 10px; border: 1px solid var(--color-border); }
.my-seg__indicator {
  position: absolute; top: 3px; bottom: 3px;
  width: calc((100% - 6px) / 3);  /* divide by N options */
  background: var(--color-surface); border-radius: 8px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
  transition: transform 280ms var(--crono-ease-spring);
}
.my-seg--opt2 .my-seg__indicator { transform: translateX(100%); }
.my-seg--opt3 .my-seg__indicator { transform: translateX(200%); }
.my-seg__btn { padding: var(--space-6) var(--space-14); background: transparent; border: none;
  font-weight: var(--font-weight-medium); color: var(--color-text-secondary); }
.my-seg__btn--active { color: var(--color-text); font-weight: var(--font-weight-semibold); }
```

### Pattern G — Table row hover
```css
.my-table tr {
  transition: background 180ms var(--crono-ease-soft), transform 180ms var(--crono-ease-soft);
}
.my-table tbody tr:hover {
  background: var(--color-hover-overlay, rgba(0, 120, 212, 0.04));
}
.my-table tbody tr {
  opacity: 0;
  animation: crono-item-in 280ms var(--crono-ease-soft) forwards;
}
/* stagger via :nth-child or inline animation-delay */
```

### Pattern H — Card hover lift
```css
.my-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--crono-shadow-1);
  transition: transform 200ms var(--crono-ease-soft), box-shadow 200ms var(--crono-ease-soft);
}
.my-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--crono-shadow-2);
}
```

### Pattern I — Status badge / pill
```css
.my-status { font-size: 10px; font-weight: var(--font-weight-semibold);
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 3px 7px; border-radius: 4px; }
.my-status--ok       { background: rgba(16, 124, 16, 0.15); color: #054b05; }
.my-status--info     { background: rgba(0, 120, 212, 0.18); color: #004578; }
.my-status--warning  { background: rgba(217, 119, 6, 0.18); color: #7c4a00; }
.my-status--error    { background: rgba(209, 52, 56, 0.15); color: #a4262c; }
.my-status--neutral  { background: rgba(99, 99, 99, 0.12); color: var(--color-text-secondary); }
```

### Pattern J — Empty state
```css
.my-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-12);
  padding: var(--space-40) var(--space-16);
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: 12px;
}
.my-empty svg { opacity: 0.4; }
```

### Pattern K — Skeleton loader
```css
.my-skel {
  height: 78px;
  border-radius: 12px;
  background: linear-gradient(90deg,
    var(--color-surface-secondary, #f3f2f1) 0%,
    var(--color-surface) 50%,
    var(--color-surface-secondary, #f3f2f1) 100%);
  background-size: 200% 100%;
  animation: crono-shimmer 1.4s ease-in-out infinite;
}
```

---

## 4. RULES

### DO
- Reuse `--crono-*` tokens. Never re-declare.
- Use `var(--color-surface)`, `var(--color-border)`, `var(--color-text)` (existing Fluent tokens) for base.
- Use spring easing on toggles/scales, soft easing on entrance/hover.
- Add `prefers-reduced-motion` media query to disable animations.
- Border-radius: 8px buttons/chips, 12px cards/modals, 999px pills.
- Multi-layer shadows (use `--crono-shadow-*`), never single drop-shadow.
- Use `font-variant-numeric: tabular-nums` on all numbers (counts, dates, times).
- Use icons from `src/components/Icons/index.js`. Size 14-20 for inline, 28-40 for hero.

### DON'T
- Don't add Framer Motion or React Spring. Pure CSS only.
- Don't change component behavior or props. Visual only.
- Don't redo working logic. Wrap/style what's there.
- Don't introduce new colors outside `--crono-*` + existing Fluent palette.
- Don't use heavy box-shadows (>20px blur, >0.2 opacity). Stay subtle.
- Don't animate properties that trigger layout (width/height) — use transform/opacity.
- Don't break existing functionality. Run `npm run build` after each batch.
- Don't add backdrop-filter on small elements (perf cost) — only modals.

### After every edit batch
1. `npm run build` — must pass
2. `npm run lint 2>&1 | grep -A 2 "<your folder>"` — zero new errors
3. Visual check via screenshot if possible (or describe what changed)

---

## 5. Component-Specific Recipes

### Modal upgrade recipe
1. Wrap overlay with backdrop-filter + crono-fadein
2. Modal body: crono-shadow-3 + 12px radius + crono-slidein
3. Header: add ::before 3px accent bar (domain color)
4. Header icon: wrap in 40px gradient box (pattern B)
5. Close button: rotate 90° on hover
6. Primary action: pattern C gradient
7. Secondary action: ghost button with border, transform translateY(-1px) on hover

### Dashboard widget upgrade recipe
1. Container: crono-shadow-1 + 12px radius + transition hover lift
2. Header h3: icon box per domain (pattern B inline, 32px)
3. Numbers: tabular-nums + count-up via useCountUp if applicable
4. List items: stagger entrance
5. Live indicators: crono-pulse dot
6. Empty state: pattern J

### Table upgrade recipe
1. Header: uppercase semibold gray on bg-secondary
2. Rows: hover overlay 4% domain color
3. Row entrance stagger via animation-delay
4. Action buttons in rows: 32px square, border, rotate-on-hover for icons
5. Status pills per row: pattern I

### Service container upgrade recipe (Routes/Cleaning/Fumigation/Maintenance)
1. Section header: icon box + title + subtitle on left, action CTA on right
2. Filter/search bar: chips (pattern E) + segmented control if filtering
3. Card grid: pattern H card hover lift + stagger
4. Empty state: pattern J
5. Loading: skeleton grid (pattern K)

---

**Bottom line**: copy Cronograma feel. Subtle, spring-eased, never over-animated. Fluent depth + modern polish.
