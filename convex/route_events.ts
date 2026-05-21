import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, getScopedProjectId, getScopedOrgId, requireProjectAccess, requireWriteRole } from "./lib/auth";
import { requireModulo } from "./lib/modules";

// Create route event
export const add = mutation({
  args: {
    ruta_id: v.optional(v.id("rutas")),
    asignacion_id: v.optional(v.id("asignaciones_rutas")),
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    conductor_nombre: v.string(),
    vehiculo_id: v.optional(v.id("vehiculos")),
    vehiculo_placa: v.string(),
    ruta_nombre: v.string(),
    tipo_evento: v.union(
      v.literal("ruta_iniciada"),
      v.literal("parada_llegada"),
      v.literal("parada_salida"),
      v.literal("parada_completada"),
      v.literal("ruta_completada"),
      v.literal("ruta_pausada"),
      v.literal("ruta_reanudada"),
      v.literal("ruta_terminada_anticipadamente")
    ),
    parada_nombre: v.optional(v.string()),
    parada_orden: v.optional(v.float64()),
    parada_index: v.optional(v.float64()),
    categoria_carga: v.optional(v.string()),
    bolsas: v.optional(v.float64()),
    foto_storage_id: v.optional(v.id("_storage")),
    gps_latitud: v.optional(v.float64()),
    gps_longitud: v.optional(v.float64()),
    detalles: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "REC");
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");
    let proyecto_id;
    let asignacion = null;
    let ruta = null;
    if (args.asignacion_id) {
      asignacion = await ctx.db.get(args.asignacion_id);
      proyecto_id = asignacion?.proyecto_id;
    }
    if (!proyecto_id && args.ruta_id) {
      ruta = await ctx.db.get(args.ruta_id);
      proyecto_id = ruta?.proyecto_id;
    }
    if (proyecto_id) await requireProjectAccess(ctx, proyecto_id);

    const orgId =
      asignacion?.organizacion_id ??
      ruta?.organizacion_id ??
      scope.organizacionId ??
      undefined;

    // Eventos sin org rompen filter downstream (cross-org viewer es excepción).
    if (!orgId && !scope.isSuperAdmin) {
      throw new Error("No se puede crear evento sin organización");
    }

    // Idempotency para parada_completada: si ya existe evento mismo asignacion+parada_index,
    // devolver existing sin insertar (evita doble-click conductor crea duplicados).
    if (args.tipo_evento === "parada_completada" && args.asignacion_id && args.parada_index !== undefined) {
      const existing = await ctx.db
        .query("route_events")
        .withIndex("by_asignacion", (q) => q.eq("asignacion_id", args.asignacion_id))
        .filter((q) =>
          q.and(
            q.eq(q.field("tipo_evento"), "parada_completada"),
            q.eq(q.field("parada_index"), args.parada_index)
          )
        )
        .first();
      if (existing) return existing._id;
    }

    const eventData: any = {
      ...args,
      proyecto_id,
      timestamp: new Date().toISOString(),
    };
    if (orgId) eventData.organizacion_id = orgId;

    return await ctx.db.insert("route_events", eventData);
  },
});

// Adjuntar foto a un evento parada_completada existente.
// Usado por offline-photo-queue cuando regresa la conexión: en vez de emitir
// un evento duplicado, parchea el evento original con foto_storage_id.
// Si no encuentra el evento (raro), inserta uno nuevo como fallback.
export const attachPhotoToParada = mutation({
  args: {
    asignacion_id: v.id("asignaciones_rutas"),
    parada_index: v.float64(),
    foto_storage_id: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "REC");
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");

    const events = await ctx.db
      .query("route_events")
      .withIndex("by_asignacion", (q) => q.eq("asignacion_id", args.asignacion_id))
      .collect();
    const target = events.find(
      (e) => e.tipo_evento === "parada_completada" && e.parada_index === args.parada_index
    );
    if (!target) {
      console.warn("attachPhotoToParada: no se encontró evento parada_completada para asignacion+parada");
      return null;
    }
    if (!scope.isSuperAdmin && target.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }
    await ctx.db.patch(target._id, { foto_storage_id: args.foto_storage_id });
    return target._id;
  },
});

// Get all events for a specific assignment (for admin sidebar live photos).
export const getByAsignacion = query({
  args: { asignacion_id: v.id("asignaciones_rutas") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");
    const events = await ctx.db
      .query("route_events")
      .withIndex("by_asignacion", (q) => q.eq("asignacion_id", args.asignacion_id))
      .collect();
    if (scope.isCrossOrgViewer || scope.isSuperAdmin) return events;
    if (!scope.organizacionId) return [];
    return events.filter((e) => e.organizacion_id === scope.organizacionId);
  },
});

// One-shot migration: backfill organizacion_id en route_events.
// Deriva del proyecto: route_event.proyecto_id → proyectos.organizacion_id.
export const _migrationBackfillOrganizacionId = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("route_events").collect();
    let fixed = 0;
    for (const ev of all) {
      if (ev.organizacion_id != null) continue;
      let orgId: typeof ev.organizacion_id = null;
      if (ev.proyecto_id) {
        const p = await ctx.db.get(ev.proyecto_id);
        orgId = p?.organizacion_id ?? null;
      }
      if (!orgId && ev.asignacion_id) {
        const a = await ctx.db.get(ev.asignacion_id);
        orgId = a?.organizacion_id ?? null;
      }
      if (!orgId && ev.ruta_id) {
        const r = await ctx.db.get(ev.ruta_id);
        orgId = r?.organizacion_id ?? null;
      }
      if (!orgId) continue;
      await ctx.db.patch(ev._id, { organizacion_id: orgId });
      fixed++;
    }
    return { fixed, total: all.length };
  },
});

// Get recent events (for activity feed). Scoped por proyecto/org según user.
export const getRecent = query({
  args: {
    limit: v.optional(v.float64()),
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    const limit = args.limit || 50;

    // Cross-org viewer: ve eventos de TODAS las orgs
    if (scope.isCrossOrgViewer) {
      return await ctx.db
        .query("route_events")
        .order("desc")
        .take(limit);
    }

    const scopedProject = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    if (scopedProject) {
      return await ctx.db
        .query("route_events")
        .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scopedProject))
        .order("desc")
        .take(limit);
    }
    const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
    if (scopedOrg) {
      const all = await ctx.db
        .query("route_events")
        .order("desc")
        .take(limit * 4);
      return all
        .filter((e) => e.organizacion_id === scopedOrg)
        .slice(0, limit);
    }
    // Fallback: solo super_admin ve eventos globales sin filtro de org
    if (scope.isSuperAdmin) {
      return await ctx.db.query("route_events").order("desc").take(limit);
    }
    return [];
  },
});

