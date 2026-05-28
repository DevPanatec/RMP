import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireWriteRole } from "./lib/auth";
import { requireModulo } from "./lib/modules";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// Checks caller is authenticated. Returns scope.
async function requireAuth(ctx: any) {
  const scope = await getAuthScope(ctx);
  if (!scope.perfil) throw new Error("No autenticado");
  return scope;
}

// Returns organizacion_id for insert (undefined for super_admin intentional).
async function getOrgId(ctx: any): Promise<any> {
  const scope = await getAuthScope(ctx);
  return scope.organizacionId ?? undefined;
}

// Filter a list of items to the caller's org.
function filterByOrg(items: any[], scope: any): any[] {
  if (scope.isSuperAdmin || scope.isCrossOrgViewer) return items;
  if (!scope.organizacionId) return [];
  return items.filter((i) => i.organizacion_id === scope.organizacionId);
}

// ─────────────────────────────────────────────
// VEHICLE COMPONENTS
// ─────────────────────────────────────────────

export const listVehicleComponents = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    const scope = await requireAuth(ctx);
    await requireModulo(ctx, "INV");
    const items = await ctx.db
      .query("vehicle_components")
      .withIndex("by_vehiculo", (q: any) => q.eq("vehiculo_id", args.vehiculo_id))
      .collect();
    return filterByOrg(items, scope);
  },
});

export const listVehicleComponentsHistory = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, args) => {
    const scope = await requireAuth(ctx);
    await requireModulo(ctx, "INV");
    const items = await ctx.db
      .query("vehicle_components_history")
      .withIndex("by_vehiculo", (q: any) => q.eq("vehiculo_id", args.vehiculo_id))
      .order("desc")
      .collect();
    return filterByOrg(items, scope);
  },
});

export const addVehicleComponent = mutation({
  args: {
    vehiculo_id: v.id("vehiculos"),
    nombre: v.string(),
    tipo: v.string(),
    posicion: v.optional(v.string()),
    marca: v.optional(v.string()),
    numero_serie: v.optional(v.string()),
    fecha_instalacion: v.number(),
    km_instalacion: v.optional(v.number()),
    vida_util_km: v.optional(v.number()),
    vida_util_dias: v.optional(v.number()),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    const orgId = await getOrgId(ctx);
    return await ctx.db.insert("vehicle_components", {
      ...args,
      estado: "activo",
      organizacion_id: orgId,
    });
  },
});

export const updateVehicleComponent = mutation({
  args: {
    id: v.id("vehicle_components"),
    nombre: v.optional(v.string()),
    tipo: v.optional(v.string()),
    posicion: v.optional(v.string()),
    marca: v.optional(v.string()),
    numero_serie: v.optional(v.string()),
    vida_util_km: v.optional(v.number()),
    vida_util_dias: v.optional(v.number()),
    estado: v.optional(v.union(v.literal("activo"), v.literal("reemplazado"), v.literal("vencido"))),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    const { id, ...patch } = args;
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanPatch);
  },
});

export const replaceVehicleComponent = mutation({
  args: {
    componente_id: v.id("vehicle_components"),
    motivo: v.union(v.literal("preventivo"), v.literal("desgaste"), v.literal("falla")),
    tecnico: v.optional(v.string()),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    nueva_fecha_instalacion: v.number(),
    nuevo_km_instalacion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    const orgId = await getOrgId(ctx);

    const comp = await ctx.db.get(args.componente_id);
    if (!comp) throw new Error("Componente no encontrado");

    const diasUso = Math.floor((Date.now() - comp.fecha_instalacion) / 86400000);
    const vehiculo = await ctx.db.get(comp.vehiculo_id);
    const kmAlCambio = vehiculo?.km_acumulado;

    await ctx.db.insert("vehicle_components_history", {
      vehiculo_id: comp.vehiculo_id,
      componente_id: args.componente_id,
      tipo: comp.tipo,
      km_al_cambio: kmAlCambio,
      dias_uso: diasUso,
      motivo: args.motivo,
      tecnico: args.tecnico,
      costo: args.costo,
      notas: args.notas,
      fecha_cambio: Date.now(),
      organizacion_id: orgId,
    });

    await ctx.db.patch(args.componente_id, {
      estado: "activo",
      fecha_instalacion: args.nueva_fecha_instalacion,
      km_instalacion: args.nuevo_km_instalacion,
    });
  },
});

export const deleteVehicleComponent = mutation({
  args: { id: v.id("vehicle_components") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    // Cascade: delete history records first
    const historial = await ctx.db
      .query("vehicle_components_history")
      .withIndex("by_componente", (q: any) => q.eq("componente_id", args.id))
      .collect();
    for (const h of historial) await ctx.db.delete(h._id);
    await ctx.db.delete(args.id);
  },
});

