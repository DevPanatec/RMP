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
import type * as checkVehicles from "../checkVehicles.js";
import type * as cleaning from "../cleaning.js";
import type * as createTestVehicle from "../createTestVehicle.js";
import type * as crons from "../crons.js";
import type * as debugMultiProyecto from "../debugMultiProyecto.js";
import type * as debugVehicle from "../debugVehicle.js";
import type * as empleados from "../empleados.js";
import type * as files from "../files.js";
import type * as fumigaciones from "../fumigaciones.js";
import type * as geofenceAlerts from "../geofenceAlerts.js";
import type * as geofences from "../geofences.js";
import type * as gps from "../gps.js";
import type * as http from "../http.js";
import type * as inventario from "../inventario.js";
import type * as lib_auth from "../lib/auth.js";
import type * as listVehicles from "../listVehicles.js";
import type * as maintenance from "../maintenance.js";
import type * as organizaciones from "../organizaciones.js";
import type * as perfiles from "../perfiles.js";
import type * as proyectos from "../proyectos.js";
import type * as reportes_riesgo from "../reportes_riesgo.js";
import type * as route_events from "../route_events.js";
import type * as route_progress from "../route_progress.js";
import type * as route_reports from "../route_reports.js";
import type * as rutas from "../rutas.js";
import type * as safetag from "../safetag.js";
import type * as seed from "../seed.js";
import type * as seedVolumePresets from "../seedVolumePresets.js";
import type * as seed_migrateToMultiProject from "../seed/migrateToMultiProject.js";
import type * as seed_migrateToOrganizations from "../seed/migrateToOrganizations.js";
import type * as setupWebhookVehicle from "../setupWebhookVehicle.js";
import type * as testLocationHistory from "../testLocationHistory.js";
import type * as testSafeTagAPI from "../testSafeTagAPI.js";
import type * as testSafeTagAPI2 from "../testSafeTagAPI2.js";
import type * as testSafeTagAPI3 from "../testSafeTagAPI3.js";
import type * as testSafeTagFull from "../testSafeTagFull.js";
import type * as testTimestampFix from "../testTimestampFix.js";
import type * as testWebhook from "../testWebhook.js";
import type * as updateVehicleIMEI from "../updateVehicleIMEI.js";
import type * as vehicleHistory from "../vehicleHistory.js";
import type * as vehiculos from "../vehiculos.js";
import type * as webhookStatus from "../webhookStatus.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  asignaciones: typeof asignaciones;
  checkVehicles: typeof checkVehicles;
  cleaning: typeof cleaning;
  createTestVehicle: typeof createTestVehicle;
  crons: typeof crons;
  debugMultiProyecto: typeof debugMultiProyecto;
  debugVehicle: typeof debugVehicle;
  empleados: typeof empleados;
  files: typeof files;
  fumigaciones: typeof fumigaciones;
  geofenceAlerts: typeof geofenceAlerts;
  geofences: typeof geofences;
  gps: typeof gps;
  http: typeof http;
  inventario: typeof inventario;
  "lib/auth": typeof lib_auth;
  listVehicles: typeof listVehicles;
  maintenance: typeof maintenance;
  organizaciones: typeof organizaciones;
  perfiles: typeof perfiles;
  proyectos: typeof proyectos;
  reportes_riesgo: typeof reportes_riesgo;
  route_events: typeof route_events;
  route_progress: typeof route_progress;
  route_reports: typeof route_reports;
  rutas: typeof rutas;
  safetag: typeof safetag;
  seed: typeof seed;
  seedVolumePresets: typeof seedVolumePresets;
  "seed/migrateToMultiProject": typeof seed_migrateToMultiProject;
  "seed/migrateToOrganizations": typeof seed_migrateToOrganizations;
  setupWebhookVehicle: typeof setupWebhookVehicle;
  testLocationHistory: typeof testLocationHistory;
  testSafeTagAPI: typeof testSafeTagAPI;
  testSafeTagAPI2: typeof testSafeTagAPI2;
  testSafeTagAPI3: typeof testSafeTagAPI3;
  testSafeTagFull: typeof testSafeTagFull;
  testTimestampFix: typeof testTimestampFix;
  testWebhook: typeof testWebhook;
  updateVehicleIMEI: typeof updateVehicleIMEI;
  vehicleHistory: typeof vehicleHistory;
  vehiculos: typeof vehiculos;
  webhookStatus: typeof webhookStatus;
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
