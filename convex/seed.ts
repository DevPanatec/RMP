import { mutation } from "./_generated/server";

// Helper para crear un ID de usuario temporal
// Nota: Estos usuarios NO tendrán credenciales de auth reales
// Solo son perfiles en la base de datos para demostración
export const seedTestUsers = mutation({
  handler: async (ctx) => {
    const users = [
      {
        email: "admin@rmp.com",
        tipo_usuario: "admin" as const,
        nombre_completo: "Administrador Test",
        telefono: "809-555-0001",
        documento: "001-0000001-0",
      },
      {
        email: "enterprise@rmp.com",
        tipo_usuario: "enterprise" as const,
        nombre_completo: "Empresa Test",
        telefono: "809-555-0002",
        documento: "001-0000002-0",
      },
      {
        email: "conductor@rmp.com",
        tipo_usuario: "conductor" as const,
        nombre_completo: "Conductor Test",
        telefono: "809-555-0003",
        documento: "001-0000003-0",
      },
    ];

    const results = [];

    for (const user of users) {
      try {
        // Verificar si ya existe un perfil con este email
        const existingProfile = await ctx.db
          .query("perfiles_usuarios")
          .withIndex("by_email", (q) => q.eq("email", user.email))
          .first();

        if (existingProfile) {
          results.push({
            email: user.email,
            status: "skipped",
            message: "Usuario ya existe",
          });
          continue;
        }

        // Crear un userId temporal
        // IMPORTANTE: Este usuario NO podrá hacer login sin crear la cuenta de auth
        const userId = `temp_${user.email.split("@")[0]}_${Date.now()}`;

        // Crear perfil de usuario
        const perfilId = await ctx.db.insert("perfiles_usuarios", {
          userId: userId,
          tipo_usuario: user.tipo_usuario,
          nombre_completo: user.nombre_completo,
          email: user.email,
          telefono: user.telefono,
          documento: user.documento,
          activo: true,
        });

        results.push({
          email: user.email,
          tipo: user.tipo_usuario,
          status: "profile_created",
          message: "Perfil creado - Necesita registrarse con esta cuenta",
          perfilId: perfilId,
        });
      } catch (err) {
        results.push({
          email: user.email,
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return {
      results,
      warning: "Estos perfiles NO tienen credenciales de auth. Usa http://localhost:8000/?seed para crear usuarios completos con auth.",
    };
  },
});

// Mutation para eliminar todos los usuarios de prueba
export const clearTestUsers = mutation({
  handler: async (ctx) => {
    const testEmails = [
      "admin@rmp.com",
      "enterprise@rmp.com",
      "conductor@rmp.com",
    ];

    const results = [];

    for (const email of testEmails) {
      const profile = await ctx.db
        .query("perfiles_usuarios")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (profile) {
        await ctx.db.delete(profile._id);
        results.push({ email, status: "deleted" });
      } else {
        results.push({ email, status: "not_found" });
      }
    }

    return results;
  },
});
