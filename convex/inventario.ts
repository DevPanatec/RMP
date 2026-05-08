import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireWriteRole } from "./lib/auth";

// Filtra items por scope: super_admin/cross-org ven todos; demás solo su org (estricta).
async function scopeItems(ctx: any, items: any[]) {
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin || scope.isCrossOrgViewer) return items;
  if (!scope.organizacionId) return [];
  return items.filter((i) => i.organizacion_id === scope.organizacionId);
}

// Devuelve items pre-filtrados por org via index (evita full scan + filter in-memory).
// Para super_admin/cross-org sigue full collect (es por diseño).
async function loadScopedItems(ctx: any) {
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
    return await ctx.db.query("inventario").collect();
  }
  if (!scope.organizacionId) return [];
  return await ctx.db
    .query("inventario")
    .withIndex("by_organizacion", (q: any) => q.eq("organizacion_id", scope.organizacionId))
    .collect();
}

// Generar código único para items de inventario (scoped)
export const generateCodigo = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("inventario").collect();
    const items = await scopeItems(ctx, all);
    const count = items.length + 1;
    return `MAT-${String(count).padStart(3, '0')}`;
  },
});

// Listar todos los items con cantidad total y ubicaciones (scoped)
export const list = query({
  handler: async (ctx) => {
    const items: any[] = await loadScopedItems(ctx);

    const itemsWithLocations = await Promise.all(
      items.map(async (item: any) => {
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
    const scope = await requireWriteRole(ctx);
    if (!scope.isSuperAdmin && !scope.organizacionId) {
      throw new Error("Sin organización asignada");
    }
    const orgId = scope.organizacionId ?? undefined;

    // Validar lugar si viene
    if (args.lugar_id) {
      const lugar = await ctx.db.get(args.lugar_id);
      if (!lugar) throw new Error("Lugar no encontrado");
      if (!lugar.organizacion_id) throw new Error("Lugar sin organización — requiere migración");
      await requireOrgAccess(ctx, lugar.organizacion_id);
    }

    const { lugar_id, cantidad_inicial, usuario_id, ...itemData } = args;

    // Crear el item con organizacion_id auto-attach
    const itemPayload: any = { ...itemData };
    if (orgId) itemPayload.organizacion_id = orgId;
    const itemId = await ctx.db.insert("inventario", itemPayload);

    // Si se proporciona ubicación, crear la ubicación inicial
    if (lugar_id && cantidad_inicial !== undefined && cantidad_inicial > 0) {
      await ctx.db.insert("inventario_ubicaciones", {
        item_id: itemId,
        lugar_id: lugar_id,
        cantidad: cantidad_inicial,
      });

      // Registrar movimiento de asignación
      const movPayload: any = {
        item_id: itemId,
        tipo_movimiento: "asignacion",
        cantidad: cantidad_inicial,
        precio_unitario: args.precio_unitario,
        costo_total: args.precio_unitario ? cantidad_inicial * args.precio_unitario : undefined,
        lugar_destino_id: lugar_id,
        usuario_id: usuario_id,
        fecha: Date.now(),
        notas: "Asignación inicial al crear item",
      };
      if (orgId) movPayload.organizacion_id = orgId;
      await ctx.db.insert("inventario_movimientos", movPayload);
    }

    // Registrar movimiento de compra (entrada al almacén principal)
    const compraPayload: any = {
      item_id: itemId,
      tipo_movimiento: "compra",
      cantidad: cantidad_inicial || 0,
      precio_unitario: args.precio_unitario,
      costo_total: args.precio_unitario && cantidad_inicial ? cantidad_inicial * args.precio_unitario : undefined,
      usuario_id: usuario_id,
      fecha: Date.now(),
      notas: `Compra inicial: ${args.nombre}`,
    };
    if (orgId) compraPayload.organizacion_id = orgId;
    await ctx.db.insert("inventario_movimientos", compraPayload);

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
    await requireWriteRole(ctx);
    const item = await ctx.db.get(args.item_id);
    if (!item) throw new Error("Item no encontrado");
    if (!item.organizacion_id) throw new Error("Item sin organización — requiere migración");
    await requireOrgAccess(ctx, item.organizacion_id);
    const lugar = await ctx.db.get(args.lugar_id);
    if (!lugar) throw new Error("Lugar no encontrado");
    if (!lugar.organizacion_id) throw new Error("Lugar sin organización — requiere migración");
    await requireOrgAccess(ctx, lugar.organizacion_id);

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
    await requireWriteRole(ctx);
    const ub = await ctx.db.get(args.ubicacion_id);
    if (!ub) throw new Error("Ubicación no encontrada");
    const item = await ctx.db.get(ub.item_id);
    if (!item) throw new Error("Item no encontrado");
    if (!item.organizacion_id) throw new Error("Item sin organización — requiere migración");
    await requireOrgAccess(ctx, item.organizacion_id);
    return await ctx.db.patch(args.ubicacion_id, { cantidad: args.cantidad });
  },
});

// Eliminar item de una ubicación
export const removeFromLocation = mutation({
  args: { ubicacion_id: v.id("inventario_ubicaciones") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const ub = await ctx.db.get(args.ubicacion_id);
    if (!ub) throw new Error("Ubicación no encontrada");
    const item = await ctx.db.get(ub.item_id);
    if (!item) throw new Error("Item no encontrado");
    if (!item.organizacion_id) throw new Error("Item sin organización — requiere migración");
    await requireOrgAccess(ctx, item.organizacion_id);
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
    await requireWriteRole(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item no encontrado");
    if (!item.organizacion_id) throw new Error("Item sin organización — requiere migración");
    await requireOrgAccess(ctx, item.organizacion_id);
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

// Eliminar item completo (y todas sus ubicaciones)
export const remove = mutation({
  args: { id: v.id("inventario") },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item no encontrado");
    if (!item.organizacion_id) throw new Error("Item sin organización — requiere migración");
    await requireOrgAccess(ctx, item.organizacion_id);

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

// Listar todos los lugares activos (para selectores) — scoped por org
export const getLugaresActivos = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const all = await ctx.db
      .query("lugares")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return all;
    if (!scope.organizacionId) return [];
    // Lugares con organizacion_id directo: filtrar por org
    // Lugares con solo proyecto_id: resolver org via proyecto
    const proyectoCache = new Map<string, any>();
    const result: any[] = [];
    for (const l of all) {
      if (l.organizacion_id) {
        if (l.organizacion_id === scope.organizacionId) result.push(l);
      } else if (l.proyecto_id) {
        let proyecto = proyectoCache.get(l.proyecto_id as string);
        if (!proyecto) {
          proyecto = await ctx.db.get(l.proyecto_id);
          proyectoCache.set(l.proyecto_id as string, proyecto);
        }
        if (proyecto?.organizacion_id === scope.organizacionId) result.push(l);
      }
    }
    return result;
  },
});

// Obtener stock sin asignar de un item (almacén principal) — scoped por org
export const getStockSinAsignar = query({
  args: { itemId: v.id("inventario") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return 0;
    // Validar acceso al item
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId || item.organizacion_id !== scope.organizacionId) return 0;
    }

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
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const item = await ctx.db.get(args.item_id);
    if (!item) throw new Error("Item no encontrado");
    if (!item.organizacion_id) throw new Error("Item sin organización — requiere migración");
    await requireOrgAccess(ctx, item.organizacion_id);
    const lugar = await ctx.db.get(args.lugar_id);
    if (!lugar) throw new Error("Lugar no encontrado");
    if (!lugar.organizacion_id) throw new Error("Lugar sin organización — requiere migración");
    await requireOrgAccess(ctx, lugar.organizacion_id);

    // Anti-race: usar item.cantidad_disponible como single source of truth para stock
    // sin asignar. Convex serializa writes por documento → concurrent calls a esta
    // mutation conflictan en el patch del item y OCC reintenta automáticamente.
    let disponible: number;
    if (typeof item.cantidad_disponible === "number") {
      disponible = item.cantidad_disponible;
    } else {
      // Bootstrap legacy: calcular desde movimientos UNA vez y materializar.
      const movs = await ctx.db
        .query("inventario_movimientos")
        .withIndex("by_item", (q) => q.eq("item_id", args.item_id))
        .collect();
      const totalComprado = movs.filter((m) => m.tipo_movimiento === "compra").reduce((s, m) => s + m.cantidad, 0);
      const ubsAll = await ctx.db
        .query("inventario_ubicaciones")
        .withIndex("by_item", (q) => q.eq("item_id", args.item_id))
        .collect();
      const totalAsignado = ubsAll.reduce((sum, ub) => sum + ub.cantidad, 0);
      disponible = totalComprado - totalAsignado;
    }

    if (disponible < args.cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${disponible}, solicitado: ${args.cantidad}`);
    }

    // Decrementar atómicamente (esto fuerza write-conflict si hay race).
    await ctx.db.patch(args.item_id, { cantidad_disponible: disponible - args.cantidad });

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

    // Derivar proyecto_id desde el lugar si no se pasó explícito
    const proyecto_id = args.proyecto_id ?? lugar?.proyecto_id;

    // Registrar movimiento de asignación
    const movPayload: any = {
      item_id: args.item_id,
      tipo_movimiento: "asignacion",
      cantidad: args.cantidad,
      precio_unitario: item?.precio_unitario,
      costo_total: item?.precio_unitario ? args.cantidad * item.precio_unitario : undefined,
      lugar_destino_id: args.lugar_id,
      usuario_id: args.usuario_id,
      proyecto_id,
      fecha: Date.now(),
      notas: "Asignación desde almacén principal",
    };
    if (item.organizacion_id) movPayload.organizacion_id = item.organizacion_id;
    await ctx.db.insert("inventario_movimientos", movPayload);

    return { success: true };
  },
});

// Calcular valor total del inventario (para costos) — scoped por org
export const getValorTotalInventario = query({
  handler: async (ctx) => {
    const allItems = await ctx.db.query("inventario").collect();
    const items = await scopeItems(ctx, allItems);

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

// Obtener movimientos de un item específico (para historial en modal) — scoped por org
export const getMovimientosByItem = query({
  args: { itemId: v.id("inventario") },
  handler: async (ctx, args) => {
    // Validar acceso al item
    const item = await ctx.db.get(args.itemId);
    if (!item) return [];
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId || item.organizacion_id !== scope.organizacionId) return [];
    }
    const movimientos = await ctx.db
      .query("inventario_movimientos")
      .withIndex("by_item", (q) => q.eq("item_id", args.itemId))
      .collect();

    // Enriquecer con datos relacionados
    const movimientosConDatos = await Promise.all(
      movimientos.map(async (mov) => {
        const item = await ctx.db.get(mov.item_id);
        const usuario = mov.usuario_id ? await ctx.db.get(mov.usuario_id) : null;
        const lugar_origen = mov.lugar_origen_id ? await ctx.db.get(mov.lugar_origen_id) : null;
        const lugar_destino = mov.lugar_destino_id ? await ctx.db.get(mov.lugar_destino_id) : null;

        return {
          ...mov,
          item_nombre: item?.nombre || "Desconocido",
          item_codigo: item?.codigo,
          usuario_nombre: usuario?.nombre_completo || "Sistema",
          lugar_origen_nombre: lugar_origen?.nombre,
          lugar_destino_nombre: lugar_destino?.nombre,
        };
      })
    );

    // Ordenar por fecha descendente
    return movimientosConDatos.sort((a, b) => b.fecha - a.fecha);
  },
});

// Registrar nueva compra (añadir stock a un item existente)
export const registrarCompra = mutation({
  args: {
    item_id: v.id("inventario"),
    cantidad: v.number(),
    precio_unitario: v.number(),
    proveedor: v.optional(v.string()),
    notas: v.optional(v.string()),
    usuario_id: v.optional(v.id("perfiles_usuarios")),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    const item = await ctx.db.get(args.item_id);
    if (!item) {
      throw new Error("Item no encontrado");
    }
    if (!item.organizacion_id) throw new Error("Item sin organización — requiere migración");
    await requireOrgAccess(ctx, item.organizacion_id);

    // Actualizar precio unitario del item si es diferente
    if (args.precio_unitario !== item.precio_unitario) {
      await ctx.db.patch(args.item_id, {
        precio_unitario: args.precio_unitario,
      });
    }

    // Actualizar proveedor si se proporciona
    if (args.proveedor && args.proveedor !== item.proveedor) {
      await ctx.db.patch(args.item_id, {
        proveedor: args.proveedor,
      });
    }

    // Incrementar cantidad disponible
    const nuevaCantidad = (item.cantidad_disponible || 0) + args.cantidad;
    await ctx.db.patch(args.item_id, {
      cantidad_disponible: nuevaCantidad,
    });

    // Registrar movimiento de compra
    const movPayload: any = {
      item_id: args.item_id,
      tipo_movimiento: "compra",
      cantidad: args.cantidad,
      precio_unitario: args.precio_unitario,
      costo_total: args.cantidad * args.precio_unitario,
      usuario_id: args.usuario_id,
      fecha: Date.now(),
      notas: args.notas || `Compra: ${item.nombre}`,
    };
    if (item.organizacion_id) movPayload.organizacion_id = item.organizacion_id;
    await ctx.db.insert("inventario_movimientos", movPayload);

    return { success: true };
  },
});

// Obtener costos agrupados por tipo de artículo — scoped por org
export const getCostosPorTipo = query({
  handler: async (ctx) => {
    const allItems = await ctx.db.query("inventario").collect();
    const items = await scopeItems(ctx, allItems);

    const costosPorTipo: Record<string, { valor: number; cantidad_items: number; cantidad_unidades: number }> = {
      herramienta: { valor: 0, cantidad_items: 0, cantidad_unidades: 0 },
      insumo: { valor: 0, cantidad_items: 0, cantidad_unidades: 0 },
      equipo: { valor: 0, cantidad_items: 0, cantidad_unidades: 0 },
      uniforme: { valor: 0, cantidad_items: 0, cantidad_unidades: 0 },
    };

    for (const item of items) {
      if (!item.precio_unitario) continue;

      const tipo = item.tipo_articulo || "insumo";

      // Calcular cantidad total (igual que en getValorTotalInventario)
      let cantidad = 0;
      if (item.cantidad_disponible !== undefined) {
        cantidad = item.cantidad_disponible;
      } else {
        const movimientos = await ctx.db
          .query("inventario_movimientos")
          .withIndex("by_item", (q) => q.eq("item_id", item._id))
          .collect();
        cantidad = movimientos
          .filter((m) => m.tipo_movimiento === "compra")
          .reduce((sum, m) => sum + m.cantidad, 0);
      }

      const valor = cantidad * item.precio_unitario;

      if (costosPorTipo[tipo]) {
        costosPorTipo[tipo].valor += valor;
        costosPorTipo[tipo].cantidad_items += 1;
        costosPorTipo[tipo].cantidad_unidades += cantidad;
      }
    }

    // Calcular total y porcentajes
    const valorTotal = Object.values(costosPorTipo).reduce((sum, t) => sum + t.valor, 0);

    return Object.entries(costosPorTipo).map(([tipo, datos]) => ({
      tipo,
      valor: Math.round(datos.valor * 100) / 100,
      porcentaje: valorTotal > 0 ? ((datos.valor / valorTotal) * 100).toFixed(1) : "0.0",
      cantidad_items: datos.cantidad_items,
      cantidad_unidades: datos.cantidad_unidades,
    }));
  },
});

// Obtener consumo agrupado por tipo de artículo (gasto real por uso, no compra).
export const getConsumoPorTipo = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const movimientos = await ctx.db
      .query("inventario_movimientos")
      .withIndex("by_tipo", (q) => q.eq("tipo_movimiento", "consumo"))
      .collect();

    // Filtrar por scope.
    const scoped = scope.isSuperAdmin || scope.isCrossOrgViewer
      ? movimientos
      : (scope.organizacionId
          ? movimientos.filter((m) => m.organizacion_id === scope.organizacionId)
          : []);

    const consumoPorTipo: Record<string, { valor: number; cantidad_unidades: number }> = {
      herramienta: { valor: 0, cantidad_unidades: 0 },
      insumo: { valor: 0, cantidad_unidades: 0 },
      equipo: { valor: 0, cantidad_unidades: 0 },
      uniforme: { valor: 0, cantidad_unidades: 0 },
    };

    // Cache de items para no re-query.
    const itemCache = new Map<string, any>();
    for (const mov of scoped) {
      let item = itemCache.get(mov.item_id as string);
      if (!item) {
        item = await ctx.db.get(mov.item_id);
        itemCache.set(mov.item_id as string, item);
      }
      if (!item) continue;
      const tipo = item.tipo_articulo || "insumo";
      const valor = mov.costo_total || 0;
      if (consumoPorTipo[tipo]) {
        consumoPorTipo[tipo].valor += valor;
        consumoPorTipo[tipo].cantidad_unidades += mov.cantidad;
      }
    }

    const valorTotal = Object.values(consumoPorTipo).reduce((sum, t) => sum + t.valor, 0);

    return Object.entries(consumoPorTipo).map(([tipo, datos]) => ({
      tipo,
      valor: Math.round(datos.valor * 100) / 100,
      porcentaje: valorTotal > 0 ? ((datos.valor / valorTotal) * 100).toFixed(1) : "0.0",
      cantidad_unidades: datos.cantidad_unidades,
    }));
  },
});

// Obtener historial de compras agrupado por mes (para gráficas)
export const getHistorialComprasPorMes = query({
  args: {
    meses: v.optional(v.number()), // Cantidad de meses hacia atrás (default: 12)
  },
  handler: async (ctx, args) => {
    const mesesAtras = args.meses || 12;
    const ahora = Date.now();
    const fechaInicio = ahora - mesesAtras * 30 * 24 * 60 * 60 * 1000; // Aproximado

    const scope = await getAuthScope(ctx);
    const movimientos = await ctx.db
      .query("inventario_movimientos")
      .withIndex("by_tipo", (q) => q.eq("tipo_movimiento", "compra"))
      .collect();

    // Filtrar por fecha y org
    const movimientosFiltrados = movimientos.filter((m) => {
      if (m.fecha < fechaInicio) return false;
      if (scope.isSuperAdmin || scope.isCrossOrgViewer) return true;
      if (!scope.organizacionId) return false;
      return m.organizacion_id === scope.organizacionId;
    });

    // Agrupar por mes
    const comprasPorMes: Record<string, number> = {};

    movimientosFiltrados.forEach((mov) => {
      const fecha = new Date(mov.fecha);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;

      if (!comprasPorMes[mesKey]) {
        comprasPorMes[mesKey] = 0;
      }
      comprasPorMes[mesKey] += mov.costo_total || 0;
    });

    // Convertir a array y ordenar
    const resultado = Object.entries(comprasPorMes)
      .map(([mes, total]) => ({
        mes,
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    return resultado;
  },
});

// Registrar consumo de inventario: decrementa stock por uso. Auth-gated por proyecto del lugar.
export const registrarConsumo = mutation({
  args: {
    item_id: v.id("inventario"),
    lugar_id: v.id("lugares"),
    cantidad: v.number(),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.cantidad <= 0) throw new Error("Cantidad debe ser positiva");

    const scope = await requireWriteRole(ctx);
    const item = await ctx.db.get(args.item_id);
    if (!item) throw new Error("Item no encontrado");
    if (!item.organizacion_id) throw new Error("Item sin organización — requiere migración");
    await requireOrgAccess(ctx, item.organizacion_id);

    const lugar = await ctx.db.get(args.lugar_id);
    if (!lugar) throw new Error("Lugar no encontrado");
    if (lugar.proyecto_id) {
      // Best-effort: si el lugar tiene proyecto, validar acceso al proyecto.
      // No bloquea si lugar está sin proyecto (legacy).
      const proyecto = await ctx.db.get(lugar.proyecto_id);
      if (proyecto && !scope.isSuperAdmin && proyecto.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado al proyecto del lugar");
      }
    }

    // Buscar ubicación item+lugar.
    const ubicacion = await ctx.db
      .query("inventario_ubicaciones")
      .withIndex("by_item_lugar", (q) => q.eq("item_id", args.item_id).eq("lugar_id", args.lugar_id))
      .first();

    if (!ubicacion || ubicacion.cantidad < args.cantidad) {
      throw new Error(`Stock insuficiente en ${lugar.nombre} (disponible: ${ubicacion?.cantidad ?? 0}, solicitado: ${args.cantidad})`);
    }

    // Decrementar ubicación.
    await ctx.db.patch(ubicacion._id, { cantidad: ubicacion.cantidad - args.cantidad });

    // Decrementar legacy cantidad_disponible si existe (mantener consistencia).
    if (typeof item.cantidad_disponible === "number") {
      await ctx.db.patch(args.item_id, {
        cantidad_disponible: Math.max(0, item.cantidad_disponible - args.cantidad),
      });
    }

    // Insertar movimiento type=consumo.
    await ctx.db.insert("inventario_movimientos", {
      item_id: args.item_id,
      lugar_origen_id: args.lugar_id,
      tipo_movimiento: "consumo",
      cantidad: args.cantidad,
      precio_unitario: item.precio_unitario,
      costo_total: (item.precio_unitario || 0) * args.cantidad,
      usuario_id: scope.perfil?._id,
      notas: args.notas,
      fecha: Date.now(),
      organizacion_id: item.organizacion_id,
    });

    return { success: true, restante: ubicacion.cantidad - args.cantidad };
  },
});

// Obtener top items más costosos
export const getTopItemsMasCostosos = query({
  args: {
    limit: v.optional(v.number()), // Cantidad de items a retornar (default: 10)
  },
  handler: async (ctx, args) => {
    const limite = args.limit || 10;
    const allRaw = await ctx.db.query("inventario").collect();
    const items = await scopeItems(ctx, allRaw);

    const itemsConValor = await Promise.all(
      items.map(async (item) => {
        if (!item.precio_unitario) return null;

        // Calcular cantidad total
        let cantidad = 0;
        if (item.cantidad_disponible !== undefined) {
          cantidad = item.cantidad_disponible;
        } else {
          const movimientos = await ctx.db
            .query("inventario_movimientos")
            .withIndex("by_item", (q) => q.eq("item_id", item._id))
            .collect();
          cantidad = movimientos
            .filter((m) => m.tipo_movimiento === "compra")
            .reduce((sum, m) => sum + m.cantidad, 0);
        }

        const valorTotal = cantidad * item.precio_unitario;

        return {
          _id: item._id,
          codigo: item.codigo,
          nombre: item.nombre,
          tipo_articulo: item.tipo_articulo,
          cantidad,
          precio_unitario: item.precio_unitario,
          valor_total: Math.round(valorTotal * 100) / 100,
          unidad_medida: item.unidad_medida,
        };
      })
    );

    // Filtrar nulls y ordenar por valor descendente
    const itemsValidos = itemsConValor.filter((item) => item !== null) as Array<{
      _id: any;
      codigo: string | undefined;
      nombre: string;
      tipo_articulo: string;
      cantidad: number;
      precio_unitario: number;
      valor_total: number;
      unidad_medida: string | undefined;
    }>;

    itemsValidos.sort((a, b) => b.valor_total - a.valor_total);

    return itemsValidos.slice(0, limite);
  },
});
