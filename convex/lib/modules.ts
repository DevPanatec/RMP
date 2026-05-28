// Module catalog + gating helpers.
// Fuente: propuestas/RMP_FINDINGS.html sección Módulos.

import { getAuthScope, type Ctx } from "./auth";

export type ModuloCodigo =
  | "REC" | "FUM" | "LIM" | "MTO" | "INV"
  | "BI"
  | "ASI" | "RRHH" | "NOM"
  // Legacy: PER se conserva en el tipo para backward-compat con orgs antiguas;
  // ya no es un módulo comprable. El acceso a Personal se deriva de REC|FUM|LIM|MTO.
  | "PER" | "PER-full";

export type ModuloEstado = "produccion" | "roadmap";

export interface ModuloSpec {
  codigo: ModuloCodigo;
  nombre: string;
  descripcion: string;
  precio_usd: number;
  estado: ModuloEstado;
}

export const MODULO_CATALOG: Record<ModuloCodigo, ModuloSpec> = {
  REC: {
    codigo: "REC",
    nombre: "Recolección",
    descripcion: "Categoría carga, weight tracking, métricas volumen, alertas operacionales",
    precio_usd: 500,
    estado: "produccion",
  },
  FUM: {
    codigo: "FUM",
    nombre: "Fumigación",
    descripcion: "Lugares, assignments con validación frecuencia, fotos, reports, productos",
    precio_usd: 500,
    estado: "produccion",
  },
  LIM: {
    codigo: "LIM",
    nombre: "Limpieza",
    descripcion: "Salas + áreas, assignments, fotos antes/durante/después, reports",
    precio_usd: 400,
    estado: "produccion",
  },
  MTO: {
    codigo: "MTO",
    nombre: "Mantenimiento general",
    descripcion: "Tareas técnicas (vehículos/equipos/instalaciones), mecánico, costo, fotos",
    precio_usd: 400,
    estado: "produccion",
  },
  INV: {
    codigo: "INV",
    nombre: "Inventario",
    descripcion: "Items con códigos auto, multi-ubicación, movimientos compra/asignación/consumo",
    precio_usd: 300,
    estado: "produccion",
  },
  // PER eliminado como módulo comprable. Personal (empleados) se desbloquea
  // automáticamente cuando la org activa cualquier módulo operacional (REC/FUM/LIM/MTO).
  // El entry se mantiene aquí solo para backward-compat con datos legacy.
  PER: {
    codigo: "PER",
    nombre: "Empleados básico (legacy)",
    descripcion: "Bundled con módulos operacionales — ya no se cobra por separado.",
    precio_usd: 0,
    estado: "roadmap" as ModuloEstado, // ocultar en UI
  },
  // BI = Reports section actual (Dashboard + Recolección + Fumigación + Limpieza +
  // Mantenimiento). Cualquier feature nueva del módulo Reportes (exports avanzados,
  // KPIs custom, dashboards analíticos) debe gatearse con requireModulo(ctx, "BI")
  // en backend + hasModulo('BI') en frontend.
  BI: {
    codigo: "BI",
    nombre: "Reportes avanzados",
    descripcion: "Sección Reports completa: dashboards consolidados, tabs por servicio (REC/FUM/LIM/MTO), generación PDF profesional con fotos + mapas. Futuros: exports CSV/Excel, KPIs custom, programación reportes automáticos.",
    precio_usd: 600,
    estado: "produccion",
  },
  ASI: {
    codigo: "ASI",
    nombre: "Asistencia",
    descripcion: "Marcación de jornadas con reconocimiento facial + PIN, geofencing por sitio, horarios con vigencia, permisos, horas extras, cambios de turno",
    precio_usd: 300,
    estado: "produccion",
  },
  RRHH: {
    codigo: "RRHH",
    nombre: "RRHH",
    descripcion: "Contratos con vigencia, adendas, historial de salarios, documentos legales firmados. Standalone — no incluye asistencia ni nómina.",
    precio_usd: 500,
    estado: "produccion",
  },
  NOM: {
    codigo: "NOM",
    nombre: "Nómina bruta",
    descripcion: "Cálculo bruto Panamá: salario base proporcional + horas extras con multiplicadores (25/50/100%) - ausencias. Sin CSS/ISR/décimo (contador externo). Requiere ASI + RRHH activos.",
    precio_usd: 400,
    estado: "roadmap",
  },
  // Legacy alias — kept for backward-compat with orgs that already have PER-full in modulos_activos
  "PER-full": {
    codigo: "PER-full",
    nombre: "RRHH completo (legacy)",
    descripcion: "Ver módulo RRHH",
    precio_usd: 500,
    estado: "roadmap",
  },
};

