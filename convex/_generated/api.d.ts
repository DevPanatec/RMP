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
import type * as empleados from "../empleados.js";
import type * as files from "../files.js";
import type * as fumigaciones from "../fumigaciones.js";
import type * as inventario from "../inventario.js";
import type * as maintenance from "../maintenance.js";
import type * as perfiles from "../perfiles.js";
import type * as proyectos from "../proyectos.js";
import type * as reportes_riesgo from "../reportes_riesgo.js";
import type * as route_progress from "../route_progress.js";
import type * as route_reports from "../route_reports.js";
import type * as rutas from "../rutas.js";
import type * as seed from "../seed.js";
import type * as vehiculos from "../vehiculos.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  asignaciones: typeof asignaciones;
  cleaning: typeof cleaning;
  empleados: typeof empleados;
  files: typeof files;
  fumigaciones: typeof fumigaciones;
  inventario: typeof inventario;
  maintenance: typeof maintenance;
  perfiles: typeof perfiles;
  proyectos: typeof proyectos;
  reportes_riesgo: typeof reportes_riesgo;
  route_progress: typeof route_progress;
  route_reports: typeof route_reports;
  rutas: typeof rutas;
  seed: typeof seed;
  vehiculos: typeof vehiculos;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
