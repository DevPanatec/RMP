# Information Architecture v2 — Propuesta de Consolidación

**Fecha**: 2026-05-18
**Método**: 6 agentes Explore paralelo (super_admin, admin tabs, operaciones, modales, reports, conductor)
**Objetivo**: reducir nav clutter, eliminar duplicaciones, simplificar mental model.

---

## TL;DR — Mi recomendación

| # | Cambio | Impacto | Esfuerzo | Prioridad |
|---|--------|---------|----------|-----------|
| 1 | Super_admin: 3 tabs → 1 "Administración" master-detail | Alto UX, alta limpieza | 4-6h | **P1** |
| 2 | Admin nav: 9 tabs → 6 grupos | Alto UX | 6-8h | **P1** |
| 3 | Operaciones: separar Catálogo (config) vs Asignaciones (ejecución) | Medio | 4-6h | **P2** |
| 4 | Reports: eliminar 2 DetailModals duplicados + Unified component | Alto código, medio UX | 8-10h | **P2** |
| 5 | Modal primitive compartido | ~4000 líneas menos, alto largo plazo | 3-5 días | **P3** |
| 6 | ConductorDashboard: extraer en tabs + fusionar Weight/BottomSheet | Mobile UX crítico | 2-3 días | **P2** |

---

## #1 — Super_admin: consolidación a una sola tab

### Actual (3 tabs)
```
[Organizaciones]  [Proyectos]  [Plataforma]
     ↓                ↓              ↓
  CRUD orgs        CRUD proyectos  Stats + OrgDetailDrawer
                                      (tabs internos: Uso, Módulos,
                                       Caps, Plan, Auditoría)
```

**Solapamientos**:
- Orgs aparecen en 2 lugares (Organizaciones tabla simple + Plataforma cards con KPIs)
- ProyectosComponent no muestra la org dueña — confuso
- OrgDetailDrawer tiene la info más completa pero solo se llega desde Plataforma

### Propuesta — un solo tab "Administración"

```
[Administración] (master-detail layout)

┌─ Lista de Orgs (izquierda, search + filtros escala/estado)
│  • Nombre · escala · MRR · módulos activos · estado
│  • Botón "+ Nueva org" en header
│
└─ Detail Drawer (derecha, al seleccionar org)
   ├─ Resumen (KPIs: camiones, proyectos, usuarios, storage, MRR, overflow)
   ├─ Proyectos (CRUD — antes era tab top-level)
   ├─ Usuarios (perfiles de la org, asignación por proyecto)
   ├─ Módulos & Caps (toggle módulos prod/roadmap + custom caps)
   ├─ Plan (escala, descuento, fechas, setup)
   └─ Auditoría (audit log filtrable)
```

**Bonus**: elimina `OrganizationSwitcher` y `ProjectSwitcher` del header de super_admin (ya no necesarios — la selección vive en master list).

### Plan (4-6h total)
1. **Phase 1** (1.5h): integrar tabla de `OrganizacionesComponent` como master list en `PlataformaPanel`. Drawer abre desde click.
2. **Phase 2** (1.5h): mover `ProyectosComponent` como sub-tab dentro de `OrgDetailDrawer`. Eliminar tab "Proyectos".
3. **Phase 3** (1h): crear sub-tab "Usuarios" dentro del drawer (lista perfiles por org).
4. **Phase 4** (1h): cleanup — remover OrgSwitcher + ProjectSwitcher del header. Tab "Organizaciones" del nav top-level.

---

## #2 — Admin nav: 9 tabs → 6 grupos

### Actual
`dashboard | operaciones | calendario | mantenimiento | riesgos | inventario | costos | proyectos | reportes` = 9 tabs

### Solapamientos críticos
- **Calendario ↔ Programación**: ambos muestran agenda. Cal = vista lectura, Prog = CRUD. Confunde.
- **Reportes ↔ Dashboard**: Actividad reciente (dashboard) vs histórico (reportes). Línea borrosa.
- **Mantenimiento ↔ Inventario ↔ Costos**: 3 tabs separadas, una se alimenta de las otras dos.

### Propuesta — 6 grupos por afinidad de dominio

```
[Monitoreo]    Dashboard + mapa GPS + actividad real-time
[Operaciones]  Personal · Flota · Servicios · Programación (sub-tabs)
[Calendario]   Vista mensual multi-módulo (lectura)
[Recursos]     Mantenimiento · Inventario (sub-tabs)
[Reportes]     Riesgos · Histórico · Costos (sub-tabs)
[Proyectos]    Solo admin (gestión enterprise por proyecto)
```

- Viewer/enterprise ven los mismos grupos pero con CRUD desactivado (lo que ya hacemos en Sprint 1).
- Responsive <1366px: dropdown "Más" en lugar de iconos sin texto.

### Plan (6-8h)
- Crear contenedores `<RecursosTab>` y `<ReportesTab>` con sub-nav interno.
- Mover `MantenimientoComponent` + `InventoryComponent` adentro de Recursos.
- Mover `RiskComponent` + `ReportsComponent` + `CostosComponent` adentro de Reportes.
- Actualizar `top-nav` en `AdminDashboard.jsx`.

---

## #3 — Operaciones: separar Catálogo vs Asignaciones

### Problema
`Servicios` y `Programación` duplican EXACTAMENTE los 3 mismos tabs internos: Recolección / Fumigación / Limpieza. Pero conceptualmente son distintos:
- **Servicios** = "qué cosas existen" (catálogo: rutas, lugares, salas)
- **Programación** = "cuándo se ejecutan" (asignación a conductores + fechas)

