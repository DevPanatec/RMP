# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RMP (Recolecting Manager Pro)** is a comprehensive waste collection and facility management system built with React + Vite + Convex + Clerk. The system is designed for government/municipal operations in Panama and supports multiple service types including waste collection, fumigation, cleaning services, and maintenance tracking.

### Core Purpose
This system was created to meet government tender requirements for waste management software with:
- Real-time GPS vehicle monitoring
- Route tracking and collection point logging
- Automated operational reports (volume collected, route compliance)
- Live demonstration capability
- Multi-service management (waste, cleaning, fumigation, maintenance)

### User Roles
The system supports **3 user types**, each with their own dashboard:
1. **Admin** (`tipo: 'admin'`) - Full system access, manages all projects, vehicles, routes, personnel
2. **Enterprise** (`tipo: 'enterprise'`) - Company-level view of assigned vehicles and routes
3. **Conductor** (`tipo: 'conductor'`) - Driver view with assigned route and real-time tracking

## Commands

### Development
```bash
npm run dev          # Start dev server (runs cleanCache.js first, then Vite on port 8000)
npm run dev:nocache  # Start dev server without clearing cache
npm run clean        # Manually run cache cleanup script
```

### Build & Quality
```bash
npm run build   # Production build with Vite
npm run preview # Preview production build locally
npm run lint    # ESLint check (JSX files only)
```

### Important Notes
- Dev server runs on **port 8000** (not default 5173)
- Cache is automatically cleared on `npm run dev` via `scripts/cleanCache.js`
- Vite uses **polling** for file watching (configured in `vite.config.js`)
- HMR overlay is disabled to prevent intrusive error popups

## Architecture

### Application Flow & Entry Points

1. **Entry**: `src/main.jsx` → renders `App.jsx`
2. **Root Component**: `App.jsx`
   - Wraps app in `ClerkProvider` + `ConvexProviderWithClerk` (authentication + backend layer)
   - `AuthProvider` manages auth state and user profiles
   - `AppContent` checks auth state via `useAuth()` hook
   - Shows loading screen, login, or appropriate dashboard based on `user.tipo`
3. **Dashboard Routing**: Based on `user.tipo` field:
   - `admin` → `AdminDashboard`
   - `enterprise` → `EnterpriseDashboard`
   - `conductor` → `ConductorDashboard`

### Context Architecture (Nested Provider Pattern)

The app uses **domain-specific context providers** that wrap all dashboard content. All providers follow the same pattern: they expose data, loading states, CRUD operations, and statistics functions.

**Provider nesting order** (defined in `App.jsx`):
```jsx
<ClerkProvider>                    // Outermost - Clerk authentication
  <ConvexProviderWithClerk>        // Convex backend + Clerk integration
    <AuthProvider>                 // Auth state management + user profiles
      <RiskReportsProvider>        // Risk/alert reporting system
        <PersonnelProvider>        // Employee/personnel management
          <FleetProvider>          // Vehicle/fleet tracking
            <RoutesProvider>       // Route assignments & tracking
              <ReportsProvider>    // Report generation
                <InventoryProvider>  // Material/supply inventory
                  <ScheduleProvider> // Scheduling system
                    <CleaningProvider>     // Cleaning service assignments
                      <MaintenanceProvider> // Equipment maintenance
                        {dashboardContent}
```

**How to use contexts:**
```javascript
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Auth context
const { user, loading, signIn, signOut } = useAuth();

// Convex queries and mutations
const vehicles = useQuery(api.vehiculos.list);
const addVehicle = useMutation(api.vehiculos.create);
```

### Authentication System

**Auth Provider**: `src/context/AuthContext.jsx`

**Technology Stack**:
- **Clerk**: Third-party auth service (production-ready, recommended by Convex)
- **Convex**: Backend database and real-time sync
- Integration via `ConvexProviderWithClerk` + JWT tokens

**Key Features**:
- Managed authentication via Clerk (no manual JWT configuration)
- Session persistence handled by Clerk automatically
- Profile loading from Convex `perfiles_usuarios` table with related data
- Real-time sync between Clerk auth and Convex profiles
- Password strength validation and breach detection

