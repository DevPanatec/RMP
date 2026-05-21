/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as asignaciones from "../asignaciones.js";
import type * as cleaning from "../cleaning.js";
import type * as crons from "../crons.js";
import type * as diagramEngine from "../diagramEngine.js";
import type * as e2e from "../e2e.js";
import type * as empleados from "../empleados.js";
import type * as files from "../files.js";
import type * as fleetInventory from "../fleetInventory.js";
import type * as fumigaciones from "../fumigaciones.js";
import type * as geofences from "../geofences.js";
import type * as gps from "../gps.js";
import type * as http from "../http.js";
import type * as inventario from "../inventario.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_gps from "../lib/gps.js";
import type * as lib_limits from "../lib/limits.js";
import type * as lib_modules from "../lib/modules.js";
import type * as maintenance from "../maintenance.js";
import type * as meterReadings from "../meterReadings.js";
import type * as migrations_seed_plan_fields from "../migrations/seed_plan_fields.js";
import type * as organizaciones from "../organizaciones.js";
import type * as perfiles from "../perfiles.js";
import type * as pmSchedules from "../pmSchedules.js";
import type * as proyectos from "../proyectos.js";
import type * as reportes_riesgo from "../reportes_riesgo.js";
import type * as route_events from "../route_events.js";
import type * as route_progress from "../route_progress.js";
import type * as route_reports from "../route_reports.js";
import type * as rutas from "../rutas.js";
import type * as safetag from "../safetag.js";
import type * as seed from "../seed.js";
import type * as seed_migrateToMultiProject from "../seed/migrateToMultiProject.js";
import type * as seed_migrateToOrganizations from "../seed/migrateToOrganizations.js";
import type * as vehicleHistory from "../vehicleHistory.js";
import type * as vehiculos from "../vehiculos.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  asignaciones: typeof asignaciones;
  cleaning: typeof cleaning;
  crons: typeof crons;
  diagramEngine: typeof diagramEngine;
  e2e: typeof e2e;
  empleados: typeof empleados;
  files: typeof files;
  fleetInventory: typeof fleetInventory;
  fumigaciones: typeof fumigaciones;
  geofences: typeof geofences;
  gps: typeof gps;
  http: typeof http;
  inventario: typeof inventario;
  "lib/auth": typeof lib_auth;
  "lib/gps": typeof lib_gps;
  "lib/limits": typeof lib_limits;
  "lib/modules": typeof lib_modules;
  maintenance: typeof maintenance;
  meterReadings: typeof meterReadings;
  "migrations/seed_plan_fields": typeof migrations_seed_plan_fields;
  organizaciones: typeof organizaciones;
  perfiles: typeof perfiles;
  pmSchedules: typeof pmSchedules;
  proyectos: typeof proyectos;
  reportes_riesgo: typeof reportes_riesgo;
  route_events: typeof route_events;
  route_progress: typeof route_progress;
  route_reports: typeof route_reports;
  rutas: typeof rutas;
  safetag: typeof safetag;
  seed: typeof seed;
  "seed/migrateToMultiProject": typeof seed_migrateToMultiProject;
  "seed/migrateToOrganizations": typeof seed_migrateToOrganizations;
  vehicleHistory: typeof vehicleHistory;
  vehiculos: typeof vehiculos;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