### Propuesta
Dentro de `Operaciones`, reorganizar a 3 sub-tabs claros:
```
Operaciones
├── Recursos       (Personal + Flota — los QUE y CON QUÉ)
├── Catálogo       (Recolección + Fumigación + Limpieza — el QUÉ)
└── Asignaciones   (Schedule de los 3 servicios — el CUÁNDO)
```

Elimina la triple navegación actual (top → sub → internal-tab). Mental model: **Configura → Asigna → Monitorea**.

---

## #4 — Reports: duplicación crítica

### Duplicados encontrados (agent #5)
- `Cleaning/ReportDetailModal.jsx` ≈ `Reports/CleaningReportDetailModal.jsx`
- `Fumigation/FumigationReportDetailModal.jsx` ≈ `Reports/FumigationReportDetailModal.jsx`
- `FumigationReportsPage.jsx` ~95% igual a `LocationReportsModal.jsx`

Total: ~600 líneas duplicadas.

### Estructura común detectada
Todos los DetailModals comparten:
```
Header: icon + title/subtitle + close
Stats cards: fecha, duración, usuario, estado
Map section: MapLibreComponent
Photo gallery: 3 etapas (antes/durante/después)
Observaciones
Download PDF
```

Lo que varía son **3-5 campos específicos por servicio** (paradas para recolección, productos para fumigación, etc).

### Propuesta
```jsx
<UnifiedReportDetailModal
  report={report}
  serviceType="limpieza|fumigacion|recoleccion|mantenimiento"
/>
```
Con secciones plug-and-play: `<ReportStats>`, `<ReportMap>`, `<ReportPhotos>`, `<ReportServiceSpecifics>` (slot por tipo).

**Bonus**: modularizar `reportPdfGenerator.js` (2008 líneas monolíticas) en `pdf/generators/{recoleccion,fumigacion,limpieza,mantenimiento}.js` + `pdfSections.js` compartido.

---

## #5 — Modal primitive (largo plazo)

### Hallazgo (agent #4)
15+ modales con overlay/header/footer copy-pasted. ~1100 líneas CSS + ~900 líneas JSX duplicadas = **~4000 líneas eliminables**.

### Propuesta
Crear `<Modal>` reusable similar al ConfirmDialog ya creado:
```jsx
<Modal size="md" variant="form" onClose={...}>
  <Modal.Header icon={<Icon />}>Título</Modal.Header>
  <Modal.Body scrollable>...</Modal.Body>
  <Modal.Footer>...</Modal.Footer>
</Modal>
```
- Tamaños sm/md/lg/full
- Mobile: bottom-sheet automático <600px
- Focus trap + Esc heredados
- Variants form/detail/picker

### Migración por fases
- **Phase 1**: ConfirmDialog wrap (sin breaking change)
- **Phase 2**: 4 modales simples (FumigationModal, WeightModal, ScheduleConflict, ItemDetail)
- **Phase 3**: PhotosModal + 4 ReportDetailModals
- **Phase 4**: CleaningModal + RouteModal (complejos con tabs)

---

## #6 — ConductorDashboard: refactor mobile

### Problema
- 2898 líneas monolíticas en un solo archivo
- "Completar parada" requiere 5 taps (BottomSheet → tap parada → WeightModal → categoría → confirm)
- 2 flujos distintos para reportar riesgo (header vs WeightModal "no puedo completar")
- BottomSheet + WeightModal repiten info

### Propuestas
1. **Quick win**: fusionar BottomSheet + WeightModal en un flujo inline-expand (5 taps → 3).
2. **Refactor**: extraer `RutaTab.jsx` (~1500 líneas) + `ReportesTab.jsx` (~400) + `hooks/useConductorRoute.js`. ConductorDashboard queda como router.
3. **Unificar flujo Riesgo**: un solo modal con radio "¿impide completar parada?" → elimina el ConfirmDialog redundante.
4. **Offline UX**: banner sticky con contador "3 fotos en cola, 2 sincronizadas".
5. **Patrón Uber/Glovo**: badge "ACTUAL" en parada actual visible aún con sheet colapsado.

---

## Orden de ejecución sugerido

### Sprint A — Quick wins UX (2-3 días)
1. **Super_admin consolidation** (#1) — 4-6h
2. **Eliminar 2 ReportDetailModals duplicados** (#4, sub-task) — 3h
3. **Conductor: fusionar Weight+BottomSheet** (#6.1) — 4h
4. **Conductor: unificar Riesgo** (#6.3) — 2h

### Sprint B — IA refactor (3-5 días)
5. **Admin nav 9→6 grupos** (#2) — 6-8h
6. **Operaciones Catálogo/Asignaciones** (#3) — 4-6h

### Sprint C — Long-term cleanup (1-2 semanas)
7. **Modal primitive + migración por fases** (#5) — 3-5 días
8. **Unified ReportDetailModal + PDF modular** (#4 full) — 4-5 días
9. **ConductorDashboard refactor tabs** (#6.2) — 2-3 días

---

## Trade-offs honestos

**Ganamos**:
- Mental model mucho más claro (menos "¿dónde estaba esa pantalla?")
- Menos código duplicado → menos bugs, easier maintenance
- Mobile mejorado especialmente para conductor (5 taps → 3)
- Onboarding más rápido de nuevos devs

**Perdemos**:
- Usuarios actuales necesitan re-aprender (los que ya saben dónde está cada cosa)
- Click extra para llegar a sub-tabs (Mantenimiento ahora dentro de Recursos)
- Refactor grande → riesgo de regresiones (mitigación: feature flag por sprint)
