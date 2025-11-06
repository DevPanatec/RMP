import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Generar código único para items de inventario
export const generateCodigo = query({
  handler: async (ctx) => {
    const items = await ctx.db.query("inventario").collect();
    const count = items.length + 1;
    return `MAT-${String(count).padStart(3, '0')}`;
  },
});

// Listar todos los items con cantidad total y ubicaciones
export const list = query({
  handler: async (ctx) => {
    const items = await ctx.db.query("inventario").collect();

    const itemsWithLocations = await Promise.all(
      items.map(async (item) => {
        // Obtener todas las ubicaciones de este item
        const ubicaciones = await ctx.db
          .query("inventario_ubicaciones")
          .withIndex("by_item", (q) => q.eq("item_id", item._id))
          .collect();

        // Obtener detalles de cada lugar
        const ubicacionesConDetalles = await Promise.all(
          ubicaciones.map(async (ub) => {
            const lugar = await ctx.db.get(ub.lugar_id);
            return {
              _id: ub._id,
              lugar_id: ub.lugar_id,
              lugar_nombre: lugar?.nombre || "Desconocido",
              cantidad: ub.cantidad,
            };
          })
        );

        // Calcular cantidad total
        const cantidad_disponible = ubicaciones.reduce((sum, ub) => sum + ub.cantidad, 0);

        return {
          ...item,
          cantidad_disponible, // Total de todas las ubicaciones
          ubicaciones: ubicacionesConDetalles,
          num_ubicaciones: ubicaciones.length,
        };
      })
    );

    return itemsWithLocations;
  },
});

// Obtener item específico con todas sus ubicaciones (para modal detallado)
export const getItemWithLocations = query({
  args: { itemId: v.id("inventario") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;

    // Obtener todas las ubicaciones
    const ubicaciones = await ctx.db
      .query("inventario_ubicaciones")
      .withIndex("by_item", (q) => q.eq("item_id", args.itemId))
      .collect();

    // Enriquecer con datos de lugar
    const ubicacionesConDetalles = await Promise.all(
      ubicaciones.map(async (ub) => {
        const lugar = await ctx.db.get(ub.lugar_id);
        return {
          _id: ub._id,
          lugar_id: ub.lugar_id,
          lugar_nombre: lugar?.nombre || "Desconocido",
          lugar_descripcion: lugar?.descripcion,
          cantidad: ub.cantidad,
        };
      })
    );

    const cantidad_total = ubicaciones.reduce((sum, ub) => sum + ub.cantidad, 0);

    return {
      ...item,
      cantidad_total,
      ubicaciones: ubicacionesConDetalles,
    };
  },
});

// Obtener items por tipo
export const getByTipo = query({
  args: { tipo_articulo: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventario")
      .withIndex("by_tipo", (q) => q.eq("tipo_articulo", args.tipo_articulo))
      .collect();
  },
});

// Crear nuevo item con ubicación inicial
export const add = mutation({
  args: {
    codigo: v.string(),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    tipo_articulo: v.string(),
    cantidad_minima: v.optional(v.number()),
    cantidad_maxima: v.optional(v.number()),
    unidad_medida: v.optional(v.string()),
    precio_unitario: v.optional(v.number()),
    proveedor: v.optional(v.string()),
    // Ubicación inicial
    lugar_id: v.id("lugares"),
    cantidad_inicial: v.number(),
  },
  handler: async (ctx, args) => {
    const { lugar_id, cantidad_inicial, ...itemData } = args;

    // Crear el item
    const itemId = await ctx.db.insert("inventario", itemData);

    // Crear la ubicación inicial
    await ctx.db.insert("inventario_ubicaciones", {
      item_id: itemId,
      lugar_id: lugar_id,
      cantidad: cantidad_inicial,
    });

    return itemId;
  },
});

// Añadir item existente a una nueva ubicación
export const addToLocation = mutation({
  args: {
    item_id: v.id("inventario"),
    lugar_id: v.id("lugares"),
    cantidad: v.number(),
  },
  handler: async (ctx, args) => {
    // Verificar si ya existe esta combinación
    const existing = await ctx.db
      .query("inventario_ubicaciones")
      .withIndex("by_item_lugar", (q) =>
        q.eq("item_id", args.item_id).eq("lugar_id", args.lugar_id)
      )
      .first();

    if (existing) {
      // Si ya existe, sumar la cantidad
      return await ctx.db.patch(existing._id, {
        cantidad: existing.cantidad + args.cantidad,
      });
    } else {
      // Si no existe, crear nueva entrada
      return await ctx.db.insert("inventario_ubicaciones", args);
    }
  },
});

// Actualizar cantidad en una ubicación específica
export const updateLocationQuantity = mutation({
  args: {
    ubicacion_id: v.id("inventario_ubicaciones"),
    cantidad: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.ubicacion_id, { cantidad: args.cantidad });
  },
});

// Eliminar item de una ubicación
export const removeFromLocation = mutation({
  args: { ubicacion_id: v.id("inventario_ubicaciones") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.ubicacion_id);
  },
});

// Actualizar datos del item (sin tocar ubicaciones/cantidades)
export const update = mutation({
  args: {
    id: v.id("inventario"),
    nombre: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    tipo_articulo: v.optional(v.string()),
    cantidad_minima: v.optional(v.number()),
    cantidad_maxima: v.optional(v.number()),
    unidad_medida: v.optional(v.string()),
    precio_unitario: v.optional(v.number()),
    proveedor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

// Eliminar item completo (y todas sus ubicaciones)
export const remove = mutation({
  args: { id: v.id("inventario") },
  handler: async (ctx, args) => {
    // Primero eliminar todas las ubicaciones
    const ubicaciones = await ctx.db
      .query("inventario_ubicaciones")
      .withIndex("by_item", (q) => q.eq("item_id", args.id))
      .collect();

    for (const ubicacion of ubicaciones) {
      await ctx.db.delete(ubicacion._id);
    }

    // Luego eliminar el item
    return await ctx.db.delete(args.id);
  },
});

// Listar todos los lugares activos (para selectores)
export const getLugaresActivos = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("lugares")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
  },
});
