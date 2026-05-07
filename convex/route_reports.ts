import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId, requireProjectAccess, requireWriteRole, getAuthScope } from "./lib/auth";

export const list = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    const all = await ctx.db
      .query("route_reports")
      .withIndex("by_fecha", (q) => q)
      .order("desc")
      .collect();
    if (scoped !== null) return all.filter((r) => r.proyecto_id === scoped);
    // scoped === null: super_admin ve todo; demás filtran por su org.
    const scope = await getAuthScope(ctx);
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    return all.filter((r) => r.organizacion_id === scope.organizacionId);
  },
});

export const add = mutation({
  args: {
    ruta_id: v.optional(v.id("rutas")),
    asignacion_id: v.optional(v.id("asignaciones_rutas")),
    conductor_nombre: v.string(),
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    vehiculo_placa: v.string(),
    vehiculo_id: v.optional(v.id("vehiculos")),
    fecha_inicio: v.string(),
    fecha_completacion: v.string(),
    tiempo_total_segundos: v.number(),
    paradas_completadas: v.array(v.any()),
    reportes_riesgo_ids: v.optional(v.array(v.string())),
    observaciones: v.optional(v.string()),
    tipo_ruta: v.string(),
    ruta_nombre: v.string(),
    ruta_paradas: v.optional(v.array(v.any())),
    terminacion_anticipada: v.optional(v.boolean()),
    motivo_terminacion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    // Derivar proyecto_id desde la asignación o ruta + denormalizar foto/ubicación de la ruta
    let proyecto_id;
    let ruta = null;
    let asignacion = null;
    if (args.asignacion_id) {
      asignacion = await ctx.db.get(args.asignacion_id);
      proyecto_id = asignacion?.proyecto_id;
    }
    if (args.ruta_id) {
      ruta = await ctx.db.get(args.ruta_id);
      if (!proyecto_id) proyecto_id = ruta?.proyecto_id;
    }
    if (proyecto_id) await requireProjectAccess(ctx, proyecto_id);

    // Auto-attach organizacion_id desde la fuente más confiable (ruta/asignación/scope)
    const orgId =
      asignacion?.organizacion_id ??
      ruta?.organizacion_id ??
      scope.organizacionId ??
      undefined;

    const payload: any = {
      ...args,
      proyecto_id,
      ruta_foto_portada_storage_id: ruta?.foto_portada_storage_id,
      ruta_ubicacion_principal: ruta?.ubicacion_principal,
    };
    if (orgId) payload.organizacion_id = orgId;
    return await ctx.db.insert("route_reports", payload);
  },
});
