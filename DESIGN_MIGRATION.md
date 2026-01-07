# Design Migration Guide - Apple Style → Enterprise/Corporativo

## Overview

This document provides step-by-step instructions to migrate existing components from the current "Apple-style" design (playful, spacious, gradient-heavy) to the new **Enterprise/Corporativo** design system (dense, professional, flat).

**Status**: Migration is OPTIONAL for existing components. All NEW components must use Enterprise style from day one (see `CLAUDE.md`).

---

## Quick Reference: Old vs New Values

### Border Radius
```css
/* ❌ OLD (Apple-style - too rounded) */
border-radius: 16px;
border-radius: 12px;
border-radius: var(--radius-xl); /* 10px */

/* ✅ NEW (Enterprise - minimal) */
border-radius: var(--radius-sm);   /* 2px - cards, tables */
border-radius: var(--radius-base); /* 4px - buttons, inputs */
border-radius: var(--radius-lg);   /* 6px - modals (maximum) */
```

### Padding/Spacing
```css
/* ❌ OLD (Spacious - wastes screen space) */
padding: 28px 32px;
padding: 24px;
gap: 24px;

/* ✅ NEW (Dense - efficient) */
padding: var(--space-12);          /* 12px - default for cards */
padding: var(--space-16);          /* 16px - sections */
gap: var(--space-12);              /* 12px - grid gaps */
```

### Shadows
```css
/* ❌ OLD (Dramatic - consumer product style) */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
box-shadow: var(--shadow-xl);

/* ✅ NEW (Subtle - barely visible) */
box-shadow: var(--shadow-xs);  /* 0 1px 2px - very subtle */
box-shadow: var(--shadow-sm);  /* 0 1px 3px - default */
box-shadow: var(--shadow-md);  /* 0 4px 6px - modals only */
```

### Typography
```css
/* ❌ OLD (Large - consumer style) */
h1 { font-size: 48px; }
h2 { font-size: 34px; }
h3 { font-size: 28px; }

/* ✅ NEW (Smaller - professional) */
h1 { font-size: var(--font-size-xl); }    /* 21px */
h2 { font-size: var(--font-size-lg); }    /* 19px */
h3 { font-size: var(--font-size-md); }    /* 17px */
```

### Gradients
```css
/* ❌ OLD (Gradients everywhere - playful) */
background: linear-gradient(135deg, #3D5229, #556B2F);
background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);

/* ✅ NEW (Flat colors - professional) */
background: var(--color-primary);
background: var(--color-surface);
background: var(--color-surface-secondary);
```

### Font Weight
```css
/* ❌ OLD (Everything bold - heavy) */
font-weight: 700;
font-weight: var(--font-weight-bold);

/* ✅ NEW (Semibold - cleaner) */
font-weight: 600;
font-weight: var(--font-weight-semibold);
```

---

## Global Find/Replace Patterns

**⚠️ WARNING**: These are suggestions, not automated replacements. Always review context before applying.

### Pattern 1: Border Radius
```bash
# Find all large border-radius values
Find: border-radius:\s*(12|14|16|18|20)px
Replace: border-radius: var(--radius-base)  # Or --radius-sm depending on context

# Pill shapes
Find: border-radius:\s*999(9|px)
Replace: border-radius: var(--radius-base)  # Convert pills to slightly rounded
```

### Pattern 2: Padding (spacious → dense)
```bash
# Large padding values
Find: padding:\s*(28|32|40)px
Replace: padding: var(--space-16)

Find: padding:\s*24px
Replace: padding: var(--space-12)

# Two-value padding
Find: padding:\s*(28|32)px\s+(28|32)px
Replace: padding: var(--space-12) var(--space-16)
```

### Pattern 3: Shadows (dramatic → subtle)
```bash
# Dramatic shadows
Find: box-shadow:\s*0\s+4px\s+20px.*?;
Replace: box-shadow: var(--shadow-sm);

Find: box-shadow:\s*0\s+8px\s+24px.*?;
Replace: box-shadow: var(--shadow-md);

# Remove shadows from hover states
Find: :hover\s*{\s*box-shadow:\s*0\s+12px.*?;
Replace: :hover { box-shadow: var(--shadow-sm);
```

### Pattern 4: Linear Gradients
```bash
# Background gradients
Find: background:\s*linear-gradient\([^)]+\);
Replace: background: var(--color-surface);  # Or appropriate solid color

# Text gradients (keep only if truly necessary)
Find: background:\s*linear-gradient.*?;[\s\S]*?-webkit-background-clip:\s*text;
# Review manually - decide if text gradient is worth keeping
```

