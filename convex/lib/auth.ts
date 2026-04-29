import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type Ctx = QueryCtx | MutationCtx;

export interface AuthScope {
  perfil: any | null;
  isAdmin: boolean;
  isEnterprise: boolean;
  isConductor: boolean;
  proyectoId: Id<"proyectos"> | null;
}

// Devuelve perfil + flags de scope. Devuelve perfil=null si no hay sesión (queries públicas).
export async function getAuthScope(ctx: Ctx): Promise<AuthScope> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return { perfil: null, isAdmin: false, isEnterprise: false, isConductor: false, proyectoId: null };
  }
  const perfil = await ctx.db
    .query("perfiles_usuarios")
    .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
    .first();
  if (!perfil) {
    return { perfil: null, isAdmin: false, isEnterprise: false, isConductor: false, proyectoId: null };
  }
  return {
    perfil,
    isAdmin: perfil.tipo_usuario === "admin",
    isEnterprise: perfil.tipo_usuario === "enterprise",
    isConductor: perfil.tipo_usuario === "conductor",
    proyectoId: perfil.proyecto_id ?? null,
  };
}

// Lanza error si no hay user autenticado.
export async function requireUser(ctx: Ctx): Promise<AuthScope & { perfil: NonNullable<AuthScope["perfil"]> }> {
  const scope = await getAuthScope(ctx);
  if (!scope.perfil) throw new Error("No autenticado");
  return scope as any;
}

// Para queries: devuelve el proyecto_id que debe usar el filtro.
// Admin → null (= sin filtro, ve todo).
// Enterprise/Conductor → el proyecto_id de su perfil (puede ser null si legacy).
// Si el caller pasa requestedProjectId, valida acceso (admin libre; enterprise debe coincidir).
export async function getScopedProjectId(
  ctx: Ctx,
  requestedProjectId?: Id<"proyectos"> | null
): Promise<Id<"proyectos"> | null> {
  const scope = await getAuthScope(ctx);
  if (scope.isAdmin) {
    return requestedProjectId ?? null;
  }
  if (!scope.proyectoId) return null;
  if (requestedProjectId && requestedProjectId !== scope.proyectoId) {
    throw new Error("Acceso denegado al proyecto solicitado");
  }
  return scope.proyectoId;
}

// Valida que el user pueda escribir/leer recursos del proyectoId dado.
// Admin libre. Enterprise/Conductor deben coincidir.
export async function requireProjectAccess(ctx: Ctx, proyectoId: Id<"proyectos">): Promise<void> {
  const scope = await getAuthScope(ctx);
  if (scope.isAdmin) return;
  if (!scope.proyectoId) throw new Error("Usuario sin proyecto asignado");
  if (scope.proyectoId !== proyectoId) throw new Error("Acceso denegado al proyecto");
}

// Helper para filtrar arrays in-memory por proyecto_id según scope.
// Útil cuando una query ya hace .collect() y necesita filtrar después.
export function filterByScope<T extends { proyecto_id?: Id<"proyectos"> | undefined }>(
  rows: T[],
  scopedProjectId: Id<"proyectos"> | null
): T[] {
  if (scopedProjectId === null) return rows;
  return rows.filter((r) => r.proyecto_id === scopedProjectId);
}
