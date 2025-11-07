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
        let cantidad_disponible = 0;

        // Para items legacy con cantidad_disponible, usar ese valor
        if (item.cantidad_disponible !== undefined) {
          cantidad_disponible = item.cantidad_disponible;
        } else {
          // Para items nuevos: calcular desde movimientos de compra
          // Esto incluye stock sin asignar (almacén principal) + stock asignado
          const movimientos = await ctx.db
            .query("inventario_movimientos")
            .withIndex("by_item", (q) => q.eq("item_id", item._id))
            .collect();

          // Sumar todas las compras (representa el stock total disponible)
          cantidad_disponible = movimientos
            .filter((m) => m.tipo_movimiento === "compra")
            .reduce((sum, m) => sum + m.cantidad, 0);
        }

        return {
          ...item,
          cantidad_disponible, // Total incluyendo almacén principal y ubicaciones
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

// Crear nuevo item con ubicación inicial OPCIONAL
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
    // Ubicación inicial OPCIONAL
    lugar_id: v.optional(v.id("lugares")),
    cantidad_inicial: v.optional(v.number()),
    usuario_id: v.optional(v.id("perfiles_usuarios")),
  },
  handler: async (ctx, args) => {
    const { lugar_id, cantidad_inicial, usuario_id, ...itemData } = args;

    // Crear el item
    const itemId = await ctx.db.insert("inventario", itemData);

    // Si se proporciona ubicación, crear la ubicación inicial
    if (lugar_id && cantidad_inicial !== undefined && cantidad_inicial > 0) {
      await ctx.db.insert("inventario_ubicaciones", {
        item_id: itemId,
        lugar_id: lugar_id,
        cantidad: cantidad_inicial,
      });

      // Registrar movimiento de asignación
      await ctx.db.insert("inventario_movimientos", {
        item_id: itemId,
        tipo_movimiento: "asignacion",
        cantidad: cantidad_inicial,
        precio_unitario: args.precio_unitario,
        costo_total: args.precio_unitario ? cantidad_inicial * args.precio_unitario : undefined,
        lugar_destino_id: lugar_id,
        usuario_id: usuario_id,
        fecha: Date.now(),
        notas: "Asignación inicial al crear item",
      });
    }

    // Registrar movimiento de compra (entrada al almacén principal)
    await ctx.db.insert("inventario_movimientos", {
      item_id: itemId,
      tipo_movimiento: "compra",
      cantidad: cantidad_inicial || 0,
      precio_unitario: args.precio_unitario,
      costo_total: args.precio_unitario && cantidad_inicial ? cantidad_inicial * args.precio_unitario : undefined,
      usuario_id: usuario_id,
      fecha: Date.now(),
      notas: `Compra inicial: ${args.nombre}`,
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

// Obtener stock sin asignar de un item (almacén principal)
export const getStockSinAsignar = query({
  args: { itemId: v.id("inventario") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return 0;

    // Para items legacy con cantidad_disponible
    if (item.cantidad_disponible !== undefined) {
      return item.cantidad_disponible;
    }

    // Para items nuevos: calcular desde movimientos
    const movimientos = await ctx.db
      .query("inventario_movimientos")
      .withIndex("by_item", (q) => q.eq("item_id", args.itemId))
      .collect();

    // Sumar compras
    const totalComprado = movimientos
      .filter((m) => m.tipo_movimiento === "compra")
      .reduce((sum, m) => sum + m.cantidad, 0);

    // Restar asignaciones a ubicaciones
    const ubicaciones = await ctx.db
      .query("inventario_ubicaciones")
      .withIndex("by_item", (q) => q.eq("item_id", args.itemId))
      .collect();

    const totalAsignado = ubicaciones.reduce((sum, ub) => sum + ub.cantidad, 0);

    return Math.max(0, totalComprado - totalAsignado);
  },
});

// Asignar desde almacén principal a una ubicación
export const asignarDesdeAlmacen = mutation({
  args: {
    item_id: v.id("inventario"),
    lugar_id: v.id("lugares"),
    cantidad: v.number(),
    usuario_id: v.optional(v.id("perfiles_usuarios")),
  },
  handler: async (ctx, args) => {
    // Verificar que haya suficiente stock sin asignar
    const stockSinAsignar = await ctx.db
      .query("inventario_movimientos")
      .withIndex("by_item", (q) => q.eq("item_id", args.item_id))
      .collect();

    const totalComprado = stockSinAsignar
      .filter((m) => m.tipo_movimiento === "compra")
      .reduce((sum, m) => sum + m.cantidad, 0);

    const ubicaciones = await ctx.db
      .query("inventario_ubicaciones")
      .withIndex("by_item", (q) => q.eq("item_id", args.item_id))
      .collect();

    const totalAsignado = ubicaciones.reduce((sum, ub) => sum + ub.cantidad, 0);
    const disponible = totalComprado - totalAsignado;

    if (disponible < args.cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${disponible}, solicitado: ${args.cantidad}`);
    }

    // Verificar si ya existe esta ubicación
    const existing = await ctx.db
      .query("inventario_ubicaciones")
      .withIndex("by_item_lugar", (q) =>
        q.eq("item_id", args.item_id).eq("lugar_id", args.lugar_id)
      )
      .first();

    if (existing) {
      // Sumar a la ubicación existente
      await ctx.db.patch(existing._id, {
        cantidad: existing.cantidad + args.cantidad,
      });
    } else {
      // Crear nueva ubicación
      await ctx.db.insert("inventario_ubicaciones", {
        item_id: args.item_id,
        lugar_id: args.lugar_id,
        cantidad: args.cantidad,
      });
    }

    // Registrar movimiento de asignación
    const item = await ctx.db.get(args.item_id);
    await ctx.db.insert("inventario_movimientos", {
      item_id: args.item_id,
      tipo_movimiento: "asignacion",
      cantidad: args.cantidad,
      precio_unitario: item?.precio_unitario,
      costo_total: item?.precio_unitario ? args.cantidad * item.precio_unitario : undefined,
      lugar_destino_id: args.lugar_id,
      usuario_id: args.usuario_id,
      fecha: Date.now(),
      notas: "Asignación desde almacén principal",
    });

    return { success: true };
  },
});

// Calcular valor total del inventario (para costos)
export const getValorTotalInventario = query({
  handler: async (ctx) => {
    const items = await ctx.db.query("inventario").collect();

    let valorTotal = 0;

    for (const item of items) {
      if (!item.precio_unitario) continue;

      // Para items legacy con cantidad_disponible, usar ese valor
      if (item.cantidad_disponible !== undefined) {
        valorTotal += item.cantidad_disponible * item.precio_unitario;
        continue;
      }

      // Para items nuevos: calcular cantidad total desde movimientos de compra
      // Esto incluye el stock sin asignar (almacén principal) + stock asignado
      const movimientos = await ctx.db
        .query("inventario_movimientos")
        .withIndex("by_item", (q) => q.eq("item_id", item._id))
        .collect();

      // Sumar todas las compras (representa el stock total disponible)
      const totalComprado = movimientos
        .filter((m) => m.tipo_movimiento === "compra")
        .reduce((sum, m) => sum + m.cantidad, 0);

      valorTotal += totalComprado * item.precio_unitario;
    }

    return Math.round(valorTotal * 100) / 100; // Redondear a 2 decimales
  },
});

// Obtener movimientos por periodo (para historial y gráficas)
export const getMovimientosPorPeriodo = query({
  args: {
    desde: v.optional(v.number()), // timestamp
    hasta: v.optional(v.number()), // timestamp
    tipo_movimiento: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("inventario_movimientos");

    // Filtrar por fecha si se proporciona
    if (args.desde || args.hasta) {
      query = query.withIndex("by_fecha");
    }

    let movimientos = await query.collect();

    // Filtrar por rango de fechas
    if (args.desde) {
      movimientos = movimientos.filter((m) => m.fecha >= args.desde!);
    }
    if (args.hasta) {
      movimientos = movimientos.filter((m) => m.fecha <= args.hasta!);
    }

    // Filtrar por tipo
    if (args.tipo_movimiento) {
      movimientos = movimientos.filter((m) => m.tipo_movimiento === args.tipo_movimiento);
    }

    // Enriquecer con datos del item
    const movimientosConDatos = await Promise.all(
      movimientos.map(async (mov) => {
        const item = await ctx.db.get(mov.item_id);
        const lugar_destino = mov.lugar_destino_id ? await ctx.db.get(mov.lugar_destino_id) : null;

        return {
          ...mov,
          item_nombre: item?.nombre || "Desconocido",
          item_codigo: item?.codigo,
          item_tipo: item?.tipo_articulo,
          lugar_destino_nombre: lugar_destino?.nombre,
        };
      })
    );

    // Ordenar por fecha descendente
    return movimientosConDatos.sort((a, b) => b.fecha - a.fecha);
  },
});
