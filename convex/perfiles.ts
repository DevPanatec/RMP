import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthScope, requireOrgAccess, requireProjectAccess, requireSuperAdmin, requireAdminWrite } from "./lib/auth";

// Get perfil by userId (auth-gated, solo el usuario mismo o super_admin).
export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");
    const scope = await getAuthScope(ctx);
    if (identity.tokenIdentifier !== args.userId && !scope.isSuperAdmin) {
      throw new Error("Acceso denegado");
    }
    return await ctx.db
      .query("perfiles_usuarios")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Get perfil by email (auth-gated, scope a la org del caller).
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");
    const row = await ctx.db
      .query("perfiles_usuarios")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!row) return null;
    if (!scope.isSuperAdmin && row.organizacion_id !== scope.organizacionId) {
      return null;
    }
    if (!scope.isSuperAdmin && !scope.isAdmin) {
      const { telefono, documento, ...safe } = row as any;
      return safe;
    }
    return row;
  },
});

// Get profiles by tipo (scoped: super_admin/cross-org ven todos; demás solo su org)
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
    const scope = await getAuthScope(ctx);
    let rows;
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
      rows = await ctx.db
        .query("perfiles_usuarios")
        .withIndex("by_tipo", (q) => q.eq("tipo_usuario", args.tipo))
        .collect();
    } else {
      if (!scope.organizacionId) return [];
      rows = await ctx.db
        .query("perfiles_usuarios")
        .withIndex("by_org_tipo", (q) =>
          q.eq("organizacion_id", scope.organizacionId!).eq("tipo_usuario", args.tipo)
        )
        .collect();
    }
    const active = rows.filter((p) => p.activo);
    if (!scope.isSuperAdmin && !scope.isAdmin) {
      return active.map(({ telefono, documento, ...safe }: any) => safe);
    }
    return active;
  },
});

// Get active profiles (scoped + PII-stripped: telefono/documento solo admin+).
export const listActive = query({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    let rows;
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
      rows = await ctx.db.query("perfiles_usuarios").collect();
    } else {
      if (!scope.organizacionId) return [];
      rows = await ctx.db
        .query("perfiles_usuarios")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    }
    const active = rows.filter((p) => p.activo);
    return active.map((p: any) => {
      const base: any = {
        _id: p._id,
        _creationTime: p._creationTime,
        userId: p.userId,
        nombre_completo: p.nombre_completo,
        email: p.email,
        tipo_usuario: p.tipo_usuario,
        foto_url: p.foto_url,
        vehiculo_asignado_id: p.vehiculo_asignado_id,
        proyecto_id: p.proyecto_id,
        organizacion_id: p.organizacion_id,
        activo: p.activo,
      };
      if (scope.isSuperAdmin || scope.isAdmin) {
        base.telefono = p.telefono;
        base.documento = p.documento;
      }
      return base;
    });
  },
});