### Pattern 5: Font Size (large → smaller)
```bash
Find: font-size:\s*(28|32|34|36)px
Replace: font-size: var(--font-size-lg)  # 19px

Find: font-size:\s*(40|48)px
Replace: font-size: var(--font-size-xl)  # 21px
```

---

## Component-by-Component Checklist

### Status: Files to Migrate (52 CSS files)

Use this checklist to track migration progress:

#### Dashboard Components
- [ ] `src/pages/AdminDashboard/AdminDashboard.css` ⚠️ HIGH PRIORITY
  - Sidebar: Reduce padding, flatten gradients
  - Content area: Reduce padding from 24px → 16px
  - Cards: Change radius 16px → 2px

- [ ] `src/pages/EnterpriseDashboard/EnterpriseDashboard.css`
  - Same as AdminDashboard

- [ ] `src/pages/ConductorDashboard/ConductorDashboard.css`
  - Same as AdminDashboard

#### Personnel
- [ ] `src/components/Personnel/PersonnelComponent.css` ⚠️ HIGH PRIORITY
  - Header: Reduce padding 28px → 12px
  - Icon: Reduce size 56px → 40px, radius 16px → 4px
  - Table: Row height 48px → 40px
  - Badges: Pills → rectangular (radius 999px → 2px)

#### Fleet
- [ ] `src/components/Fleet/FleetManagement.css`
  - Cards: Reduce padding, flatten shadows
  - Badges: Convert pills to rectangular

#### Routes
- [ ] `src/components/Routes/RoutesComponent.css`
  - Same pattern as Personnel

#### Tables & Lists
- [ ] `src/components/Dashboard/PersonnelTable.css`
  - Row height: 56px → 40px
  - Padding: 16px → 8px 12px
  - Hover: Reduce shadow

- [ ] `src/components/Dashboard/VehicleCard.css`
  - Radius: 16px → 2px
  - Padding: 24px → 12px
  - Remove gradient backgrounds

#### Modals
- [ ] `src/components/RouteModal/RouteModal.css`
  - Radius: 16px → 4px
  - Padding: 32px → 20px
  - Shadow: Reduce to --shadow-md

- [ ] `src/components/WeightModal/WeightModal.css`
  - Same as RouteModal

- [ ] `src/components/Cleaning/CleaningModal.css`
  - Same as RouteModal

- [ ] `src/components/Fumigation/FumigationModal.css`
  - Same as RouteModal

- [ ] `src/components/Schedule/ScheduleModal.css`
  - Same as RouteModal

#### Reports
- [ ] `src/components/Reports/ReportsComponent.css`
- [ ] `src/components/Reports/ReportsDashboard.css`
- [ ] `src/components/Reports/RouteReportDetailModal.css`
- [ ] `src/components/Fumigation/FumigationReportDetailModal.css`
- [ ] `src/components/Cleaning/ReportDetailModal.css`

#### Services
- [ ] `src/components/Cleaning/CleaningComponent.css`
- [ ] `src/components/Cleaning/CleaningAssignments.css`
- [ ] `src/components/Cleaning/CleaningReports.css`
- [ ] `src/components/Fumigation/FumigationComponent.css`
- [ ] `src/components/Fumigation/FumigationAssignments.css`
- [ ] `src/components/Maintenance/MaintenanceComponent.css`

#### UI Components
- [ ] `src/components/UI/Badge.css` ⚠️ HIGH PRIORITY
  - Convert pills to rectangles (radius 999px → 2px)
  - Reduce padding 8px 16px → 4px 8px
  - Remove gradients

- [ ] `src/components/UI/Button.css` ⚠️ HIGH PRIORITY
  - Flatten (remove gradients, reduce shadows)
  - Reduce padding 16px 32px → 8px 16px
  - Reduce radius 12px → 4px

- [ ] `src/components/UI/Card.css`
  - Radius: 12px → 2px
  - Padding: 24px → 12px
  - Shadow: --shadow-lg → --shadow-sm

- [ ] `src/components/UI/ProgressBar.css`
  - Remove gradients
  - Flatten appearance

