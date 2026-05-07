import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthScope, getScopedProjectId, getScopedOrgId, requireProjectAccess, requireWriteRole } from "./lib/auth";

// Sync auto-generated geofences for a route's paradas.
// Deletes previous auto-generated geofences for this ruta, then inserts one per parada.
// Pass paradas=null to just delete (used on rutas.remove).
async function syncParadaGeofences(
  ctx: MutationCtx,
  rutaId: Id<"rutas">,
  paradas: any[] | null,
) {
  const existing = await ctx.db
    .query("geofences")
    .withIndex("by_ruta", (q) => q.eq("ruta_id", rutaId))
    .collect();
  for (const g of existing) {
    if (g.auto_generada) await ctx.db.delete(g._id);
  }
  if (!paradas) return;

  for (let i = 0; i < paradas.length; i++) {
    const p = paradas[i] ?? {};
    const lat = typeof p.latitud === "number" ? p.latitud : typeof p.lat === "number" ? p.lat : null;
    const lng = typeof p.longitud === "number" ? p.longitud : typeof p.lng === "number" ? p.lng : null;
    if (lat === null || lng === null) continue;

    await ctx.db.insert("geofences", {
      nombre: `Parada ${i + 1}: ${p.nombre || p.direccion || "Sin nombre"}`,
      descripcion: "Auto-generada por ruta",
      latitud: lat,
      longitud: lng,
      radio: 100,
      color: "#0078D4",
      tipo: "entrada",
      activo: true,
      created_at: Date.now(),
      ruta_id: rutaId,
      parada_index: i,
      auto_generada: true,
    });
  }
}

// List rutas. Admin: todas (o filtradas por proyecto_id arg). Enterprise: solo las suyas.
export const list = query({
  args: {
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scopedProject = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    if (scopedProject) {
      return await ctx.db
        .query("rutas")
        .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scopedProject))
        .collect();
    }
    const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
    if (scopedOrg) {
      const all = await ctx.db.query("rutas").collect();
      return all.filter((r) => r.organizacion_id === scopedOrg);
    }
    return await ctx.db.query("rutas").collect();
  },
});

// Get by estado
export const getByEstado = query({
  args: { estado: v.string() },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db
      .query("rutas")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    return all.filter((r) => r.organizacion_id === scope.organizacionId);
  },
});

// Get by proyecto
export const getByProyecto = query({
  args: { proyecto_id: v.id("proyectos") },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.proyecto_id);
    return await ctx.db
      .query("rutas")
      .withIndex("by_proyecto", (q) => q.eq("proyecto_id", args.proyecto_id))
      .collect();
  },
});

// Get by ID
export const getById = query({
  args: { id: v.id("rutas") },
  handler: async (ctx, args) => {
    const ruta = await ctx.db.get(args.id);
    if (!ruta) return null;
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!ruta.organizacion_id) throw new Error("Ruta sin organización — requiere migración");
      if (!scope.organizacionId || scope.organizacionId !== ruta.organizacion_id) {
        throw new Error("Acceso denegado");
      }
    }
    return ruta;
  },
});

const ubicacionPrincipalValidator = v.object({
  latitud: v.number(),
  longitud: v.number(),
  nombre: v.string(),
  direccion: v.optional(v.string()),
});

// Add ruta
export const add = mutation({
  args: {
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    proyecto_id: v.optional(v.id("proyectos")),
    tipo_servicio: v.string(),
    paradas: v.array(v.any()),
    fecha_programada: v.optional(v.string()),
    hora_inicio: v.optional(v.string()),
    hora_fin: v.optional(v.string()),
    dias_operacion: v.optional(v.array(v.string())),
    distancia_total: v.optional(v.number()),
    tiempo_estimado: v.optional(v.number()),
    combustible_estimado: v.optional(v.number()),
    observaciones: v.optional(v.string()),
    estado: v.optional(v.string()),
    foto_portada_storage_id: v.optional(v.id("_storage")),
    ubicacion_principal: v.optional(ubicacionPrincipalValidator),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    if (!args.proyecto_id) throw new Error("proyecto_id requerido al crear ruta");
    await requireProjectAccess(ctx, args.proyecto_id);
    // Persistir organizacion_id derivado del proyecto.
    const proyecto = await ctx.db.get(args.proyecto_id);
    const organizacion_id = proyecto?.organizacion_id ?? undefined;
    const newId = await ctx.db.insert("rutas", {
      ...args,
      estado: args.estado || "programada",
      ...(organizacion_id && { organizacion_id }),
    });
    await syncParadaGeofences(ctx, newId, args.paradas);
    return newId;
  },
});

