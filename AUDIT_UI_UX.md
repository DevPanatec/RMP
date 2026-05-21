# Auditoría UI/UX RMP — por Rol

**Fecha**: 2026-05-18
**Alcance**: 5 roles (super_admin, admin, enterprise, viewer, conductor)
**Método**: 5 agentes Explore en paralelo, revisión código JSX/CSS vs CLAUDE.md (Fluent Design + role-gates)

---

## Resumen Ejecutivo

| Rol          | P0 | P1 | P2 | Total |
|--------------|----|----|----|-------|
| super_admin  | 1  | 16 | 3  | 20    |
| admin        | 1  | 3  | 11 | 15    |
| enterprise   | 5  | 4  | 2  | 11    |
| viewer       | 4  | 4  | 2  | 10    |
| conductor    | 0  | 4  | 9  | 13    |
| **TOTAL**    | **11** | **31** | **27** | **69** |

**Tema dominante**: role-gating de UI roto (P0). Backend bloquea via `requireWriteRole`, pero frontend muestra botones CRUD a `enterprise` y `viewer`. Confirma el P0 conocido en CLAUDE.md.

**Segundo tema**: violaciones Fluent Design — hardcoded colors/spacing/shadows en componentes nuevos. Diseño definido en CLAUDE.md no se está aplicando consistentemente.

---

## P0 — Críticos (11)

### Role-Gate roto (8 findings → bloquean compliance del contrato role-based)

| # | Componente | Issue | Fix |
|---|------------|-------|-----|
| 1 | `src/components/Project/ProjectSwitcher.jsx:7` | Switcher visible para enterprise (debería poder ver pero no cambiar). Solo gatekeep `!isAdmin`. | `if (!isAdmin \|\| user?.tipo === 'enterprise') return null;` |
| 2 | `src/components/Fleet/FleetManagement.jsx:177` | Botón "Agregar Vehículo" + Edit/Delete visible enterprise & viewer. Sin prop `userRole`. | Pasar `userRole`, envolver botones con `{userRole === 'admin' && ...}`. |
| 3 | `src/components/Routes/RoutesComponent.jsx:93,122-135` | "Nueva Ruta" + Edit/Delete sin gating. | Mismo patrón. |
| 4 | `src/components/Inventory/InventoryComponent.jsx:206,239,269` | Recibe `userType` pero NO se usa. Botones CRUD siempre. | Usar el prop ya existente. |
| 5 | `src/components/Maintenance/MaintenanceComponent.jsx:22` + `MaintenanceTaskModal.jsx:16,1050` | Define `isEnterprise` y nunca lo usa. Submit buttons siempre. | `disabled={viewMode \|\| isEnterprise}` + ocultar submit. |
| 6 | `src/components/Risk/RiskComponent.jsx:204-220` | Botones "Revisar" y "Resuelto" visibles para `viewer`. | Envolver con `{userType !== 'viewer' && ...}`. |
| 7 | `src/components/Dashboard/PersonnelTable.jsx:144-161` | Edit/Delete siempre visibles, sin prop `userRole`. | Pasar `userRole`, ocultar acciones para viewer/enterprise. |
| 8 | `src/pages/AdminDashboard/AdminDashboard.jsx:473` | `window.confirm()` para delete. UX/branding pobre. | Modal `ConfirmDialog` consistente con Fluent. |

### A11y (1)

| # | Componente | Issue | Fix |
|---|------------|-------|-----|
| 9 | `src/components/SuperAdmin/OrgDetailDrawer.jsx:130-144` | Focus trap no maneja dialogs anidados (drawer→confirm→textarea). Tab puede escapar. | Focus trap jerárquico, restaurar al cerrar dialog hijo. |

### Hardcoded data / Fluent visible (2)

