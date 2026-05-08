import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, getScopedOrgId, requireAdminWrite, requireOrgAccess } from "./lib/auth";

export const list = query({
  args: { organizacion_id: v.optional(v.id("organizaciones")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
    if (scopedOrg === null) {
      return await ctx.db.query("proyectos").collect();
    }
    return await ctx.db
      .query("proyectos")
      .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scopedOrg))
      .collect();
  },
});

// Devuelve los proyectos accesibles según el rol del user actual.
// Super_admin → si pasa organizacion_id, filtra; sino, todos los activos.
// Admin → todos los proyectos activos de su organización.
// Enterprise/Conductor → solo el proyecto asignado en su perfil (si existe).
// Sin sesión → array vacío.
export const listAccessible = query({
  args: { organizacion_id: v.optional(v.id("organizaciones")) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    if (scope.isSuperAdmin) {
      if (args.organizacion_id) {
        const all = await ctx.db
          .query("proyectos")
          .withIndex("by_organizacion", (q) => q.eq("organizacion_id", args.organizacion_id!))
          .collect();
        return all.filter((p) => p.activo);
      }
      return await ctx.db
        .query("proyectos")
        .withIndex("by_activo", (q) => q.eq("activo", true))
        .collect();
    }
    if (scope.isAdmin) {
      if (!scope.organizacionId) return [];
      const all = await ctx.db
        .query("proyectos")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
      return all.filter((p) => p.activo);
    }
    if (!scope.proyectoId) return [];
    const proyecto = await ctx.db.get(scope.proyectoId);
    return proyecto ? [proyecto] : [];
  },
});

export const listActive = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (scope.isSuperAdmin) {
      return await ctx.db
        .query("proyectos")
        .withIndex("by_activo", (q) => q.eq("activo", true))
        .collect();
    }
    if (!scope.organizacionId) return [];
    const all = await ctx.db
      .query("proyectos")
      .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId))
      .collect();
    return all.filter((p) => p.activo);
  },
});

export const getById = query({
  args: { id: v.id("proyectos") },
  handler: async (ctx, args) => {
    const proyecto = await ctx.db.get(args.id);
    if (!proyecto) return null;
    const scope = await getAuthScope(ctx);
    // Soft-deleted: solo super_admin puede leerlos (auditoría/restore).
    if (proyecto.activo === false && !scope.isSuperAdmin) return null;
    if (scope.isSuperAdmin) return proyecto;
    if (!proyecto.organizacion_id) throw new Error("Proyecto sin organización — requiere migración");
    if (!scope.organizacionId || proyecto.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado al proyecto");
    }
    return proyecto;
  },
});

export const add = mutation({
  args: {
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    cliente: v.optional(v.string()),
    fecha_inicio: v.optional(v.string()),
    fecha_fin: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");

    let orgId: any = args.organizacion_id;
    if (scope.isSuperAdmin) {
      if (!orgId) throw new Error("Super admin debe especificar organizacion_id");
    } else if (scope.isAdmin) {
      if (!scope.organizacionId) throw new Error("Admin sin organización asignada");
      orgId = scope.organizacionId; // ignora override
    } else {
      throw new Error("Solo admin o super_admin puede crear proyectos");
    }

    await requireOrgAccess(ctx, orgId);
    const { organizacion_id: _ignore, ...rest } = args;
    return await ctx.db.insert("proyectos", {
      ...rest,
      activo: true,
      organizacion_id: orgId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("proyectos"),
    nombre: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    cliente: v.optional(v.string()),
    fecha_inicio: v.optional(v.string()),
    fecha_fin: v.optional(v.string()),
    activo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    const proyecto = await ctx.db.get(args.id);
    if (!proyecto) throw new Error("Proyecto no encontrado");
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin) {
      if (!scope.organizacionId || proyecto.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado al proyecto");
      }
    }
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("proyectos") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    const proyecto = await ctx.db.get(args.id);
    if (!proyecto) throw new Error("Proyecto no encontrado");
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin) {
      if (!scope.organizacionId || proyecto.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado al proyecto");
      }
    }

    // Block-if-children: evita borrado destructivo si quedan dependencias.
    // Para borrar un proyecto, primero hay que reasignar/borrar sus recursos.
    const blockers: string[] = [];

    const rutasCount = (
      await ctx.db.query("rutas").withIndex("by_proyecto", (q) => q.eq("proyecto_id", args.id)).take(1)
    ).length;
    if (rutasCount > 0) blockers.push("rutas");

    const asignacionesCount = (
      await ctx.db.query("asignaciones_rutas").withIndex("by_proyecto", (q) => q.eq("proyecto_id", args.id)).take(1)
    ).length;
    if (asignacionesCount > 0) blockers.push("asignaciones");

    const perfilesQ = await ctx.db
      .query("perfiles_usuarios")
      .filter((q) => q.eq(q.field("proyecto_id"), args.id))
      .take(1);
    if (perfilesQ.length > 0) blockers.push("usuarios (conductores/enterprise)");

    if (blockers.length > 0) {
      throw new Error(
        `No se puede eliminar: el proyecto tiene ${blockers.join(", ")}. Reasigna o elimina esos recursos primero.`
      );
    }

    return await ctx.db.delete(args.id);
  },
});
