import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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
  args: {
    tipo: v.union(
      v.literal("super_admin"),
      v.literal("admin"),
      v.literal("enterprise"),
      v.literal("conductor"),
      v.literal("viewer"),
    ),
  },
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
    tipo_usuario: v.union(
      v.literal("super_admin"),
      v.literal("admin"),
      v.literal("enterprise"),
      v.literal("conductor"),
      v.literal("viewer"),
    ),
    nombre_completo: v.string(),
    email: v.string(),
    telefono: v.optional(v.string()),
    documento: v.optional(v.string()),
    foto_url: v.optional(v.string()),
    vehiculo_asignado_id: v.optional(v.id("vehiculos")),
    organizacion_id: v.optional(v.id("organizaciones")),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    // Obtener el userId del usuario autenticado
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Usuario no autenticado");
    }

    if (args.tipo_usuario !== "super_admin" && !args.organizacion_id) {
      throw new Error("organizacion_id es requerido para admin/enterprise/conductor");
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
    if (args.tipo_usuario !== "super_admin" && args.organizacion_id) {
      cleanedArgs.organizacion_id = args.organizacion_id;
    }

    return await ctx.db.insert("perfiles_usuarios", cleanedArgs);
  },
});

// Create profile by userId (for signup flow, requires userId from auth)
export const createByUserId = mutation({
  args: {
    userId: v.string(),
    tipo_usuario: v.union(
      v.literal("super_admin"),
      v.literal("admin"),
      v.literal("enterprise"),
      v.literal("conductor"),
      v.literal("viewer"),
    ),
    nombre_completo: v.string(),
    email: v.string(),
    telefono: v.optional(v.string()),
    documento: v.optional(v.string()),
    foto_url: v.optional(v.string()),
    vehiculo_asignado_id: v.optional(v.id("vehiculos")),
    organizacion_id: v.optional(v.id("organizaciones")),
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

    if (args.tipo_usuario !== "super_admin" && !args.organizacion_id) {
      throw new Error("organizacion_id es requerido para admin/enterprise/conductor");
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
    if (args.tipo_usuario !== "super_admin" && args.organizacion_id) {
      cleanedArgs.organizacion_id = args.organizacion_id;
    }

    return await ctx.db.insert("perfiles_usuarios", cleanedArgs);
  },
});

// Listar enterprises de un proyecto (admin only)
export const listEnterprisesByProyecto = query({
  args: { proyecto_id: v.id("proyectos") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("perfiles_usuarios")
      .withIndex("by_tipo", (q) => q.eq("tipo_usuario", "enterprise"))
      .collect();
    return all.filter((p) => p.proyecto_id === args.proyecto_id && p.activo !== false);
  },
});

// Reasignar proyecto de un perfil (admin only)
export const setProyecto = mutation({
  args: {
    perfil_id: v.id("perfiles_usuarios"),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.perfil_id, { proyecto_id: args.proyecto_id });
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
    organizacion_id: v.optional(v.id("organizaciones")),
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

    // Obtener detalles del vehículo, proyecto y organización si existen
    let vehiculo = null;
    let proyecto = null;
    let organizacion = null;

    if (perfil.vehiculo_asignado_id) {
      vehiculo = await ctx.db.get(perfil.vehiculo_asignado_id);
    }

    if (perfil.proyecto_id) {
      proyecto = await ctx.db.get(perfil.proyecto_id);
    }

    if (perfil.organizacion_id) {
      organizacion = await ctx.db.get(perfil.organizacion_id);
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
      organizacion_id: perfil.organizacion_id,
      organizacion_nombre: organizacion?.nombre || null,
      organizacion_slug: organizacion?.slug || null,
      activo: perfil.activo,
    };
  },
});

// CREATE USER VIA CLERK BACKEND API (ADMIN ONLY)
// This allows admins to create new users WITHOUT logging out
export const createUserWithClerk = action({
  args: {
    email: v.string(),
    password: v.string(),
    nombre_completo: v.string(),
    tipo_usuario: v.union(
      v.literal("super_admin"),
      v.literal("admin"),
      v.literal("enterprise"),
      v.literal("conductor"),
      v.literal("viewer"),
    ),
    telefono: v.optional(v.string()),
    documento: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    // Get Clerk Secret Key from environment variables
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY not configured in environment variables");
    }

    try {
      // Step 1: Create user in Clerk via Backend API
      const clerkResponse = await fetch("https://api.clerk.com/v1/users", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: [args.email],
          password: args.password,
          first_name: args.nombre_completo.split(' ')[0],
          last_name: args.nombre_completo.split(' ').slice(1).join(' ') || '',
          skip_password_checks: false, // Validate password strength
        }),
      });

      if (!clerkResponse.ok) {
        const errorData = await clerkResponse.json();
        throw new Error(`Clerk API error: ${JSON.stringify(errorData)}`);
      }

      const clerkUser = await clerkResponse.json();

      // Step 2: Create profile in Convex using the Clerk user ID
      // The userId format for Convex is: https://clerk-domain|user_id
      const clerkDomain = "https://peaceful-mustang-86.clerk.accounts.dev";
      const userId = `${clerkDomain}|${clerkUser.id}`;

      await ctx.runMutation(api.perfiles.createByUserId, {
        userId,
        tipo_usuario: args.tipo_usuario,
        nombre_completo: args.nombre_completo,
        email: args.email,
        telefono: args.telefono,
        documento: args.documento,
        organizacion_id: args.organizacion_id,
        proyecto_id: args.proyecto_id,
      });

      // Step 3: Also create employee record (for Personnel section)
      // Split nombre_completo into nombre and apellido
      const nameParts = args.nombre_completo.split(' ');
      const nombre = nameParts[0] || args.nombre_completo;
      const apellido = nameParts.slice(1).join(' ') || '';

      await ctx.runMutation(api.empleados.add, {
        nombre,
        apellido,
        cedula: args.documento || '',
        telefono: args.telefono,
        cargo: args.tipo_usuario === 'conductor' ? 'Conductor' :
               args.tipo_usuario === 'enterprise' ? 'Supervisor' : 'Administrador',
      });

      return {
        success: true,
        clerkUserId: clerkUser.id,
        email: args.email,
        tipo: args.tipo_usuario,
      };

    } catch (error: any) {
      console.error("❌ Error creating user:", error);

      // Parse Clerk API errors and provide user-friendly messages
      const errorMessage = error.message || "";

      // Check for specific Clerk error codes
      if (errorMessage.includes("form_password_pwned")) {
        throw new Error("La contraseña es muy débil o ha sido comprometida. Usa una contraseña más segura con mayúsculas, minúsculas, números y símbolos.");
      }

      if (errorMessage.includes("form_password_length_too_short")) {
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
      }

      if (errorMessage.includes("form_identifier_exists") || errorMessage.includes("already exists")) {
        throw new Error("Este correo electrónico ya está registrado.");
      }

      if (errorMessage.includes("form_password_validation_failed")) {
        throw new Error("La contraseña debe contener mayúsculas, minúsculas, números y símbolos.");
      }

      // Generic error
      throw new Error(errorMessage || "Error al crear el usuario. Verifica los datos e intenta nuevamente.");
    }
  },
});
