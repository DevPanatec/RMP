# Migration Backup - Original Color Values

**Date:** 2026-01-07
**Branch:** design/fluent-migration
**Purpose:** Document original color values before Fluent Design migration

---

## Olive Green Palette (OLD - Pre-Migration)

### Primary Colors
- **Primary**: `#3D5229` (Olive green - used in headers, buttons, primary actions)
- **Secondary**: `#556B2F` (Darker olive - used in hover states, gradients)
- **Light**: `#90EE90` (Light green - used in status badges, backgrounds)

### RGBA Variants
- `rgba(61, 82, 41, 1.0)` - Solid olive
- `rgba(61, 82, 41, 0.15)` - Subtle overlay
- `rgba(61, 82, 41, 0.08)` - Very subtle overlay
- `rgba(61, 82, 41, 0.3)` - Medium shadow
- `rgba(61, 82, 41, 0.4)` - Strong shadow

### Gradients
- Header gradient: `linear-gradient(135deg, #3D5229 0%, #556B2F 100%)`
- Button gradient: `linear-gradient(135deg, #3D5229 0%, #556B2F 100%)`
- Card gradient: `linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)`
- Timeline gradient: `linear-gradient(to bottom, #3D5229, #556B2F)`

### Eco Colors (Legacy)
- `--color-eco-primary`: `rgba(34, 139, 34, 1)` (Forest green)
- `--color-eco-secondary`: `rgba(107, 142, 35, 1)` (Olive drab)
- `--color-eco-accent`: `rgba(152, 251, 152, 1)` (Pale green)
- `--color-eco-dark`: `rgba(0, 100, 0, 1)` (Dark green)
- `--color-recycling`: `rgba(76, 175, 80, 1)` (Recycling green)

---

## New Slate Blue Palette (Target - Post-Migration)

### Primary Colors
- **Primary**: `#1e293b` (Slate 800 - `--color-primary`)
- **Hover**: `#334155` (Slate 700 - `--color-primary-hover`)
- **Active**: `#0f172a` (Slate 900 - `--color-primary-active`)

### RGBA Variants
- `rgba(30, 41, 59, 1.0)` - Solid slate
- `rgba(30, 41, 59, 0.15)` - Subtle overlay
- `rgba(30, 41, 59, 0.08)` - Very subtle overlay
- `rgba(30, 41, 59, 0.04)` - Hover overlay (`--color-hover-overlay`)

### Gradients (Strategic Use Only)
- Primary gradient: `linear-gradient(135deg, #1e293b 0%, #334155 100%)`
- **Note:** Gradients should be REMOVED from main UI surfaces (flat design)

---

## Migration Rules

### Color Replacements
```
#3D5229 → var(--color-primary)
#556B2F → var(--color-primary-hover)
#90EE90 → var(--color-success-light)
rgba(61, 82, 41, X) → rgba(var(--color-primary-rgb), X)
```

### Gradient Removal
```
background: linear-gradient(135deg, #3D5229...) → background: var(--color-primary)
```

### Border Radius Fixes
```
border-radius: 12px → border-radius: var(--radius-base)  /* 4px */
border-radius: 16px → border-radius: var(--radius-md)    /* 6px */
border-radius: 20px → border-radius: var(--radius-lg)    /* 8px */
```

### Shadow Fixes
```
box-shadow: 0 4px 14px rgba(61, 82, 41, 0.3) → box-shadow: var(--shadow-sm)
```

---

## Migration Statistics (Pre-Migration)

### Files Affected
- **Total CSS files**: 67
- **Files with olive green**: 39
- **Hardcoded olive colors**: 750+
- **Linear gradients**: 410+
- **Oversized border-radius**: 333+

### Component Compliance (Pre-Migration)
- Personnel: 5% ❌
- Fleet: 60% ⚠️
- Routes: 2% ❌
- RouteModal: 15% ❌
- CleaningModal: 75% ✅
- FumigationModal: 70% ✅

---

## Rollback Commands

### Revert Specific File
```bash
git checkout convex -- src/components/[ComponentName]/[FileName].css
```

### Revert Entire Component
```bash
git checkout convex -- src/components/[ComponentName]/
```

### Abandon Migration Branch
```bash
git checkout convex
git branch -D design/fluent-migration
```

### Nuclear Rollback (Last Resort)
```bash
git reset --hard convex
```

---

## Critical Files to Backup

1. `src/styles/index.css` - Global design system
2. `src/components/Fleet/FleetManagement.css`
3. `src/components/Personnel/PersonnelComponent.css`
4. `src/components/Routes/RoutesComponent.css`
5. `src/components/RouteModal/RouteModal.css`
6. `src/pages/AdminDashboard/AdminDashboard.css`
7. `src/pages/EnterpriseDashboard/EnterpriseDashboard.css`
8. `src/pages/ConductorDashboard/ConductorDashboard.css`

---

## Notes

- **Migration Start Date**: 2026-01-07
- **Estimated Duration**: 1-2 weeks
- **Target Completion**: Phase-by-phase, 13 phases total
- **Testing Strategy**: Visual regression after each phase
- **Risk Level**: Medium (large refactor, but reversible)

---

**DO NOT DELETE THIS FILE** - It serves as documentation and rollback reference for the entire migration process.