// ─────────────────────────────────────────────
// FLEET ASSETS
// ─────────────────────────────────────────────

export const listFleetAssets = query({
  args: {},
  handler: async (ctx) => {
    const scope = await requireAuth(ctx);
    await requireModulo(ctx, "INV");
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
      return await ctx.db.query("fleet_assets").collect();
    }
    if (!scope.organizacionId) return [];
    return await ctx.db
      .query("fleet_assets")
      .withIndex("by_organizacion", (q: any) => q.eq("organizacion_id", scope.organizacionId))
      .collect();
  },
});

export const addFleetAsset = mutation({
  args: {
    nombre: v.string(),
    tipo: v.string(),
    descripcion: v.optional(v.string()),
    fecha_adquisicion: v.number(),
    vida_util_dias: v.optional(v.number()),
    tiene_componentes: v.boolean(),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    const orgId = await getOrgId(ctx);
    return await ctx.db.insert("fleet_assets", {
      ...args,
      estado: "activo",
      organizacion_id: orgId,
    });
  },
});

export const updateFleetAsset = mutation({
  args: {
    id: v.id("fleet_assets"),
    nombre: v.optional(v.string()),
    tipo: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    vida_util_dias: v.optional(v.number()),
    estado: v.optional(v.union(v.literal("activo"), v.literal("vencido"), v.literal("dado_de_baja"))),
    tiene_componentes: v.optional(v.boolean()),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    const { id, ...patch } = args;
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanPatch);
  },
});

export const deleteFleetAsset = mutation({
  args: { id: v.id("fleet_assets") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    // Cascade: delete sub-component history then sub-components then asset
    const comps = await ctx.db
      .query("fleet_asset_components")
      .withIndex("by_asset", (q: any) => q.eq("asset_id", args.id))
      .collect();
    for (const c of comps) {
      const historial = await ctx.db
        .query("fleet_asset_components_history")
        .withIndex("by_componente", (q: any) => q.eq("componente_id", c._id))
        .collect();
      for (const h of historial) await ctx.db.delete(h._id);
      await ctx.db.delete(c._id);
    }
    // Also delete asset-level history (by_asset index)
    const assetHistory = await ctx.db
      .query("fleet_asset_components_history")
      .withIndex("by_asset", (q: any) => q.eq("asset_id", args.id))
      .collect();
    for (const h of assetHistory) await ctx.db.delete(h._id);
    await ctx.db.delete(args.id);
  },
});

// ─────────────────────────────────────────────
// FLEET ASSET COMPONENTS
// ─────────────────────────────────────────────

export const listFleetAssetComponents = query({
  args: { asset_id: v.id("fleet_assets") },
  handler: async (ctx, args) => {
    const scope = await requireAuth(ctx);
    await requireModulo(ctx, "INV");
    const items = await ctx.db
      .query("fleet_asset_components")
      .withIndex("by_asset", (q: any) => q.eq("asset_id", args.asset_id))
      .collect();
    return filterByOrg(items, scope);
  },
});

export const listFleetAssetComponentsHistory = query({
  args: { asset_id: v.id("fleet_assets") },
  handler: async (ctx, args) => {
    const scope = await requireAuth(ctx);
    await requireModulo(ctx, "INV");
    const items = await ctx.db
      .query("fleet_asset_components_history")
      .withIndex("by_asset", (q: any) => q.eq("asset_id", args.asset_id))
      .order("desc")
      .collect();
    return filterByOrg(items, scope);
  },
});

export const addFleetAssetComponent = mutation({
  args: {
    asset_id: v.id("fleet_assets"),
    nombre: v.string(),
    tipo: v.string(),
    marca: v.optional(v.string()),
    fecha_instalacion: v.number(),
    vida_util_dias: v.number(),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    const orgId = await getOrgId(ctx);
    return await ctx.db.insert("fleet_asset_components", {
      ...args,
      estado: "activo",
      organizacion_id: orgId,
    });
  },
});

export const updateFleetAssetComponent = mutation({
  args: {
    id: v.id("fleet_asset_components"),
    nombre: v.optional(v.string()),
    tipo: v.optional(v.string()),
    marca: v.optional(v.string()),
    vida_util_dias: v.optional(v.number()),
    estado: v.optional(v.union(v.literal("activo"), v.literal("reemplazado"), v.literal("vencido"))),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    const { id, ...patch } = args;
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanPatch);
  },
});