**User Object Structure**:
```javascript
{
  _id: ConvexId,           // Convex document ID
  id: ConvexId,            // Alias for _id
  email: string,
  nombre: string,          // nombre_completo from perfiles_usuarios
  nombre_completo: string,
  tipo: 'admin' | 'enterprise' | 'conductor',
  tipo_usuario: string,    // Same as tipo
  telefono: string,
  documento: string,
  foto_url: string,
  vehiculo_asignado_id: ConvexId,
  vehiculo_placa: string,  // Joined from vehiculos table
  camionAsignado: ConvexId, // Alias for vehiculo_asignado_id
  proyecto_id: ConvexId,
  proyecto_nombre: string, // Joined from proyectos table
  activo: boolean
}
```

**Methods exposed by `useAuth()`**:
- `signIn(email, password)` - Authenticate user via Clerk
- `signUp(email, password, userData)` - Create Clerk user + Convex profile
- `signOut()` - Log out from Clerk
- `updateProfile(updates)` - Update user profile in Convex
- `user` - Current authenticated user object
- `loading` - Loading state

### Data Layer

**Primary Backend**: Convex (Real-time database + serverless functions)
- **Schema**: `convex/schema.ts` - TypeScript schema definitions
- **Functions**: `convex/*.ts` - Queries and mutations (serverless functions)
- **Connection**: Configured via `VITE_CONVEX_URL` in `.env.local`

**Convex Client Pattern**:
- Uses **React hooks** from `convex/react`:
  - `useQuery(api.table.functionName, args)` - Read data reactively
  - `useMutation(api.table.functionName)` - Write data
- **Serverless functions** in `convex/` directory define all data operations
- **TypeScript** with full type safety via generated types in `convex/_generated/`
- **Real-time subscriptions** - UI automatically updates when data changes

**Example Usage**:
```javascript
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Query (reactive, auto-updates)
const vehicles = useQuery(api.vehiculos.list);

// Mutation
const createVehicle = useMutation(api.vehiculos.create);
await createVehicle({ placa: 'ABC-123', ... });
```

**Demo Mode**:
- Hook: `src/hooks/useDemoMode.js`
- Demo data: `src/utils/demoData.js` (DEMO_VEHICLES, DEMO_ROUTES, etc.)
- Components can toggle demo mode to show sample data without Convex
- Mock data fallback: `src/data/mockData.js` (legacy)

### Database Schema

**Key Tables** (see `convex/schema.ts` for full schema):

1. **perfiles_usuarios** - User profiles (linked to Clerk users)
   - `userId`: string (Clerk tokenIdentifier: `https://clerk-domain|user_id`)
   - `tipo_usuario`: 'admin' | 'enterprise' | 'conductor'
   - `vehiculo_asignado_id` → vehiculos(_id)
   - `proyecto_id` → proyectos(_id)
   - Indexes: `by_user`, `by_tipo`, `by_email`

2. **vehiculos** - Fleet/vehicle management
   - GPS tracking: `gps_latitud`, `gps_longitud`
   - Status: `estado` ('disponible', 'en_ruta', 'en_mantenimiento')
   - Service type: `tipo_servicio` ('recoleccion', 'fumigacion')

3. **rutas** - Routes/collection paths
   - `paradas`: JSONB array of stops
   - `estado`: 'pendiente', 'en_progreso', 'completada', 'cancelada'
   - `tipo_servicio`: matches vehicle types

4. **asignaciones_rutas** - Route assignments (conductor + vehicle + route)
   - Links: `conductor_id`, `vehiculo_id`, `ruta_id`
   - Tracking: `fecha_inicio`, `fecha_completacion`, `paradas_completadas` (JSONB)

5. **route_progress** - Real-time route tracking
   - Active route state: `estado` ('en_progreso', 'completada')
   - Progress tracking: `paradas_completadas`, `posicion_actual` (JSONB)
   - Links to `route_reports` on completion

6. **route_reports** - Completed route summaries
   - Performance metrics: `tiempo_total_segundos`, `paradas_completadas` (JSONB)
   - Risk links: `reportes_riesgo_ids` (array of UUIDs)

7. **empleados** - Personnel/employee records
   - Soft delete: `activo` boolean
   - Fields: `nombre`, `apellido`, `cedula`, `cargo`, `salario`, `departamento`

