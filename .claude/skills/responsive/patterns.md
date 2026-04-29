# Responsive Patterns — RMP Reference Snippets

## Full-height mobile chain (monitoring dashboard pattern)

### JSX
```jsx
<div className={`dashboard-container ${activeTab === 'dashboard' ? 'monitoring-active' : ''}`}>
  <div className="app-bar">...</div>
  <main className="main-content">
    <div className="monitoring-layout">
      <div className="monitoring-map-area">...</div>
      <div className="monitoring-bottom-sheet">...</div>
    </div>
  </main>
</div>
```

### CSS
```css
@media (max-width: 1024px) {
  .monitoring-active {
    display: flex !important;
    flex-direction: column !important;
    height: 100dvh !important;
    overflow: hidden !important;
  }
  .monitoring-active .app-bar { flex: 0 0 auto !important; }
  .monitoring-active .main-content {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .monitoring-active .monitoring-map-area {
    flex: 1 1 auto !important;
    min-height: 0 !important;
  }
}
```

## Top-nav icon-tabs

```css
.top-nav {
  display: flex;
  overflow-x: auto;
  gap: 0;
  padding: 0 var(--space-24);
  scrollbar-width: none;
}
.top-nav::-webkit-scrollbar { display: none; }
.top-nav__tab {
  padding: var(--space-12) var(--space-20);
  display: flex;
  align-items: center;
  gap: var(--space-8);
  white-space: nowrap;
}
.top-nav__tab.active { color: var(--color-primary); }
.top-nav__tab.active::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: var(--color-primary);
}

@media (max-width: 768px) {
  .top-nav { padding: 0 var(--space-12); }
  .top-nav__tab { padding: var(--space-12); font-size: var(--font-size-xs); gap: var(--space-4); }
  .top-nav__tab span:not(:empty) { display: none; }
  .top-nav__tab.active span:not(:empty) { display: inline; }
}
```

## Bottom-sheet

```css
.bottom-sheet {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: var(--color-surface);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
  padding-bottom: env(safe-area-inset-bottom, 0);
  transition: height 0.3s cubic-bezier(0.1, 0.9, 0.2, 1);
}
.bottom-sheet.collapsed { height: 56px; }
.bottom-sheet.expanded { height: 60dvh; }
.bottom-sheet__handle { padding: var(--space-8) var(--space-16); cursor: pointer; }
.handle-bar {
  width: 36px; height: 4px;
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
  margin: 0 auto;
}
```

## KPI chips floating over map

```css
.kpi-overlay {
  position: absolute;
  top: 60px; left: 12px; right: 12px;
  z-index: 10;
  display: flex;
  gap: var(--space-8);
}
.kpi-chip {
  flex: 1;
  backdrop-filter: blur(12px);
  background: rgba(255,255,255,0.92);
  border-radius: var(--radius-md);
  padding: var(--space-8);
  text-align: center;
  box-shadow: var(--shadow-sm);
}
```

## Grid collapse ladder

```css
.grid { grid-template-columns: repeat(4, 1fr); gap: var(--space-16); }

@media (max-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); gap: var(--space-12); }
}
@media (max-width: 480px) {
  .grid { grid-template-columns: 1fr; }
}
```

## Modal near-fullscreen mobile

```css
@media (max-width: 480px) {
  .modal-overlay { padding: 0; }
  .modal-content {
    max-width: 100vw;
    max-height: 100dvh;
    height: 100dvh;
    border-radius: 0;
  }
  .modal-actions {
    flex-direction: column-reverse;
    gap: var(--space-8);
  }
  .modal-actions button {
    width: 100%;
    min-height: 44px;
  }
}
```

## Tables horizontal scroll

```css
@media (max-width: 768px) {
  .table-wrapper {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
  }
}
```

## Library map wrapper overrides (MapLibre/Leaflet)

```css
.monitoring-active .maplibre-component-wrapper,
.monitoring-active .maplibregl-map,
.monitoring-active .maplibregl-canvas-container,
.monitoring-active .maplibregl-canvas,
.monitoring-active .leaflet-container {
  height: 100% !important;
  width: 100% !important;
  min-height: 0 !important;
  max-height: none !important;
  border-radius: 0 !important;
}
```
