/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as asignaciones from "../asignaciones.js";
import type * as asistencia_cambiosTurno from "../asistencia/cambiosTurno.js";
import type * as asistencia_facial from "../asistencia/facial.js";
import type * as asistencia_horarios from "../asistencia/horarios.js";
import type * as asistencia_horasExtras from "../asistencia/horasExtras.js";
import type * as asistencia_jornadas from "../asistencia/jornadas.js";
import type * as asistencia_jornadasCron from "../asistencia/jornadasCron.js";
import type * as asistencia_kioscos from "../asistencia/kioscos.js";
import type * as asistencia_marcacion from "../asistencia/marcacion.js";
import type * as asistencia_permisos from "../asistencia/permisos.js";
import type * as asistencia_pin from "../asistencia/pin.js";
import type * as asistencia_reportes from "../asistencia/reportes.js";
import type * as asistencia_retention from "../asistencia/retention.js";
import type * as asistencia_turnosCalendario from "../asistencia/turnosCalendario.js";
import type * as asistencia_zonas from "../asistencia/zonas.js";
import type * as cleaning from "../cleaning.js";
import type * as crawler from "../crawler.js";
import type * as crawlerIngest from "../crawlerIngest.js";
import type * as crawlerQueries from "../crawlerQueries.js";
import type * as cronograma from "../cronograma.js";
import type * as crons from "../crons.js";
import type * as diagramEngine from "../diagramEngine.js";
import type * as diagramInference from "../diagramInference.js";
import type * as diagramVersions from "../diagramVersions.js";
import type * as e2e from "../e2e.js";
import type * as empleados from "../empleados.js";
import type * as enrichment from "../enrichment.js";
import type * as enrichmentMutations from "../enrichmentMutations.js";
import type * as enrichmentQueries from "../enrichmentQueries.js";
import type * as files from "../files.js";
import type * as fleetInventory from "../fleetInventory.js";
import type * as fumigaciones from "../fumigaciones.js";
import type * as geofences from "../geofences.js";
import type * as gps from "../gps.js";
import type * as http from "../http.js";
import type * as ingestion from "../ingestion.js";
import type * as ingestionMutations from "../ingestionMutations.js";
import type * as integrations_doeAfdc from "../integrations/doeAfdc.js";
import type * as integrations_internetArchive from "../integrations/internetArchive.js";
import type * as integrations_nhtsaVpic from "../integrations/nhtsaVpic.js";
import type * as integrations_oemBrochures from "../integrations/oemBrochures.js";
import type * as integrations_oemSeeds from "../integrations/oemSeeds.js";
import type * as integrations_vincario from "../integrations/vincario.js";
import type * as integrations_wikidata from "../integrations/wikidata.js";
import type * as inventario from "../inventario.js";
import type * as kbAudit from "../kbAudit.js";
import type * as kbBudget from "../kbBudget.js";
import type * as kbConflicts from "../kbConflicts.js";
import type * as kbCrawlQueue from "../kbCrawlQueue.js";
import type * as kbDailySummary from "../kbDailySummary.js";
import type * as kbDedup from "../kbDedup.js";
import type * as kbDiscovery from "../kbDiscovery.js";
import type * as kbDiscoveryQueries from "../kbDiscoveryQueries.js";
import type * as kbIntegrity from "../kbIntegrity.js";
import type * as kbSources from "../kbSources.js";
import type * as kbStaleDetection from "../kbStaleDetection.js";
import type * as kbStaleDetectionMutations from "../kbStaleDetectionMutations.js";
import type * as kbStaleDetectionQueries from "../kbStaleDetectionQueries.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_gps from "../lib/gps.js";
import type * as lib_limits from "../lib/limits.js";
import type * as lib_modules from "../lib/modules.js";
import type * as maintenance from "../maintenance.js";
import type * as makes from "../makes.js";
import type * as meterReadings from "../meterReadings.js";
import type * as migrations_seed_plan_fields from "../migrations/seed_plan_fields.js";
import type * as modelYears from "../modelYears.js";
import type * as models from "../models.js";
import type * as nomina_calculo from "../nomina/calculo.js";
import type * as nomina_lineas from "../nomina/lineas.js";
import type * as nomina_periodos from "../nomina/periodos.js";
import type * as oemDocuments from "../oemDocuments.js";
import type * as organizaciones from "../organizaciones.js";
import type * as perfiles from "../perfiles.js";
import type * as photoRefinement from "../photoRefinement.js";
import type * as photoRefinementQueries from "../photoRefinementQueries.js";
import type * as pmSchedules from "../pmSchedules.js";
import type * as proyectos from "../proyectos.js";
import type * as reportes_riesgo from "../reportes_riesgo.js";
import type * as route_events from "../route_events.js";
import type * as route_progress from "../route_progress.js";
import type * as route_reports from "../route_reports.js";
import type * as rrhh_adendas from "../rrhh/adendas.js";
import type * as rrhh_contratos from "../rrhh/contratos.js";
import type * as rrhh_salarioHistorico from "../rrhh/salarioHistorico.js";
import type * as rutas from "../rutas.js";
import type * as safetag from "../safetag.js";
import type * as seed from "../seed.js";
import type * as seedReports from "../seedReports.js";
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
  activity: typeof activity;
  asignaciones: typeof asignaciones;
  "asistencia/cambiosTurno": typeof asistencia_cambiosTurno;
  "asistencia/facial": typeof asistencia_facial;
  "asistencia/horarios": typeof asistencia_horarios;
  "asistencia/horasExtras": typeof asistencia_horasExtras;
  "asistencia/jornadas": typeof asistencia_jornadas;
  "asistencia/jornadasCron": typeof asistencia_jornadasCron;
  "asistencia/kioscos": typeof asistencia_kioscos;
  "asistencia/marcacion": typeof asistencia_marcacion;
  "asistencia/permisos": typeof asistencia_permisos;
  "asistencia/pin": typeof asistencia_pin;
  "asistencia/reportes": typeof asistencia_reportes;
  "asistencia/retention": typeof asistencia_retention;
  "asistencia/turnosCalendario": typeof asistencia_turnosCalendario;
  "asistencia/zonas": typeof asistencia_zonas;
  cleaning: typeof cleaning;
  crawler: typeof crawler;
  crawlerIngest: typeof crawlerIngest;
  crawlerQueries: typeof crawlerQueries;
  cronograma: typeof cronograma;
  crons: typeof crons;
  diagramEngine: typeof diagramEngine;
  diagramInference: typeof diagramInference;
  diagramVersions: typeof diagramVersions;
  e2e: typeof e2e;
  empleados: typeof empleados;
  enrichment: typeof enrichment;
  enrichmentMutations: typeof enrichmentMutations;
  enrichmentQueries: typeof enrichmentQueries;
  files: typeof files;
  fleetInventory: typeof fleetInventory;
  fumigaciones: typeof fumigaciones;
  geofences: typeof geofences;
  gps: typeof gps;
  http: typeof http;
  ingestion: typeof ingestion;
  ingestionMutations: typeof ingestionMutations;
  "integrations/doeAfdc": typeof integrations_doeAfdc;
  "integrations/internetArchive": typeof integrations_internetArchive;
  "integrations/nhtsaVpic": typeof integrations_nhtsaVpic;
  "integrations/oemBrochures": typeof integrations_oemBrochures;
  "integrations/oemSeeds": typeof integrations_oemSeeds;
  "integrations/vincario": typeof integrations_vincario;
  "integrations/wikidata": typeof integrations_wikidata;
  inventario: typeof inventario;
  kbAudit: typeof kbAudit;
  kbBudget: typeof kbBudget;
  kbConflicts: typeof kbConflicts;
  kbCrawlQueue: typeof kbCrawlQueue;
  kbDailySummary: typeof kbDailySummary;
  kbDedup: typeof kbDedup;
  kbDiscovery: typeof kbDiscovery;
  kbDiscoveryQueries: typeof kbDiscoveryQueries;
  kbIntegrity: typeof kbIntegrity;
  kbSources: typeof kbSources;
  kbStaleDetection: typeof kbStaleDetection;
  kbStaleDetectionMutations: typeof kbStaleDetectionMutations;
  kbStaleDetectionQueries: typeof kbStaleDetectionQueries;
  "lib/auth": typeof lib_auth;
  "lib/geo": typeof lib_geo;
  "lib/gps": typeof lib_gps;
  "lib/limits": typeof lib_limits;
  "lib/modules": typeof lib_modules;
  maintenance: typeof maintenance;
  makes: typeof makes;
  meterReadings: typeof meterReadings;
  "migrations/seed_plan_fields": typeof migrations_seed_plan_fields;
  modelYears: typeof modelYears;
  models: typeof models;
  "nomina/calculo": typeof nomina_calculo;
  "nomina/lineas": typeof nomina_lineas;
  "nomina/periodos": typeof nomina_periodos;
  oemDocuments: typeof oemDocuments;
  organizaciones: typeof organizaciones;
  perfiles: typeof perfiles;
  photoRefinement: typeof photoRefinement;
  photoRefinementQueries: typeof photoRefinementQueries;
  pmSchedules: typeof pmSchedules;
  proyectos: typeof proyectos;
  reportes_riesgo: typeof reportes_riesgo;
  route_events: typeof route_events;
  route_progress: typeof route_progress;
  route_reports: typeof route_reports;
  "rrhh/adendas": typeof rrhh_adendas;
  "rrhh/contratos": typeof rrhh_contratos;
  "rrhh/salarioHistorico": typeof rrhh_salarioHistorico;
  rutas: typeof rutas;
  safetag: typeof safetag;
  seed: typeof seed;
  seedReports: typeof seedReports;
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