8. **reportes_riesgo** - Risk/incident reports
   - `tipo_riesgo`: 'seguridad', 'operacional', 'ambiental', 'equipo'
   - `nivel_severidad`: 'bajo', 'medio', 'alto', 'crítico'
   - Links: `empleado_reporta_id`, `proyecto_id`, `vehiculo_id`, `ruta_id`

9. **proyectos** - Projects/contracts (enterprise level)
   - Grouping entity for vehicles, routes, personnel

10. **Cleaning Module** (see `cleaning_schema.sql`):
    - `salas` - Locations/facilities
    - `areas` - Specific areas within locations
    - `cleaning_assignments` - Scheduled cleaning tasks
    - `cleaning_photos` - Evidence photos (antes/durante/después)
    - Storage bucket: `cleaning-photos` for images

11. **Schedule Module** (`schedule_schema.sql`):
    - `services` - Service type definitions (cleaning, fumigation, etc.)
    - `schedule_templates` - Recurring schedule patterns
    - `scheduled_events` - Specific scheduled events

12. **inventario** - Inventory/supplies management
    - Tracking: `cantidad_disponible`, `cantidad_minima`, `cantidad_maxima`
    - `tipo_articulo`: 'herramienta', 'insumo', 'equipo', 'uniforme'

### Component Architecture

**Dashboard Structure** (all 3 dashboards follow this pattern):
- Tab-based navigation (sidebar + content area)
- Each tab renders a specialized component (e.g., `RoutesComponent`, `FleetManagement`)
- Dashboards consume context hooks and pass data to child components
- Real-time data via Convex subscriptions (automatic via useQuery)

**Key Component Categories**:

1. **Dashboard Components** (`src/components/Dashboard/`)
   - `DashboardKPI` - KPI stat cards
   - `VehicleCard` - Vehicle status card with map preview
   - `PersonnelTable` - Personnel list table
   - `RiskAlerts` - Alert/risk display
   - `HeroStats` - Large hero statistics display
   - `RealtimeActivity` - Activity feed

2. **Map Components** (`src/components/Map/`)
   - `MapComponent` - Main Leaflet map wrapper
   - `MapLocationPicker` - Interactive location picker modal
   - Uses `react-leaflet` for React integration
   - Default center: Panama City (8.983333, -79.516670)

3. **Domain Components** (one per feature area):
   - `Personnel/PersonnelComponent` - Employee management
   - `Fleet/FleetManagement` - Vehicle fleet tracking
   - `Routes/RoutesComponent` - Route creation & assignment
   - `Risk/RiskComponent` - Risk/alert reporting
   - `Reports/ReportsComponent` - PDF report generation (uses `pdfmake`)
   - `Inventory/InventoryComponent` - Inventory tracking
   - `Schedule/ScheduleComponent` - Service scheduling
   - `Cleaning/CleaningComponent` - Cleaning assignments
   - `Maintenance/MaintenanceComponent` - Maintenance tracking
   - `Calendar/CalendarComponent` - Calendar view of all activities
   - `Costos/CostosComponent` - Cost/budget tracking

4. **Modal Components**:
   - `RouteModal` - Create/edit routes
   - `WeightModal` - Record waste collection weight
   - `RouteCompletionModal` - Complete route with summary
   - `CleaningModal` - Create cleaning assignment
   - `PhotosModal` - View uploaded photos

5. **UI Components** (`src/components/UI/`)
   - `Badge`, `ProgressBar` - Shared UI primitives
   - Icons: Uses `lucide-react` (imported via `src/components/Icons/index.js`)

**Component File Pattern**:
- Each major component has its own directory with:
  - `ComponentName.jsx` - Main component
  - `ComponentName.css` - Scoped styles
  - `index.js` - Barrel export

### Styling System

**CSS Architecture**:
- **Global styles**: `src/styles/index.css` (CSS Custom Properties design system)
- **Component styles**: Co-located `.css` files (e.g., `AdminDashboard.css`)
- **Design tokens**: CSS variables defined in `:root` (colors, typography, spacing)