export const ALL_MODULO_CODIGOS = Object.keys(MODULO_CATALOG) as ModuloCodigo[];
export const PRODUCCION_MODULOS = ALL_MODULO_CODIGOS.filter((c) => MODULO_CATALOG[c].estado === "produccion");
export const ROADMAP_MODULOS = ALL_MODULO_CODIGOS.filter((c) => MODULO_CATALOG[c].estado === "roadmap");

// ---------- Read-only helpers ----------
const OPS_MODULOS = ["REC", "FUM", "LIM", "MTO"] as const;

export function hasModulo(modulosActivos: string[] | null | undefined, codigo: ModuloCodigo): boolean {
  if (!modulosActivos) return false;
  // PER ya no es módulo comprable — se desbloquea con cualquier módulo operacional.
  // Backward-compat: orgs antiguas que tengan "PER" en el array también pasan.
  if (codigo === "PER") {
    return OPS_MODULOS.some((m) => modulosActivos.includes(m)) || modulosActivos.includes("PER");
  }
  return modulosActivos.includes(codigo);
}

export function sumModulosUsd(modulosActivos: string[] | null | undefined): number {
  if (!modulosActivos || modulosActivos.length === 0) return 0;
  let sum = 0;
  for (const c of modulosActivos) {
    const spec = MODULO_CATALOG[c as ModuloCodigo];
    if (spec) sum += spec.precio_usd;
  }
  return sum;
}

export function isValidModuloCodigo(codigo: string): codigo is ModuloCodigo {
  return codigo in MODULO_CATALOG;
}

// ---------- Server-side gating ----------
// Throws if the caller's org does not have the module active.
// Super_admin bypasses (can always operate). Conductor/admin/enterprise/viewer must have the module.
// Use defense-in-depth: call from every mutation in cleaning.ts, fumigaciones.ts, etc.
export async function requireModulo(ctx: Ctx, codigo: ModuloCodigo): Promise<void> {
  const scope = await getAuthScope(ctx);
  if (!scope.perfil) throw new Error("No autenticado");
  if (scope.isSuperAdmin) return;

  if (!scope.organizacionId) {
    throw new Error("Usuario sin organización asignada");
  }
  const org = await ctx.db.get(scope.organizacionId);
  if (!org) throw new Error("Organización no encontrada");

  const activos = (org as any).modulos_activos as string[] | undefined;
  if (!hasModulo(activos, codigo)) {
    const spec = MODULO_CATALOG[codigo];
    throw new Error(`Módulo "${spec?.nombre ?? codigo}" no contratado por la organización`);
  }
}

// Sin throw — para queries de lectura que prefieren retornar [] en lugar de error.
export async function callerHasModulo(ctx: Ctx, codigo: ModuloCodigo): Promise<boolean> {
  const scope = await getAuthScope(ctx);
  if (!scope.perfil) return false;
  if (scope.isSuperAdmin) return true;
  if (!scope.organizacionId) return false;
  const org = await ctx.db.get(scope.organizacionId);
  if (!org) return false;
  return hasModulo((org as any).modulos_activos, codigo);
}

// ============================================================
// OR-gated helpers — para recursos compartidos entre módulos
// ============================================================
// Caso de uso: `lugares` table es usada por FUM (fumigation sites),
// INV (warehouse locations vía inventario_ubicaciones) y MTO (location_components).
// Un org con cualquiera de los 3 debe poder gestionar lugares.

// Throws si NINGUNO de los módulos pasados está activo. Super_admin bypass.
export async function requireAnyModulo(ctx: Ctx, codigos: ModuloCodigo[]): Promise<void> {
  const scope = await getAuthScope(ctx);
  if (!scope.perfil) throw new Error("No autenticado");
  if (scope.isSuperAdmin) return;

  if (!scope.organizacionId) {
    throw new Error("Usuario sin organización asignada");
  }
  const org = await ctx.db.get(scope.organizacionId);
  if (!org) throw new Error("Organización no encontrada");

  const activos = (org as any).modulos_activos as string[] | undefined;
  const someActive = codigos.some((c) => hasModulo(activos, c));
  if (!someActive) {
    const nombres = codigos.map((c) => MODULO_CATALOG[c]?.nombre ?? c).join(", ");
    throw new Error(`Requiere alguno de estos módulos: ${nombres}`);
  }
}

// Sin throw — true si CUALQUIERA de los módulos está activo.
export async function callerHasAnyModulo(ctx: Ctx, codigos: ModuloCodigo[]): Promise<boolean> {
  const scope = await getAuthScope(ctx);
  if (!scope.perfil) return false;
  if (scope.isSuperAdmin) return true;
  if (!scope.organizacionId) return false;
  const org = await ctx.db.get(scope.organizacionId);
  if (!org) return false;
  const activos = (org as any).modulos_activos as string[] | undefined;
  return codigos.some((c) => hasModulo(activos, c));
}
