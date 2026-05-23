# super_admin findings — run ef5f474f

## P0

- [P0-01] **Organizaciones tab missing from navigation** — `audit/desktop/super_admin/01-Monitoreo.png` (all desktop/headed viewports). The _tabs.json confirms `Organizaciones: visible=false, locked=false`. This violates the super_admin role gate requirement: "should see Org switcher + Organizaciones tab + ALL tabs unlocked." The tab IS being rendered as NOT visible in the first place, blocking access to critical org management UI. **Impact**: Cannot access organization management features. **Fix**: Check AdminDashboard tab rendering logic to ensure Organizaciones tab is conditionally visible for super_admin role.

- [P0-02] **OrgSwitcher functional but Organizaciones tab missing** — `audit/desktop/super_admin/00-landing.png`, `audit/headed/super_admin/02-Operaciones.png`. The org switcher dropdowns work ("Todas las organizaciones" visible), but the expected corresponding navigation tab for "Organizaciones" management is absent. This creates a UX gap: user can switch orgs but has no dedicated tab to manage them. **Impact**: Role gate incomplete. **Fix**: Ensure `super_admin` tipo renders the Organizaciones tab alongside the org switcher component.

## P1

- [P1-01] **Calendar event badges have high saturation colors** — `audit/laptop/super_admin/03-Calendario.png`. Calendar dates (18, 19, 20, 21) show bright blue (#0078D4) and yellow badges with numeric counts. While this is technically acceptable for status indication, the yellow (#FFB900) on light background may fail WCAG contrast at certain angles. **Impact**: Minor accessibility concern. **Suggested fix**: Verify WCAG AA contrast ratio (>4.5:1) for yellow badges, consider using a slightly darker yellow if needed.

- [P1-02] **Fleet cards layout density** — `audit/headless/super_admin/05-flota-base.png`. Fleet cards show compressed layout with icon+name+description+buttons. Cards appear to have dense spacing (<12px padding). Per Fluent design, cards should use `--space-12` minimum padding. **Impact**: Reduced scanability on mobile. **Suggested fix**: Audit card padding in FleetManagement component, ensure minimum `var(--space-12)` padding.

- [P1-03] **Tab bar icon-only on mobile without text labels** — `audit/iphone-se/super_admin/01-Monitoreo.png`, `audit/pixel/super_admin/01-Monitoreo.png`. Mobile tabs show only icons (Monitoreo, Operaciones, etc.) without visible labels. Per Fluent mobile spec: "text labels" should be visible or accessible via long-press. Current design is icon-only which reduces discoverability. **Impact**: UX clarity on small screens. **Suggested fix**: Add text labels below icons or tooltip on long-press for mobile tab bar.

## P2

- [P2-01] **Activity panel styling inconsistent with Fluent** — `audit/desktop/super_admin/02-activity-item-0-hover.png`. Activity items in sidebar appear to have rounded corners >4px, inconsistent with Fluent's `--radius-base: 4px` rule. **Impact**: Minor design inconsistency. **Suggested fix**: Set border-radius to `var(--radius-base)` (4px) for activity cards.

- [P2-02] **GPS modal header spacing** — `audit/desktop/super_admin/07-gps-modal-state.png`. Modal header shows "Reproducción de Ruta" with large title. Spacing between title and content appears to exceed `--space-20` recommended margin. **Impact**: Cosmetic spacing issue. **Suggested fix**: Adjust modal header margin to use `var(--space-16)` or `var(--space-20)`.

## Notes

- Screenshots analyzed: 43 PNGs across 9 viewports (headless, headed, iphone-se, iphone-14, pixel, ipad-mini, ipad-pro, laptop, desktop)
- Viewports covered: Mobile (375-412px), Tablet (768-834px), Desktop (1280px+), Laptop (1440px+)
- Console errors specific to super_admin: 0 blocking errors (only deprecation warnings from Google Maps API)
- Tab accessibility: All 10 visible tabs accessible (Monitoreo, Operaciones, Calendario, Mantenimiento, Riesgos, Inventario, Reportes, Asistencia, RRHH, Plataforma). Organizaciones, Costos, Proyectos marked as NOT visible.
- Role gate status: Org switcher functional, Organizaciones tab MISSING (P0 violation), all unlocked tabs accessible.