| # | Componente | Issue | Fix |
|---|------------|-------|-----|
| 10 | `src/components/SuperAdmin/PlataformaPanel.jsx:9-14,27` | `ESCALA_COLORS` con hex hardcoded (#107C10, #0078D4, #5C2D91, #FF8C00). | Mover a `var(--escala-s/m/l/xl)` en `src/styles/index.css`. |
| 11 | `src/components/Map/MapLibreComponent.jsx:137-353` | 16 hex hardcoded en movement colors + SVG markers. | Tokens Fluent (`var(--color-success)` etc). |

---

## P1 — Importantes (31)

### Falta indicador read-only / role-state (3)
- `AdminDashboard.jsx:754` — `enterprise` y `viewer` sin badge "Modo Lectura" visible en header.
- `Organization/OrganizationSwitcher.jsx:18` — cambio de org sin toast/feedback.
- `AdminDashboard.css:3329-3343` — `.tab-locked` con contraste insuficiente (opacity 0.45), candado poco visible.

### Fluent Design (12)
- `RoutesComponent.css:33,35` — `border-radius: 16px` (escala máx 8px) + gradient mezcla `#ffffff` con var.
- `FleetManagement.css:36,69,97-98` — shadow hardcoded, h2 `28px/700`, pill `rgba()` hardcoded.
- `CostosComponent.css:27,52,66` — `border-radius: 14-16px`, h2 `26px/700`.
- `HeroStats.jsx:112` — `font-weight: 700` debe ser 600.
- `HeroStats.css:183-202` — rgba hardcoded variants + `#C19C00`.
- `RiskAlerts.css:42` — gradient excesivo en header (Fluent es flat).
- `AdminDashboard.css:29` — shadow `0 1px 4px rgba()` no var.
- `WeightModal.jsx:9-12,317,326` — colores categoría hardcoded inline (`#6b9656`, `#9b8456`, etc.), styles inline con `#e5e7eb`/`#6b7280`.
- `ConductorDashboard.jsx:1728` — inline style en botón "Terminar".
- `PlataformaPanel.css:303` — `rgba(0,0,0,0.4)` overlay sin variable.
- `OrgDetailDrawer.css:283,675-676` — `var(--focus-ring, rgba(...))` fallback hardcoded; gradient sin prefijo webkit.
- `OrganizacionesComponent.jsx:196` — overlay `rgba(0,0,0,0.4)` inline JS, debe ir a CSS.

### UX (12)
- `OrgDetailDrawer.jsx:289-297,663-665,715-719,801-805` — spinner "Cargando…" sin timeout; clase `--roadmap` con opacity confunde con disabled; input cap no resetea visualmente tras error; tabla audit log truncada solo muestra full text on hover sin cursor-help.
- `OrganizacionesComponent.jsx:79,143` — validación solo on-submit, empty state sin CTA inline.
- `PlataformaPanel.jsx:171-177,216-223,671` — loading minimalista (sin skeleton), search no clearable, cards >280px no caben <768px.
- `RiskAlerts.css:119-141` — count badges 18×18px + font 10px (touch target <44px mobile).
- `MaintenanceTaskModal` — modal sin `max-width` controlado, overflow en mobile.
- `AdminDashboard.jsx:792-800` — tab locked tooltip silencioso, ícono-only ≤1366px pierde contexto.
- `ScheduleComponent.jsx:33` — `viewerMode` solo oculta add buttons, falta auditar drag&drop / edit inline.
- `MapLibreComponent` — fallback colors `var(--warning-dark, #92400e)` rompe consistencia.

### Mobile / Conductor (4)
- `WeightModal.jsx:568` — `font-size: 10px` ilegible a 1 brazo (<12px).
- `ConductorDashboard.jsx:486-488` — banner offline desaparece en 5s; debe persistir mientras `!navigator.onLine`.
- `ConductorDashboard.jsx:1728` — "Terminar" sin manejo offline (no queue local).
- `GPSStatusIndicator.jsx:24` — `if (!gps_imei) return null` esconde indicador, conductor sin feedback de "GPS off".

---

## P2 — Pulido (27)

**Recurrentes**:
- Spacing hardcoded (`padding: 20px`, `gap: 10px`, `margin: 15px`) en 30+ archivos CSS — necesita migración batch a `var(--space-*)`.
- `PersonnelTable.css:78,96` — badges con `padding: 2px`, rows con `padding: 8px` muy denso.
- `RealtimeActivity.css:49` — `var(--space-10)` no existe (escala 4/8/12/16/20/24).
- `OrganizationSwitcher` — mobile <480px no apila label+select.
- `BottomSheet.jsx:348` — botón compact sin texto, ~40px (<48px ideal).
- `RouteCompletionModal.jsx:9` — breakpoint 1024px convierte modal a bottom-sheet en tablet (debería ser <600px).
- `ConductorDashboard.css:816` — `min-height: 600px` mapa rompe en iPhone 12.
- `RouteCompletionModal:183-196` — botones mobile ~32px (WCAG 44px).
- `WeightModal:149` — emoji "📷" sin aria-label.
- `MapLibreComponent` movement colors fallback hardcoded.
- Falta `EmptyState` en Personnel, Fleet, Routes, Inventory cuando lista vacía.
- A11y: botones icon-only sin `aria-label` en `PersonnelTable.jsx:78-79` y similares.

---

## Plan de Remediación Sugerido

### Sprint 1 (urgente, 1 día)
Cierra los 8 P0 de role-gate. Patrón único:
1. Cada componente operacional recibe prop `userRole`.
2. Envolver botones Create/Edit/Delete: `{['admin','super_admin'].includes(userRole) && <button…>}`.
3. Pasar `userRole={user.tipo}` desde AdminDashboard a TODOS los componentes hijos (no solo algunos).
4. Reemplazar `window.confirm()` por `<ConfirmDialog>` Fluent.

### Sprint 2 (2-3 días)
- Focus trap jerárquico en OrgDetailDrawer.
- Mover hardcoded hex (PlataformaPanel, MapLibre, WeightModal) a `var(--*)`.
- Badge "Modo Lectura" para enterprise/viewer en app-bar.
- Banner offline persistente para conductor.

### Sprint 3 (pulido, paralelo)
- Batch migration: hardcoded `px` → `var(--space-*)`.
- EmptyState component en todas las listas.
- aria-labels en botones icon-only.
- Mobile touch targets ≥44px.

---

## Anexo: Mapa de roles → tabs

```
super_admin: dashboard, operaciones, calendario, mantenimiento, riesgos,
             inventario, costos, proyectos, organizaciones, plataforma, reportes
admin      : (= super_admin sin organizaciones/plataforma)
enterprise : (= admin, todo read-only — actualmente roto en frontend)
viewer     : dashboard, operaciones, riesgos (resto LOCKED con candado)
conductor  : ConductorDashboard separado (Mi Ruta, Mis Reportes, mobile-first)
```