#### Other Components
- [ ] `src/components/Calendar/CalendarComponent.css`
- [ ] `src/components/Costos/CostosComponent.css`
- [ ] `src/components/GPS/GPSStatusIndicator.css`
- [ ] `src/components/GPS/GPSPlaybackModal.css`
- [ ] `src/components/GeofenceAlert/GeofenceAlertPopup.css`
- [ ] `src/components/Inventory/InventoryComponent.css`
- [ ] `src/components/Inventory/ItemDetailModal.css`
- [ ] `src/components/Login/Login.css`
- [ ] `src/components/Map/MapComponent.css`
- [ ] `src/components/Map/LocationPopup.css`
- [ ] `src/components/Risk/RiskComponent.css`
- [ ] `src/components/SafeTag/SafeTagSync.css`
- [ ] `src/components/SafeTag/RoutePlayback.css`
- [ ] `src/components/SafeTag/RouteStatsPanel.css`
- [ ] `src/components/Schedule/ScheduleComponent.css`

---

## Step-by-Step Migration Process

### Phase 1: Update Variables (DONE ✅)
- [x] Update `src/styles/index.css` with enterprise values
- [x] Add enterprise-specific CSS variables
- [x] Add comments to indicate which variables to use/avoid

### Phase 2: High-Priority Components (Recommended Start)
Focus on the most visible/frequently used components first:

1. **UI Primitives** (affects everything)
   - [ ] `src/components/UI/Badge.css`
   - [ ] `src/components/UI/Button.css`
   - [ ] `src/components/UI/Card.css`

2. **Main Dashboards** (first impression)
   - [ ] `src/pages/AdminDashboard/AdminDashboard.css`
   - [ ] `src/components/Personnel/PersonnelComponent.css`
   - [ ] `src/components/Fleet/FleetManagement.css`

3. **Tables** (information density matters most here)
   - [ ] `src/components/Dashboard/PersonnelTable.css`
   - [ ] All table-heavy components

### Phase 3: Medium-Priority Components
- Modals (RouteModal, WeightModal, etc.)
- Service components (Cleaning, Fumigation, Maintenance)
- Reports

### Phase 4: Low-Priority Components
- Specialty components (GPS, SafeTag, Geofence)
- Admin-only features
- Calendar, Costos

---

## Migration Workflow (Per Component)

### Step 1: Backup
```bash
# Create backup before editing
cp src/components/Personnel/PersonnelComponent.css src/components/Personnel/PersonnelComponent.css.backup
```

### Step 2: Open File & Identify Issues
Look for:
- ❌ Large `border-radius` values (12px+)
- ❌ Large `padding` values (24px+)
- ❌ Dramatic `box-shadow` values (0 4px 20px+)
- ❌ `linear-gradient` backgrounds
- ❌ Font sizes > 24px
- ❌ Font weight: 700 (bold)

### Step 3: Apply Replacements
Use find/replace in your editor:

```css
/* Example: PersonnelComponent.css */

/* BEFORE */
.personnel-header-v2 {
  padding: 28px 32px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
}

/* AFTER */
.personnel-header-v2 {
  padding: var(--enterprise-card-padding); /* 12px */
  border-radius: var(--radius-sm); /* 2px */
  box-shadow: var(--shadow-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border); /* Add subtle border */
}
```

### Step 4: Test Visually
- Run dev server: `npm run dev`
- Navigate to affected component
- Check for:
  - ✅ Less rounded corners
  - ✅ Tighter spacing (more content visible)
  - ✅ Flat appearance (no gradients)
  - ✅ Subtle shadows (barely noticeable)

### Step 5: Adjust as Needed
Fine-tune based on visual result. Sometimes you may need:
- `--radius-base` (4px) instead of `--radius-sm` (2px)
- `--space-16` instead of `--space-12` for breathing room

### Step 6: Commit
```bash
git add src/components/Personnel/PersonnelComponent.css
git commit -m "refactor(personnel): migrate to enterprise design system

- Reduce border-radius: 16px → 2px
- Reduce padding: 28px → 12px
- Remove gradient backgrounds
- Flatten shadows: dramatic → subtle
- Complies with Enterprise Design System (see CLAUDE.md)"
```

---

## Common Migration Patterns

### Pattern: Card Component
```css
/* BEFORE (Apple-style) */
.card {
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffffff, #f9fafb);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
}

/* AFTER (Enterprise) */
.card {
  padding: var(--enterprise-card-padding); /* 12px */
  border-radius: var(--radius-sm); /* 2px */
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-xs);
}

.card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
  /* Remove transform - too playful for enterprise */
}
```

### Pattern: Table Row
```css
/* BEFORE (Apple-style) */
.table-row {
  height: 64px;
  padding: 20px 24px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.table-row:hover {
  background: rgba(61, 82, 41, 0.05);
  transform: scale(1.01);
}

/* AFTER (Enterprise) */
.table-row {
  height: var(--enterprise-table-row-height); /* 40px */
  padding: var(--space-8) var(--space-12);
  border-bottom: 1px solid var(--color-border);
  transition: background var(--duration-fast) var(--ease-out);
}

.table-row:hover {
  background: var(--color-hover-overlay);
  /* Remove transform and border-radius */
}
```