export const replaceFleetAssetComponent = mutation({
  args: {
    componente_id: v.id("fleet_asset_components"),
    motivo: v.union(v.literal("preventivo"), v.literal("desgaste"), v.literal("falla")),
    tecnico: v.optional(v.string()),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    nueva_fecha_instalacion: v.number(),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    const orgId = await getOrgId(ctx);

    const comp = await ctx.db.get(args.componente_id);
    if (!comp) throw new Error("Componente no encontrado");

    const diasUso = Math.floor((Date.now() - comp.fecha_instalacion) / 86400000);

    await ctx.db.insert("fleet_asset_components_history", {
      asset_id: comp.asset_id,
      componente_id: args.componente_id,
      tipo: comp.tipo,
      dias_uso: diasUso,
      motivo: args.motivo,
      tecnico: args.tecnico,
      costo: args.costo,
      notas: args.notas,
      fecha_cambio: Date.now(),
      organizacion_id: orgId,
    });

    await ctx.db.patch(args.componente_id, {
      estado: "activo",
      fecha_instalacion: args.nueva_fecha_instalacion,
    });
  },
});

export const deleteFleetAssetComponent = mutation({
  args: { id: v.id("fleet_asset_components") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "INV");
    // Cascade: delete history records first
    const historial = await ctx.db
      .query("fleet_asset_components_history")
      .withIndex("by_componente", (q: any) => q.eq("componente_id", args.id))
      .collect();
    for (const h of historial) await ctx.db.delete(h._id);
    await ctx.db.delete(args.id);
  },
});

// ─────────────────────────────────────────────
// LOCATION COMPONENTS (Mantenimiento)
// ─────────────────────────────────────────────

export const listLocationComponents = query({
  args: { lugar_id: v.id("lugares") },
  handler: async (ctx, args) => {
    const scope = await requireAuth(ctx);
    await requireModulo(ctx, "MTO");
    const items = await ctx.db
      .query("location_components")
      .withIndex("by_lugar", (q: any) => q.eq("lugar_id", args.lugar_id))
      .collect();
    return filterByOrg(items, scope);
  },
});

export const listLocationComponentsHistory = query({
  args: { lugar_id: v.id("lugares") },
  handler: async (ctx, args) => {
    const scope = await requireAuth(ctx);
    await requireModulo(ctx, "MTO");
    const items = await ctx.db
      .query("location_components_history")
      .withIndex("by_lugar", (q: any) => q.eq("lugar_id", args.lugar_id))
      .order("desc")
      .collect();
    return filterByOrg(items, scope);
  },
});

export const addLocationComponent = mutation({
  args: {
    lugar_id: v.id("lugares"),
    nombre: v.string(),
    tipo: v.string(),
    marca: v.optional(v.string()),
    fecha_instalacion: v.number(),
    vida_util_dias: v.number(),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    const orgId = await getOrgId(ctx);
    return await ctx.db.insert("location_components", {
      ...args,
      estado: "activo",
      organizacion_id: orgId,
    });
  },
});

export const updateLocationComponent = mutation({
  args: {
    id: v.id("location_components"),
    nombre: v.optional(v.string()),
    tipo: v.optional(v.string()),
    marca: v.optional(v.string()),
    vida_util_dias: v.optional(v.number()),
    estado: v.optional(v.union(v.literal("activo"), v.literal("reemplazado"), v.literal("vencido"))),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    const { id, ...patch } = args;
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanPatch);
  },
});

export const replaceLocationComponent = mutation({
  args: {
    componente_id: v.id("location_components"),
    motivo: v.union(v.literal("preventivo"), v.literal("desgaste"), v.literal("falla")),
    tecnico: v.optional(v.string()),
    costo: v.optional(v.number()),
    notas: v.optional(v.string()),
    nueva_fecha_instalacion: v.number(),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    const orgId = await getOrgId(ctx);

    const comp = await ctx.db.get(args.componente_id);
    if (!comp) throw new Error("Componente no encontrado");

    const diasUso = Math.floor((Date.now() - comp.fecha_instalacion) / 86400000);

    await ctx.db.insert("location_components_history", {
      lugar_id: comp.lugar_id,
      componente_id: args.componente_id,
      tipo: comp.tipo,
      dias_uso: diasUso,
      motivo: args.motivo,
      tecnico: args.tecnico,
      costo: args.costo,
      notas: args.notas,
      fecha_cambio: Date.now(),
      organizacion_id: orgId,
    });

    await ctx.db.patch(args.componente_id, {
      estado: "activo",
      fecha_instalacion: args.nueva_fecha_instalacion,
    });
  },
});

export const deleteLocationComponent = mutation({
  args: { id: v.id("location_components") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "MTO");
    // Cascade: delete history records first
    const historial = await ctx.db
      .query("location_components_history")
      .withIndex("by_componente", (q: any) => q.eq("componente_id", args.id))
      .collect();
    for (const h of historial) await ctx.db.delete(h._id);
    await ctx.db.delete(args.id);
  },
});