// Shared insert logic — used by both public and internal variants.
async function insertPerfilUsuario(ctx: any, args: {
  userId: string; tipo_usuario: string; nombre_completo: string; email: string;
  telefono?: string; documento?: string; foto_url?: string;
  vehiculo_asignado_id?: any; organizacion_id?: any; proyecto_id?: any;
}) {
  const existingProfile = await ctx.db
    .query("perfiles_usuarios")
    .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
    .first();
  if (existingProfile) return existingProfile._id;

  if (args.tipo_usuario !== "super_admin" && !args.organizacion_id) {
    throw new Error("organizacion_id es requerido para admin/enterprise/conductor/viewer");
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
}

// Versión interna: solo callable desde actions server-side (createUserWithClerk).
// No expone _bypassAuth al cliente.
export const createByUserIdInternal = internalMutation({
  args: {
    userId: v.string(),
    tipo_usuario: v.union(
      v.literal("super_admin"), v.literal("admin"), v.literal("enterprise"),
      v.literal("conductor"), v.literal("viewer"),
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
  handler: async (ctx, args) => insertPerfilUsuario(ctx, args),
});

// Versión pública: requiere admin/super_admin siempre. Sin _bypassAuth.
export const createByUserId = mutation({
  args: {
    userId: v.string(),
    tipo_usuario: v.union(
      v.literal("super_admin"), v.literal("admin"), v.literal("enterprise"),
      v.literal("conductor"), v.literal("viewer"),
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
    const callerScope = await getAuthScope(ctx);
    if (!callerScope.perfil) throw new Error("No autenticado");
    if (!callerScope.isSuperAdmin && !callerScope.isAdmin) {
      throw new Error("Acceso denegado: solo admin/super_admin pueden crear perfiles");
    }
    if (args.tipo_usuario === "super_admin" && !callerScope.isSuperAdmin) {
      throw new Error("Acceso denegado: solo super_admin puede crear super_admin");
    }
    if (args.organizacion_id && !callerScope.isSuperAdmin) {
      await requireOrgAccess(ctx, args.organizacion_id);
    }
    return insertPerfilUsuario(ctx, args);
  },
});

// Listar enterprises de un proyecto (admin only) — scoped por proyecto
export const listEnterprisesByProyecto = query({
  args: { proyecto_id: v.id("proyectos") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      // Verificar acceso al proyecto antes de listar profiles
      const proyecto = await ctx.db.get(args.proyecto_id);
      if (!proyecto) return [];
      if (!scope.organizacionId || proyecto.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado");
      }
    }
    const all = await ctx.db
      .query("perfiles_usuarios")
      .withIndex("by_tipo", (q) => q.eq("tipo_usuario", "enterprise"))
      .collect();
    return all.filter((p) => p.proyecto_id === args.proyecto_id && p.activo !== false);
  },
});

// Reasignar proyecto de un perfil (admin de la org del perfil + super_admin)
export const setProyecto = mutation({
  args: {
    perfil_id: v.id("perfiles_usuarios"),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");
    if (!scope.isSuperAdmin && !scope.isAdmin) {
      throw new Error("Acceso denegado: requiere admin");
    }
    const target = await ctx.db.get(args.perfil_id);
    if (!target) throw new Error("Perfil no encontrado");
    // Admin solo puede tocar perfiles de su organización
    if (!scope.isSuperAdmin && !target.organizacion_id) {
      throw new Error("Solo super_admin puede modificar usuarios sin organización asignada");
    }
    if (!scope.isSuperAdmin && target.organizacion_id) {
      await requireOrgAccess(ctx, target.organizacion_id);
    }
    // Si se pasa proyecto, debe pertenecer a la org del perfil destino
    if (args.proyecto_id) {
      const proyecto = await ctx.db.get(args.proyecto_id);
      if (!proyecto) throw new Error("Proyecto no encontrado");
      if (target.organizacion_id && proyecto.organizacion_id !== target.organizacion_id) {
        throw new Error("Proyecto no pertenece a la organización del usuario");
      }
    }
    return await ctx.db.patch(args.perfil_id, { proyecto_id: args.proyecto_id });
  },
});

// Update profile. El propio usuario puede editar campos no-sensibles. Admin/super_admin
// pueden editar otros, pero solo super_admin cambia tipo_usuario u organizacion_id.
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
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");
    const target = await ctx.db.get(id);
    if (!target) throw new Error("Perfil no encontrado");

    const isSelf = scope.perfil._id === target._id;
    const isOrgAdmin = scope.isAdmin && target.organizacion_id === scope.organizacionId;

    if (!scope.isSuperAdmin && !isSelf && !isOrgAdmin) {
      throw new Error("Acceso denegado");
    }

    // Solo super_admin puede mover orgs.
    if (updates.organizacion_id !== undefined && !scope.isSuperAdmin) {
      throw new Error("Solo super_admin puede cambiar organizacion_id");
    }

    return await ctx.db.patch(id, updates);
  },
});