### Pattern: Badge/Pill
```css
/* BEFORE (Apple-style - pill shaped) */
.badge {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 999px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

/* AFTER (Enterprise - rectangular) */
.badge {
  padding: var(--enterprise-badge-padding); /* 4px 8px */
  font-size: var(--font-size-xs); /* 11px */
  font-weight: var(--font-weight-medium); /* 500, not 600 */
  border-radius: var(--radius-sm); /* 2px */
  background: var(--color-success-light);
  color: var(--color-success);
  border: 1px solid var(--color-success);
  box-shadow: none; /* No shadow */
}
```

### Pattern: Button
```css
/* BEFORE (Apple-style) */
.btn-primary {
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 12px;
  background: linear-gradient(135deg, #3D5229, #556B2F);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(61, 82, 41, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(61, 82, 41, 0.4);
}

/* AFTER (Enterprise) */
.btn-primary {
  padding: var(--enterprise-button-padding); /* 8px 16px */
  font-size: var(--font-size-base); /* 15px */
  font-weight: var(--font-weight-medium); /* 500 */
  border-radius: var(--radius-base); /* 4px */
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--color-primary);
  box-shadow: none;
  transition: background var(--duration-fast) var(--ease-out);
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  /* Remove transform and shadow changes */
}
```

### Pattern: Modal
```css
/* BEFORE (Apple-style) */
.modal {
  padding: 32px;
  border-radius: 20px;
  background: white;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.modal-header h2 {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #1a1a1a, #3D5229);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* AFTER (Enterprise) */
.modal {
  padding: var(--space-20); /* 20px */
  border-radius: var(--radius-lg); /* 6px - maximum for modals */
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

.modal-header {
  margin-bottom: var(--space-16);
  padding-bottom: var(--space-12);
  border-bottom: 1px solid var(--color-divider);
}

.modal-header h2 {
  font-size: var(--font-size-lg); /* 19px */
  font-weight: var(--font-weight-semibold); /* 600 */
  color: var(--color-text);
  /* Remove text gradient */
}
```

---

## Before/After Visual Checklist

When migrating a component, it should exhibit these changes:

### Before (Apple-style) ❌
- 🔴 Rounded corners everywhere (12-16px radius)
- 🔴 Lots of whitespace (24-32px padding)
- 🔴 Dramatic shadows (floating effect)
- 🔴 Gradient backgrounds
- 🔴 Large typography (28px+ headers)
- 🔴 Pill-shaped badges
- 🔴 Animations on hover (scale, translateY)

### After (Enterprise) ✅
- 🟢 Almost flat corners (2-4px radius)
- 🟢 Compact spacing (8-16px padding)
- 🟢 Barely visible shadows
- 🟢 Flat, solid colors
- 🟢 Smaller typography (19-21px headers)
- 🟢 Rectangular badges
- 🟢 Simple color transitions only

---

## Testing Checklist

After migrating a component:

- [ ] Visual inspection: Looks more corporate/professional
- [ ] Information density: More content visible without scrolling
- [ ] No gradients in backgrounds
- [ ] Shadows are subtle (barely noticeable)
- [ ] Border radius is minimal (2-4px)
- [ ] Padding/spacing uses Design System variables
- [ ] Colors use CSS variables (no hardcoded hex)
- [ ] Typography follows enterprise scale
- [ ] Tables are dense (40-48px row height)
- [ ] No dramatic hover effects (scale, translateY)
- [ ] Responsive: Still works on mobile

---

## Notes

- **Migration is progressive**: You don't have to do all 52 files at once
- **New components**: Must use Enterprise style from day one (see CLAUDE.md)
- **Old components**: Can be migrated as you touch them for other reasons
- **Variables first**: The updated `src/styles/index.css` already has enterprise values
- **Visual regression**: Keep screenshots of "before" state for comparison
- **User feedback**: Government users will appreciate the information density

---

## Questions?

If unsure about a migration decision:
1. Check `CLAUDE.md` → "Design System - Enterprise/Corporativo Style"
2. Use enterprise CSS variables from `src/styles/index.css`
3. When in doubt: **Flatter, smaller, denser** = more enterprise
4. Ask Claude (me!) for guidance - reference this file and specific component

---

**Last Updated**: January 2026
**Design System Version**: Enterprise/Corporativo v1.0