**Key CSS Variables** (from `src/styles/index.css`):
- Colors: `--color-primary` (olive green #3D5229), `--color-success`, `--color-error`, etc.
- Typography: Apple-inspired (`--font-family-base` = SF Pro-style stack)
- Spacing: `--space-xs` through `--space-6xl`
- Dark mode: Automatic via `@media (prefers-color-scheme: dark)` with color overrides

**Design Philosophy**:
- Apple-inspired modern minimalist design
- Professional olive green palette (eco/waste management theme)
- Responsive, mobile-friendly layouts
- Consistent spacing scale, border radius, shadows

### Key Technologies

- **React 18** - UI framework (functional components + hooks)
- **Vite** - Build tool and dev server
- **Convex** - Backend (real-time database + serverless functions)
  - `convex` v1.28.0
  - TypeScript-based schema and functions
- **Clerk** - Authentication service (production-ready)
  - `@clerk/clerk-react` v5.53.4
  - Integrated with Convex via `convex/react-clerk`
- **Leaflet + React-Leaflet** - Interactive maps (GPS tracking)
- **pdfmake** - Client-side PDF generation for reports
- **lucide-react** - Icon library (modern, tree-shakeable)
- **ESLint** - Code linting (React-specific rules)

### State Management Pattern

- **No global state library** (no Redux/Zustand)
- **React Context API** for domain state (9 context providers)
- **Local component state** (`useState`) for UI state
- **Derived state** via `useMemo` for computed values (e.g., statistics)
- **Convex** serves as source of truth for server state (with automatic real-time sync)

### Real-time Features

- **GPS Tracking**: Vehicle positions updated in `vehiculos` table
- **Route Progress**: Live tracking via `route_progress` table
- **Automatic Real-time Sync**: Convex `useQuery` hooks automatically re-render when data changes
- **Activity Feed**: Recent actions shown in dashboard
- **Live Dashboard Updates**: All statistics and lists update in real-time without manual refresh

## Development Patterns & Best Practices

### When Adding New Features

1. **For new data entities**:
   - Define table in `convex/schema.ts` with proper indexes
   - Create serverless functions in `convex/tableName.ts` (queries and mutations)
   - Create context provider in `src/context/` using `useQuery` and `useMutation`
   - Add provider to nesting in `App.jsx`
   - Example:
   ```typescript
   // convex/myEntity.ts
   export const list = query({
     handler: async (ctx) => {
       return await ctx.db.query("myEntity").collect();
     },
   });

   export const create = mutation({
     args: { name: v.string() },
     handler: async (ctx, args) => {
       return await ctx.db.insert("myEntity", args);
     },
   });
   ```

2. **For new UI components**:
   - Create directory in `src/components/` with `Component.jsx` + `Component.css` + `index.js`
   - Import icons from `src/components/Icons/index.js`
   - Use CSS variables for styling (defined in `src/styles/index.css`)
   - Make responsive (mobile-first)

3. **For new dashboard tabs**:
   - Add tab to sidebar config in dashboard component
   - Create component for tab content
   - Consume necessary context hooks
   - Follow existing tab component patterns

### Common Gotchas

- **Port conflicts**: Dev server uses port 8000 (not 5173)
- **Cache issues**: Run `npm run clean` if seeing stale code
- **Auth persistence**: Clerk manages sessions automatically via cookies
- **Clerk tokenIdentifier format**: Always use `https://clerk-domain|user_id` format when creating profiles
- **Optional fields in Convex**: Use `undefined` or omit field, never `null` (will fail validation)
- **Password strength**: Clerk validates against known breaches - use strong passwords (uppercase, lowercase, numbers, symbols)
- **Email verification**: Disable "Verify at sign-up" in Clerk dashboard for development
- **Soft deletes**: Employees use `activo` flag, not hard delete
- **File uploads**: Convex file storage for cleaning photos
- **Demo mode**: Some components show demo data when `isDemoMode` is true
- **Convex Dev**: Must be running (`npx convex dev`) for local development

### Testing Credentials

Test users created via SeedUsers component:
- **Admin**: `admin@rmp.com` / `Admin@RMP2025!`
- **Enterprise**: `enterprise@rmp.com` / `Enterprise@RMP2025!`
- **Conductor**: `conductor@rmp.com` / `Conductor@RMP2025!`

To seed users: Visit `http://localhost:8000/?seed` or use the SeedUsers component.

### Important Files to Check Before Making Changes

- `src/App.jsx` - Provider nesting order, dashboard routing
- `src/context/AuthContext.jsx` - Auth flow (Clerk), user object shape
- `convex/schema.ts` - Database schema, table definitions, indexes
- `convex/*.ts` - Serverless functions (queries and mutations)
- `convex/auth.config.ts` - Clerk + Convex integration config
- `src/utils/demoData.js` - Demo data structure (mirrors real data shape)
- `src/styles/index.css` - Design tokens (colors, spacing, typography)

### Code Style Notes

- **Imports**: Group by category (React, external libs, local components, contexts, utils, styles, icons)
- **Component structure**: Props → Hooks → Derived state → Handlers → Render helpers → JSX
- **Naming**:
  - Components: PascalCase
  - Hooks: camelCase with `use` prefix
  - Constants: SCREAMING_SNAKE_CASE
  - Files: PascalCase for components, camelCase for utils
- **Console logs**: Extensive debug logging with emoji prefixes (🔐, ✅, ❌, 🔄, etc.) - keep these for debugging

### Clerk & Convex Configuration

**Clerk Setup**:
- **Dashboard**: https://dashboard.clerk.com
- **Domain**: `https://peaceful-mustang-86.clerk.accounts.dev`
- **Publishable Key**: Set in `.env.local` as `VITE_CLERK_PUBLISHABLE_KEY`
- **JWT Template**:
  - Name: `convex`
  - Issuer (iss): Clerk domain URL
  - Subject (sub): `{{user.id}}`
  - Required for Convex integration
- **Email Settings**: Disable "Verify at sign-up" for development

**Convex Setup**:
- **Deployment URL**: Set in `.env.local` as `VITE_CONVEX_URL`
- **Auth Config**: `convex/auth.config.ts` with Clerk domain
- **Local Dev**: Run `npx convex dev` in separate terminal
- **Schema**: TypeScript definitions in `convex/schema.ts`
- **Functions**: Serverless queries/mutations in `convex/*.ts` files
- **File Storage**: Built-in Convex storage (`.db.storage`)

### Performance Considerations

- **Polling**: Vite watch uses polling (may be slow on Windows)
- **HMR**: Hot Module Replacement enabled but overlay disabled
- **Caching**:
  - Development: No caching (`Cache-Control: no-store`)
  - Production: Aggressive caching (`max-age=31536000`)
- **Bundle optimization**: `manualChunks: undefined` for simpler bundle analysis
- **Convex Real-time**: Automatic subscriptions via WebSocket - very efficient
- **Query Caching**: Convex handles query deduplication and caching automatically

## Project Context (Tender Requirements)

The system was built to meet Panama municipal tender requirements (documented in `.cursor/rules/backlog.mdc`):

**Key Requirements**:
1. GPS monitoring of waste collection vehicles in real-time
2. Route tracking with collection point logging and estimated volume
3. Automated operational reports (volume, route compliance, service frequency)
4. Active technical support and maintenance plan
5. **Live demonstration capability** (no static screenshots/videos accepted)
6. Digital supervision of cleaning, disinfection, waste collection, and fumigation services
7. Planning, tracking, and control of:
   - Personnel management
   - Material/supply usage
   - Equipment assignment and monitoring
   - Route/vehicle coordination
   - Site/location administration
   - Risk analysis
   - Inventory and cost control
   - Detailed productivity and performance reports

**Compliance Notes**:
- System must be operational (not a prototype)
- Must demonstrate real-time functionality during presentation
- Multi-service support (cleaning, waste, fumigation, maintenance)
- Full operational traceability and reporting

## Future Roadmap

- [ ] Migrate remaining context providers to use Convex queries/mutations directly
- [ ] Migrate to TypeScript (convex/ already uses TypeScript)
- [ ] Add unit tests
- [ ] Implement global state management (Zustand/Redux) - *Note: May not be needed given current Context architecture*
- [x] Connect with real-time API updates - **DONE** via Convex
- [ ] Add PWA capabilities
- [x] Implement JWT authentication - **DONE** via Clerk + Convex

---

**When in doubt**: Follow existing patterns. Each context provider, component, and dashboard follows a consistent structure. Use existing code as reference templates.
