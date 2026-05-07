import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type Ctx = QueryCtx | MutationCtx;

// Perfiles cliente con visibilidad cross-org: riesgos internos+externos
// y vehículos en mapa de TODAS las orgs.
// Backwards-compat: legacy hardcoded ID (k575k7zv6ktg6qtxddvtjh6rr585vnta) hasta backfill del flag.
const LEGACY_CROSS_ORG_IDS = new Set<string>(["k575k7zv6ktg6qtxddvtjh6rr585vnta"]);
export const isCrossOrgViewer = (perfil: any | null | undefined): boolean => {
  if (!perfil) return false;
  if (perfil.cross_org_viewer === true) return true;
  return LEGACY_CROSS_ORG_IDS.has(perfil._id as string);
};

export interface AuthScope {
  perfil: any | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEnterprise: boolean;
  isConductor: boolean;
  isViewer: boolean;
  isCrossOrgViewer: boolean;
  organizacionId: Id<"organizaciones"> | null;
  proyectoId: Id<"proyectos"> | null;
}

// Devuelve perfil + flags de scope. Devuelve perfil=null si no hay sesión (queries públicas).
export async function getAuthScope(ctx: Ctx): Promise<AuthScope> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return {
      perfil: null,
      isSuperAdmin: false,
      isAdmin: false,
      isEnterprise: false,
      isConductor: false,
      isViewer: false,
      isCrossOrgViewer: false,
      organizacionId: null,
      proyectoId: null,
    };
  }
  const perfil = await ctx.db
    .query("perfiles_usuarios")
    .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
    .first();
  if (!perfil) {
    return {
      perfil: null,
      isSuperAdmin: false,
      isAdmin: false,
      isEnterprise: false,
      isConductor: false,
      isViewer: false,
      isCrossOrgViewer: false,
      organizacionId: null,
      proyectoId: null,
    };
  }
  return {
    perfil,
    isSuperAdmin: perfil.tipo_usuario === "super_admin",
    isAdmin: perfil.tipo_usuario === "admin",
    isEnterprise: perfil.tipo_usuario === "enterprise",
    isConductor: perfil.tipo_usuario === "conductor",
    isViewer: perfil.tipo_usuario === "viewer",
    isCrossOrgViewer: isCrossOrgViewer(perfil),
    organizacionId: perfil.organizacion_id ?? null,
    proyectoId: perfil.proyecto_id ?? null,
  };
}

// Lanza error si no hay user autenticado.
export async function requireUser(ctx: Ctx): Promise<AuthScope & { perfil: NonNullable<AuthScope["perfil"]> }> {
  const scope = await getAuthScope(ctx);
  if (!scope.perfil) throw new Error("No autenticado");
  return scope as any;
}

// Para queries: devuelve la organizacion_id que debe usar el filtro.
// Super_admin → null si no pasa requestedOrgId (ve todo); o el requestedOrgId.
// Admin/Enterprise/Conductor → su organizacion_id propia (puede ser null si legacy).
// Si caller pasa requestedOrgId, valida acceso (super_admin libre; demás deben coincidir).
export async function getScopedOrgId(
  ctx: Ctx,
  requestedOrgId?: Id<"organizaciones"> | null
): Promise<Id<"organizaciones"> | null> {
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin) {
    return requestedOrgId ?? null;
  }
  if (!scope.organizacionId) return null;
  if (requestedOrgId && requestedOrgId !== scope.organizacionId) {
    throw new Error("Acceso denegado a la organización solicitada");
  }
  return scope.organizacionId;
}

// Para queries: devuelve el proyecto_id que debe usar el filtro.
// Super_admin → libre, retorna requestedProjectId ?? null
// Admin → null (= sin filtro de proyecto, ve todos los proyectos de su org).
// Enterprise/Conductor → el proyecto_id de su perfil (puede ser null si legacy).
// Si caller pasa requestedProjectId, valida acceso:
//   - super_admin libre
//   - admin debe verificar que el proyecto pertenece a su org
//   - enterprise/conductor debe coincidir con su proyecto_id propio
export async function getScopedProjectId(
  ctx: Ctx,
  requestedProjectId?: Id<"proyectos"> | null
): Promise<Id<"proyectos"> | null> {
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin) {
    return requestedProjectId ?? null;
  }
  if (scope.isAdmin) {
    if (requestedProjectId) {
      const proyecto = await ctx.db.get(requestedProjectId);
      if (!proyecto) throw new Error("Proyecto no encontrado");
      if (scope.organizacionId && proyecto.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado al proyecto solicitado");
      }
      return requestedProjectId;
    }
    return null;
  }
  if (!scope.proyectoId) return null;
  if (requestedProjectId && requestedProjectId !== scope.proyectoId) {
    throw new Error("Acceso denegado al proyecto solicitado");
  }
  return scope.proyectoId;
}

