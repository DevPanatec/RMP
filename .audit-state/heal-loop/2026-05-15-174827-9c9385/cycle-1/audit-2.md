# Audit 2 cycle 1 — Frontend / UI

## P0
- [admindash-01] src/pages/AdminDashboard/AdminDashboard.jsx:423-438 — "Agregar Personal" and "Crear Perfil" write-action buttons render for ANY non-viewer userRole. There is NO `isEnterprise` gate anywhere in the file; per CLAUDE.md enterprise is supposed to be read-only. Search confirms only `userRole === 'enterprise'` reference is line 539 (UpcomingRoutes). Fix: gate the `ops-header-buttons` block with `{(userRole === 'admin' || isSuperAdmin) && (...)}` on line 423.
- [admindash-02] src/pages/AdminDashboard/AdminDashboard.jsx:780-788 — Operaciones tab is visible to enterprise users (only `isRestrictedClient` + module check gates it). Enterprise should NOT see write surfaces. Fix: add `&& userRole !== 'enterprise'` to the conditional on line 780.
- [admindash-03] src/pages/AdminDashboard/AdminDashboard.jsx:728-734 — `mantenimiento`, `riesgos`, `inventario`, `reportes` cases render full CRUD components passing `userType={user.tipo}` but no enterprise-write block at dashboard level. Children must trust own gates; AdminDashboard does not restrict enterprise from reaching those tabs. Fix: add explicit `userRole !== 'enterprise'` gate or pass `readOnly` prop downstream and verify each child enforces it.

## P1
- [plataforma-01] src/components/SuperAdmin/PlataformaPanel.jsx:10-15 — Hardcoded hex palette `ESCALA_COLORS = { S: '#107C10', M: '#0078D4', L: '#5C2D91', XL: '#B4009E', XXL: '#D13438' }` instead of CSS vars. Fix: replace with `var(--color-success)` / `var(--color-info)` etc. or move to CSS classes `.escala-pill--S` ... `.escala-pill--XXL`.
- [plataforma-02] src/components/SuperAdmin/PlataformaPanel.jsx:27 — `if (pct >= 90) return '#FF8C00';` hardcoded orange. Fix: replace with `var(--color-warning-strong)` or move to a CSS class.
- [plataforma-03] src/components/SuperAdmin/PlataformaPanel.jsx:69 — `const escalaColor = ESCALA_COLORS[org.escala] || '#605E5C';` hardcoded fallback gray. Fix: use `var(--color-text-secondary)` via class.
- [plataforma-04] src/components/SuperAdmin/PlataformaPanel.css:270-271 — `#B22A2E` hardcoded inside `repeating-linear-gradient` overflow stripe. Fix: replace with `var(--color-error-strong)` or define a token.
- [plataforma-05] src/components/SuperAdmin/PlataformaPanel.css:294 — `.drawer-overlay { background: rgba(0,0,0,0.4); }` hardcoded rgba. Fix: replace with `var(--color-overlay)` (or add token).
- [orgdetail-01] src/components/SuperAdmin/OrgDetailDrawer.jsx:250 — Inline style `background: 'var(--color-warning-light, #FFF4CE)'` mixes hex fallback with CSS var. Fix: ensure `--color-warning-light` is defined in `src/styles/index.css` and drop the hex fallback (same for `#DEECF9`, `#FDE7E9`, `#DFF6DD` in PlataformaPanel.css).
- [servicios-01] src/components/Servicios/ServiciosComponent.jsx:90 — Inline style `style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}` uses hardcoded `13px` instead of `var(--font-size-sm)`. Fix: replace `fontSize: '13px'` with `fontSize: 'var(--font-size-sm)'` or move to CSS class.
- [admindash-04] src/pages/AdminDashboard/AdminDashboard.jsx:989,1074 — Personnel modals call `alert('Error al ...')` (native browser alert) instead of toast notify. Fix: replace with `notify.error(...)` (toast util already imported in ConductorDashboard).

