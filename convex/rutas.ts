import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

// List all rutas
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("rutas").collect();
  },
});

// Get by estado
export const getByEstado = query({
  args: { estado: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rutas")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
  },
});

// Get by proyecto
export const getByProyecto = query({
  args: { proyecto_id: v.id("proyectos") },
  handler: async (ctx, args) => {
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
    return await ctx.db.get(args.id);
  },
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
  },
  handler: async (ctx, args) => {
    const newId = await ctx.db.insert("rutas", {
      ...args,
      estado: args.estado || "programada",
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
  },
  handler: async (ctx, args) => {
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
    return await ctx.db.patch(args.id, { estado: args.estado });
  },
});

// Delete ruta
export const remove = mutation({
  args: { id: v.id("rutas") },
  handler: async (ctx, args) => {
    await syncParadaGeofences(ctx, args.id, null);
    return await ctx.db.delete(args.id);
  },
});

// Get stats
export const getStats = query({
  handler: async (ctx) => {
    const rutas = await ctx.db.query("rutas").collect();

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