// Valida que el user pueda escribir/leer recursos del proyectoId dado.
// Super_admin libre. Admin: proyecto debe pertenecer a su org. Enterprise/Conductor: deben coincidir.
export async function requireProjectAccess(ctx: Ctx, proyectoId: Id<"proyectos">): Promise<void> {
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin) return;
  if (scope.isAdmin) {
    if (!scope.organizacionId) throw new Error("Admin sin organización asignada");
    const proyecto = await ctx.db.get(proyectoId);
    if (!proyecto) throw new Error("Proyecto no encontrado");
    if (proyecto.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado al proyecto");
    }
    return;
  }
  // Conductor/enterprise sin proyecto_id: permitir si el proyecto está en su organización.
  // Cubre conductores legacy / recién creados sin proyecto explícito todavía.
  if (!scope.proyectoId) {
    if (!scope.organizacionId) throw new Error("Usuario sin proyecto ni organización asignada");
    const proyecto = await ctx.db.get(proyectoId);
    if (!proyecto) throw new Error("Proyecto no encontrado");
    if (proyecto.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado al proyecto");
    }
    return;
  }
  if (scope.proyectoId !== proyectoId) throw new Error("Acceso denegado al proyecto");
}

// Valida que el user pueda escribir/leer recursos de la orgId dada.
export async function requireOrgAccess(ctx: Ctx, orgId: Id<"organizaciones">): Promise<void> {
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin) return;
  if (!scope.organizacionId) throw new Error("Usuario sin organización asignada");
  if (scope.organizacionId !== orgId) throw new Error("Acceso denegado a la organización");
}

// Solo super_admin puede ejecutar acción.
export async function requireSuperAdmin(ctx: Ctx): Promise<void> {
  const scope = await getAuthScope(ctx);
  if (!scope.isSuperAdmin) throw new Error("Acceso denegado: requiere super_admin");
}

// Bloquea mutaciones de roles read-only (enterprise, viewer). Super_admin/admin/conductor pasan.
// Conductor solo debería invocarse vía sus propias mutations (route_progress.start, etc.).
export async function requireWriteRole(ctx: Ctx): Promise<AuthScope> {
  const scope = await getAuthScope(ctx);
  if (!scope.perfil) throw new Error("No autenticado");
  if (scope.isEnterprise || scope.isViewer) {
    throw new Error("Acceso denegado: rol de solo lectura");
  }
  return scope;
}

// Bloquea mutaciones para cualquiera que no sea super_admin o admin.
// Para acciones administrativas que conductor tampoco debería poder hacer.
export async function requireAdminWrite(ctx: Ctx): Promise<AuthScope> {
  const scope = await getAuthScope(ctx);
  if (!scope.perfil) throw new Error("No autenticado");
  if (!scope.isSuperAdmin && !scope.isAdmin) {
    throw new Error("Acceso denegado: requiere admin o super_admin");
  }
  return scope;
}

// Helper para filtrar arrays in-memory por proyecto_id según scope.
export function filterByScope<T extends { proyecto_id?: Id<"proyectos"> | undefined }>(
  rows: T[],
  scopedProjectId: Id<"proyectos"> | null
): T[] {
  if (scopedProjectId === null) return rows;
  return rows.filter((r) => r.proyecto_id === scopedProjectId);
}

// Helper para filtrar arrays in-memory por organizacion_id según scope.
export function filterByOrgScope<T extends { organizacion_id?: Id<"organizaciones"> | undefined }>(
  rows: T[],
  scopedOrgId: Id<"organizaciones"> | null
): T[] {
  if (scopedOrgId === null) return rows;
  return rows.filter((r) => r.organizacion_id === scopedOrgId);
}