## P2
- [orgdetail-02] src/components/SuperAdmin/OrgDetailDrawer.jsx:247-258 — Inline style block uses `marginTop: 'var(--space-12)'` etc. but mixes hex fallback. Also dramatic block re-rendered inline. Fix: extract to `.drawer__drift-warning` CSS class in PlataformaPanel.css.
- [orgdetail-03] src/components/SuperAdmin/OrgDetailDrawer.jsx:273,320 — `window.confirm(...)` for "Cambiar escala" and "Suspender organización" is a destructive UX antipattern (jarring native modal). Fix: replace with custom in-app confirm modal styled per Fluent.
- [orgdetail-04] src/components/SuperAdmin/OrgDetailDrawer.jsx:154-167 — Tab buttons lack `role="tab"` and `aria-selected`, parent `<nav>` should be `<div role="tablist">`. Fix: add ARIA attrs to drawer__tabs.
- [orgdetail-05] src/components/SuperAdmin/OrgDetailDrawer.jsx:286-308,400-414,440-447 — Discount/caps/date inputs use `onBlur` only (no `onChange` debounced or `onSubmit`). User loses unsaved value if they tab away then close drawer. Fix: track dirty state, prompt on close, or add explicit "Guardar" button.
- [plataforma-06] src/components/SuperAdmin/PlataformaPanel.css:169 — `.escala-pill { padding: 2px 10px; }` random `10px` instead of `var(--space-*)` scale. Fix: `padding: var(--space-2, 2px) var(--space-8)`.
- [plataforma-07] src/components/SuperAdmin/PlataformaPanel.css:566 — `.btn-pill { padding: 6px 14px; }` and `:606 .toggle { width: 40px; height: 22px; border-radius: 11px; }` random non-token spacing. Fix: align to spacing scale.
- [plataforma-08] src/components/SuperAdmin/PlataformaPanel.css:360 — `font-size: 10px;` hardcoded below `var(--font-size-xs)` (11px). Fix: use `var(--font-size-xs)` or add `--font-size-2xs` token.
- [plataforma-09] src/components/SuperAdmin/PlataformaPanel.jsx:75-135 — `OrgCard` is a `<button>` containing nested clickable elements / table-like content. Screen readers will announce the whole card as one button with massive aria-label. Fix: make it a `<div role="button" tabIndex={0}>` with keyDown handler, or extract clickable area to a separate trigger.
- [orgdetail-06] src/components/SuperAdmin/OrgDetailDrawer.jsx:123 — Drawer close button has `aria-label="Cerrar (Esc)"` (good) but the toggle switches (line 344-353, 371-381) have NO `aria-label` / `aria-pressed`. Icon-only toggles fail screen readers. Fix: add `aria-label={`Toggle ${m.name}`}` and `aria-pressed={active}`.
- [servicios-02] src/components/Servicios/ServiciosComponent.jsx:99-110 — Tab buttons lack `role="tab"`, `aria-selected`, keyboard arrow navigation. Fix: add ARIA tab pattern.
- [orgcontext-01] src/context/OrganizationContext.jsx:33-36 — `setCurrentOrg` is recreated on every render and NOT included in the `useMemo` value deps (line 70). Functions like this passed via context cause downstream `useEffect` re-runs. Fix: wrap `setCurrentOrg` in `useCallback([isSuperAdmin])` and add to value deps.

## Stats
- Files audited: 7 (App.jsx, AdminDashboard.jsx, ConductorDashboard.jsx, ServiciosComponent.jsx, OrganizationContext.jsx, PlataformaPanel.jsx, OrgDetailDrawer.jsx, PlataformaPanel.css, Icons/index.js)
- Components audited: 6 (AppContent, AdminDashboard, ConductorDashboard, ServiciosComponent, PlataformaPanel/OrgCard/UsageBar, OrgDetailDrawer)
- Findings: P0=3 P1=8 P2=11
