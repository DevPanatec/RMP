# Audit Checklist — Run Before Touching CSS

## 1. Grep for anti-patterns

```
# Hardcoded heights inside media queries (top offender)
grep -nE "height:\s*\d+(px|rem)" src/pages/*/Dashboard.css | grep -B2 "max-width"

# vh usage (should be dvh for mobile)
grep -n "100vh" src/**/*.css

# :has() without fallback
grep -n ":has(" src/**/*.css

# Hardcoded colors
grep -nE "#[0-9a-fA-F]{3,6}|rgba?\(" src/**/*.css
```

## 2. Identify breakpoints already present
```
grep -n "@media" <target.css>
```
Note current ladder. Standard RMP ladder: 480 / 768 / 1024.

## 3. Inspect JSX structure
- Does root container have a conditional mode class (for `:has()` fallback)?
- Are there nested flex columns that need `min-height: 0`?
- Are there library wrappers (Map, Leaflet, MapLibre) — these often have their own `min-height`.

## 4. Touch-target audit
Look for buttons/icons with:
- `padding < 8px` on mobile
- `width < 44px` or `height < 44px` for tap targets
- Inline-block text buttons without `min-height`

## 5. Overflow audit
- Root `.dashboard-container` or `body` — ensure `overflow-x: hidden` on mobile
- Flex children without `min-width: 0` can force horizontal scroll
- Tables without wrapper force horizontal scroll on the whole page

## 6. Verification after edits
Open browser devtools, toggle device toolbar:
- 375x667 (iPhone SE)
- 390x844 (iPhone 14)
- 768x1024 (iPad portrait)
- 1024x768 (iPad landscape)

Check each:
- [ ] No horizontal scroll
- [ ] No content cut off below viewport
- [ ] All tap targets ≥44px
- [ ] Text readable (≥13px body, ≥11px labels)
- [ ] Modals not overflowing
- [ ] Maps/canvases fill allocated space
- [ ] Bottom sheet (if any) anchors to viewport bottom
