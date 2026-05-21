# Audit 2 cycle 1 — Frontend (PlataformaPanel + OrgDetailDrawer + CSS)

## P0
None. CSS files exist and are properly imported.

## P1
- [FRNT-01] window.confirm on lines 273 and 320. Native browser dialogs violate Fluent Design. Replace with custom modal using design tokens.

- [FRNT-02] Inline styles should move to CSS: Lines 247-257 (drift warning box with marginTop, padding, background, border, borderRadius, fontSize), 284/312/359/438/450 (h3 marginTop hardcoded 24/16px). Create `.drawer__drift-warning` class + h3 sibling selector margins.

- [FRNT-03] Focus trap missing in drawer. Has role="dialog", aria-modal, Esc-close, but no: (a) initial focus on mount, (b) Tab cycling within drawer, (c) focus restore on close. Per WCAG 2.1 AA, required for modal dialogs.

- [FRNT-04] Constants drift hazard. ESCALA_BASE_USD (line 25) and MODULOS_* prices (lines 27-41) duplicated in convex/lib/limits.ts and convex/lib/modules.ts. If backend prices change, frontend admin UI may show stale numbers. Extract to shared src/shared/plan-constants.json or generate from Convex schema.

- [FRNT-05] Toggle buttons (lines 345, 372) lack keyboard accessibility. No aria-pressed, aria-label. Add `aria-pressed={active}` and `aria-label="Toggle ${moduloName}"` to improve screen reader experience.

- [FRNT-06] Number input caps (line 400-414) have min={0} but no max. User can enter 999999; backend likely validates but UI should constrain for good UX. Add `max={usage.caps[key]}` or reasonable ceiling (e.g., 10000).

- [FRNT-07] Date input timezone issue (lines 441-446, 453-460). `new Date(raw).getTime()` parses YYYY-MM-DD as local midnight. For global SaaS, should use UTC noon via `new Date(raw + 'T12:00:00Z').getTime()` to avoid off-by-one-day in audit log across timezones.

## P2
- [FRNT-08] Mobile responsiveness: org-card grid (line 207-209) is 1fr 1fr and switches to 1fr on line 662 (768px breakpoint). Verify breakpoint is small enough (<480px) to prevent 2-col cramping on small phones.

- [FRNT-09] safeStringify truncation at 200 chars (line 12) has no hover tooltip. If value is cut mid-word, user cannot see full value. Add `title={fullValue}` to audit table cells for native tooltip.

- [FRNT-10] Discount input (line 286-308) validates 0-15 on blur but backend validation required for security (UI validation can be bypassed). Verify convex/organizaciones.ts validates discount in setDiscount mutation.

- [FRNT-11] Tab gate in AdminDashboard (lines 741-742) checks isSuperAdmin for rendering, but no explicit guard on setActiveTab to prevent URL hacks. Low risk (renderTabContent rejects), but ideally validate tab name before setState.

## P3
- [FRNT-12] All required icons exported from src/components/Icons/index.js ✓. No dead code or console warnings found.

- [FRNT-13] Loading states: Panel loading ✓, drawer loading ✓, null handling ✓. All tabs render gracefully with empty arrays.

- [FRNT-14] PlataformaPanel import of CSS (line 6) correct. Both components share single CSS file (PlataformaPanel.css). Add explicit import to OrgDetailDrawer.jsx for clarity.

## Stats
- Files audited: 3 (PlataformaPanel.jsx, OrgDetailDrawer.jsx, PlataformaPanel.css)
- Findings: P0=0, P1=7, P2=4, P3=4
- Major gaps: UX (window.confirm, focus trap), data integrity (constants drift), accessibility (toggles, dates).

## Summary
Frontend is functionally complete but has 7 P1 professional UX/design issues (native dialogs, inline styles, focus management, constants drift). P2s are polish (mobile, tooltips, input max). No security or data loss risks found (assuming backend validates). Next: Auditor 1 backend validation + Auditor 3 cross-cut gaps.