// Deactivate profile (soft delete) — solo admin de la org del target o super_admin.
export const deactivate = mutation({
  args: { id: v.id("perfiles_usuarios") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");
    const target = await ctx.db.get(args.id);
    if (!target) throw new Error("Perfil no encontrado");
    // No permitir desactivar super_admin a no ser que el caller sea super_admin.
    if (target.tipo_usuario === "super_admin" && !scope.isSuperAdmin) {
      throw new Error("Acceso denegado: no puede desactivar super_admin");
    }
    if (!scope.isSuperAdmin) {
      if (!scope.isAdmin) throw new Error("Acceso denegado: requiere admin");
      if (target.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado a perfil de otra organización");
      }
    }
    return await ctx.db.patch(args.id, { activo: false });
  },
});

// Activate profile — mismo gate que deactivate.
export const activate = mutation({
  args: { id: v.id("perfiles_usuarios") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");
    const target = await ctx.db.get(args.id);
    if (!target) throw new Error("Perfil no encontrado");
    if (!scope.isSuperAdmin) {
      if (!scope.isAdmin) throw new Error("Acceso denegado: requiere admin");
      if (target.organizacion_id !== scope.organizacionId) {
        throw new Error("Acceso denegado a perfil de otra organización");
      }
    }
    return await ctx.db.patch(args.id, { activo: true });
  },
});

// Get profile with vehicle and project details — scoped por org + PII según rol
export const getWithDetails = query({
  args: { id: v.id("perfiles_usuarios") },
  handler: async (ctx, args) => {
    const perfil = await ctx.db.get(args.id);
    if (!perfil) return null;

    // Validar que el caller tiene acceso a este perfil
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (perfil.organizacion_id && scope.organizacionId !== perfil.organizacion_id) {
        return null;
      }
    }

    let vehiculo = null;
    let proyecto = null;

    if (perfil.vehiculo_asignado_id) {
      vehiculo = await ctx.db.get(perfil.vehiculo_asignado_id);
    }

    if (perfil.proyecto_id) {
      proyecto = await ctx.db.get(perfil.proyecto_id);
    }

    const base: any = {
      ...perfil,
      vehiculo_placa: vehiculo?.placa || null,
      proyecto_nombre: proyecto?.nombre || null,
    };

    // Quitar PII para roles no-admin
    if (!scope.isSuperAdmin && !scope.isAdmin) {
      delete base.telefono;
      delete base.documento;
    }

    return base;
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
      cross_org_viewer: perfil.cross_org_viewer === true,
      restricted_operations: perfil.restricted_operations === true,
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
    // Gate: solo admin/super_admin pueden crear usuarios. Conductor/enterprise/viewer NO.
    const scope = await ctx.runQuery(api.perfiles.getCurrentUser);
    if (!scope) throw new Error("No autenticado");
    if (scope.tipo !== "super_admin" && scope.tipo !== "admin") {
      throw new Error("Acceso denegado: solo admin/super_admin pueden crear usuarios");
    }
    if (args.tipo_usuario === "super_admin" && scope.tipo !== "super_admin") {
      throw new Error("Acceso denegado: solo super_admin puede crear super_admin");
    }
    if (scope.tipo === "admin" && args.organizacion_id && args.organizacion_id !== scope.organizacion_id) {
      throw new Error("Admin solo puede crear usuarios en su propia organización");
    }

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
      const clerkDomain = process.env.CLERK_FRONTEND_DOMAIN || "https://peaceful-mustang-86.clerk.accounts.dev";
      const userId = `${clerkDomain}|${(clerkUser as any).id}`;

      await ctx.runMutation(internal.perfiles.createByUserIdInternal, {
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
        clerkUserId: (clerkUser as any).id,
        email: args.email,
        tipo: args.tipo_usuario,
      };

    } catch (error: any) {
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
