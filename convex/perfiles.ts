import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get perfil by userId (for auth)
export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("perfiles_usuarios")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Get perfil by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("perfiles_usuarios")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get all profiles by tipo
export const getByTipo = query({
  args: { tipo: v.union(v.literal("admin"), v.literal("enterprise"), v.literal("conductor")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("perfiles_usuarios")
      .withIndex("by_tipo", (q) => q.eq("tipo_usuario", args.tipo))
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

// Get all active profiles
export const listActive = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("perfiles_usuarios")
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

// Create profile (for authenticated users)
export const create = mutation({
  args: {
    tipo_usuario: v.union(v.literal("admin"), v.literal("enterprise"), v.literal("conductor")),
    nombre_completo: v.string(),
    email: v.string(),
    telefono: v.optional(v.string()),
    documento: v.optional(v.string()),
    foto_url: v.optional(v.string()),
    vehiculo_asignado_id: v.optional(v.id("vehiculos")),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    // Obtener el userId del usuario autenticado
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Usuario no autenticado");
    }

    // Limpiar campos null (convertir a undefined para Convex)
    const cleanedArgs: any = {
      userId: identity.tokenIdentifier,
      tipo_usuario: args.tipo_usuario,
      nombre_completo: args.nombre_completo,
      email: args.email,
      activo: true,
    };

    // Solo agregar campos opcionales si no son null
    if (args.telefono) cleanedArgs.telefono = args.telefono;
    if (args.documento) cleanedArgs.documento = args.documento;
    if (args.foto_url) cleanedArgs.foto_url = args.foto_url;
    if (args.vehiculo_asignado_id) cleanedArgs.vehiculo_asignado_id = args.vehiculo_asignado_id;
    if (args.proyecto_id) cleanedArgs.proyecto_id = args.proyecto_id;

    return await ctx.db.insert("perfiles_usuarios", cleanedArgs);
  },
});

// Create profile by userId (for signup flow, requires userId from auth)
export const createByUserId = mutation({
  args: {
    userId: v.string(),
    tipo_usuario: v.union(v.literal("admin"), v.literal("enterprise"), v.literal("conductor")),
    nombre_completo: v.string(),
    email: v.string(),
    telefono: v.optional(v.string()),
    documento: v.optional(v.string()),
    foto_url: v.optional(v.string()),
    vehiculo_asignado_id: v.optional(v.id("vehiculos")),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    // Check if profile already exists for this userId
    const existingProfile = await ctx.db
      .query("perfiles_usuarios")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingProfile) {
      return existingProfile._id;
    }

    const cleanedArgs: any = {
      userId: args.userId,
      tipo_usuario: args.tipo_usuario,
      nombre_completo: args.nombre_completo,
      email: args.email,
      activo: true,
    };

    if (args.telefono) cleanedArgs.telefono = args.telefono;
    if (args.documento) cleanedArgs.documento = args.documento;
    if (args.foto_url) cleanedArgs.foto_url = args.foto_url;
    if (args.vehiculo_asignado_id) cleanedArgs.vehiculo_asignado_id = args.vehiculo_asignado_id;
    if (args.proyecto_id) cleanedArgs.proyecto_id = args.proyecto_id;

    return await ctx.db.insert("perfiles_usuarios", cleanedArgs);
  },
});

// Update profile
export const update = mutation({
  args: {
    id: v.id("perfiles_usuarios"),
    nombre_completo: v.optional(v.string()),
    telefono: v.optional(v.string()),
    documento: v.optional(v.string()),
    foto_url: v.optional(v.string()),
    vehiculo_asignado_id: v.optional(v.id("vehiculos")),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

// Deactivate profile (soft delete)
export const deactivate = mutation({
  args: { id: v.id("perfiles_usuarios") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { activo: false });
  },
});

// Activate profile
export const activate = mutation({
  args: { id: v.id("perfiles_usuarios") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { activo: true });
  },
});

// Get profile with vehicle and project details
export const getWithDetails = query({
  args: { id: v.id("perfiles_usuarios") },
  handler: async (ctx, args) => {
    const perfil = await ctx.db.get(args.id);
    if (!perfil) return null;

    let vehiculo = null;
    let proyecto = null;

    if (perfil.vehiculo_asignado_id) {
      vehiculo = await ctx.db.get(perfil.vehiculo_asignado_id);
    }

    if (perfil.proyecto_id) {
      proyecto = await ctx.db.get(perfil.proyecto_id);
    }

    return {
      ...perfil,
      vehiculo_placa: vehiculo?.placa || null,
      proyecto_nombre: proyecto?.nombre || null,
    };
  },
});

// Get current authenticated user profile
export const getCurrentUser = query({
  handler: async (ctx) => {
    // Obtener la identidad del usuario autenticado de Convex Auth
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Buscar el perfil por el tokenIdentifier (ID del usuario de auth)
    const perfil = await ctx.db
      .query("perfiles_usuarios")
      .withIndex("by_user", (q) => q.eq("userId", identity.tokenIdentifier))
      .first();

    if (!perfil) {
      return null;
    }

    // Obtener detalles del vehículo y proyecto si existen
    let vehiculo = null;
    let proyecto = null;

    if (perfil.vehiculo_asignado_id) {
      vehiculo = await ctx.db.get(perfil.vehiculo_asignado_id);
    }

    if (perfil.proyecto_id) {
      proyecto = await ctx.db.get(perfil.proyecto_id);
    }

    // Retornar con formato compatible con el código existente
    return {
      _id: perfil._id,
      id: perfil._id,
      email: perfil.email,
      nombre: perfil.nombre_completo,
      nombre_completo: perfil.nombre_completo,
      tipo: perfil.tipo_usuario,
      tipo_usuario: perfil.tipo_usuario,
      telefono: perfil.telefono,
      documento: perfil.documento,
      foto_url: perfil.foto_url,
      vehiculo_asignado_id: perfil.vehiculo_asignado_id,
      vehiculo_placa: vehiculo?.placa || null,
      camionAsignado: perfil.vehiculo_asignado_id,
      proyecto_id: perfil.proyecto_id,
      proyecto_nombre: proyecto?.nombre || null,
      activo: perfil.activo,
    };
  },
});