// Update ruta
export const update = mutation({
  args: {
    id: v.id("rutas"),
    nombre: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    tipo_servicio: v.optional(v.string()),
    paradas: v.optional(v.array(v.any())),
    fecha_programada: v.optional(v.string()),
    hora_inicio: v.optional(v.string()),
    hora_fin: v.optional(v.string()),
    dias_operacion: v.optional(v.array(v.string())),
    estado: v.optional(v.string()),
    distancia_total: v.optional(v.number()),
    tiempo_estimado: v.optional(v.number()),
    combustible_estimado: v.optional(v.number()),
    observaciones: v.optional(v.string()),
    foto_portada_storage_id: v.optional(v.id("_storage")),
    ubicacion_principal: v.optional(ubicacionPrincipalValidator),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const ruta = await ctx.db.get(args.id);
    if (!ruta) throw new Error("Ruta no encontrada");
    if (ruta.proyecto_id) await requireProjectAccess(ctx, ruta.proyecto_id);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    if (args.paradas !== undefined) {
      await syncParadaGeofences(ctx, id, args.paradas);
    }
    return id;
  },
});

// Update estado
export const updateEstado = mutation({
  args: {
    id: v.id("rutas"),
    estado: v.string(),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const ruta = await ctx.db.get(args.id);
    if (!ruta) throw new Error("Ruta no encontrada");
    if (ruta.proyecto_id) await requireProjectAccess(ctx, ruta.proyecto_id);
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});

// Delete ruta
export const remove = mutation({
  args: { id: v.id("rutas") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const ruta = await ctx.db.get(args.id);
    if (!ruta) throw new Error("Ruta no encontrada");
    if (ruta.proyecto_id) await requireProjectAccess(ctx, ruta.proyecto_id);
    await syncParadaGeofences(ctx, args.id, null);
    return await ctx.db.delete(args.id);
  },
});

// Get stats (scoped por proyecto cuando aplica)
export const getStats = query({
  args: { proyecto_id: v.optional(v.id("proyectos")) },
  handler: async (ctx, args) => {
    const scoped = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    let rutas;
    if (scoped) {
      rutas = await ctx.db.query("rutas").withIndex("by_proyecto", (q) => q.eq("proyecto_id", scoped)).collect();
    } else {
      const scope = await getAuthScope(ctx);
      const all = await ctx.db.query("rutas").collect();
      if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
        rutas = all;
      } else if (scope.organizacionId) {
        rutas = all.filter((r) => r.organizacion_id === scope.organizacionId);
      } else {
        rutas = [];
      }
    }

    const pendientes = rutas.filter(r => r.estado === "pendiente").length;
    const en_progreso = rutas.filter(r => r.estado === "en_progreso").length;
    const completadas = rutas.filter(r => r.estado === "completada").length;

    return {
      total: rutas.length,
      pendientes,
      en_progreso,
      completadas,
    };
  },
});

// One-shot migration: backfill organizacion_id on rutas derived from proyectos.
export const _migrationBackfillOrganizacionId = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("rutas").collect();
    let fixed = 0;
    for (const ruta of all) {
      if (ruta.organizacion_id != null) continue;
      if (!ruta.proyecto_id) continue;
      const proyecto = await ctx.db.get(ruta.proyecto_id);
      if (!proyecto?.organizacion_id) continue;
      await ctx.db.patch(ruta._id, { organizacion_id: proyecto.organizacion_id });
      fixed++;
    }
    return { fixed, total: all.length };
  },
});
