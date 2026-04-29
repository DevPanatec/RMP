import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Migra toda la data existente a una Organización default.
// Idempotente: si ya hay orgs creadas, lanza error (no doble-corre).
//
// Uso (Convex CLI):
//   npx convex run seed/migrateToOrganizations:runMigration \
//     '{"orgNombre":"RMP Default","orgSlug":"rmp-default"}'
//
// O via Convex Dashboard → Functions → migrateToOrganizations:runMigration
export const runMigration = mutation({
  args: {
    orgNombre: v.string(),
    orgSlug: v.string(),
  },
  handler: async (ctx, args) => {
    // Guardrail: no doble-corre
    const existingOrg = await ctx.db.query("organizaciones").first();
    if (existingOrg) {
      throw new Error(
        `Ya existe al menos una organización (${existingOrg.nombre}). Migración ya ejecutada.`,
      );
    }

    // 1. Crear org default
    const orgId = await ctx.db.insert("organizaciones", {
      nombre: args.orgNombre,
      slug: args.orgSlug,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    });

    let counts: Record<string, number> = {};

    // Helper: patch all rows of a table with organizacion_id
    const patchAll = async (tableName: any) => {
      const rows = await ctx.db.query(tableName).collect();
      let count = 0;
      for (const r of rows) {
        if (!(r as any).organizacion_id) {
          await ctx.db.patch(r._id, { organizacion_id: orgId } as any);
          count++;
        }
      }
      counts[tableName] = count;
    };

    // 2. Patch all tables that carry organizacion_id
    await patchAll("perfiles_usuarios");
    await patchAll("proyectos");
    await patchAll("vehiculos");
    await patchAll("rutas");
    await patchAll("asignaciones_rutas");
    await patchAll("route_progress");
    await patchAll("route_reports");
    await patchAll("route_events");
    await patchAll("reportes_riesgo");
    await patchAll("inventario");
    await patchAll("inventario_movimientos");
    await patchAll("salas");
    await patchAll("lugares");
    await patchAll("cleaning_assignments");
    await patchAll("cleaning_reports");
    await patchAll("fumigation_assignments");
    await patchAll("fumigation_reports");
    await patchAll("maintenance_tasks");
    await patchAll("maintenance_alerts");
    await patchAll("maintenance_reports");

    return {
      success: true,
      organizacion_id: orgId,
      counts,
    };
  },
});

// Crea un super_admin sin organizacion_id.
// Usar después de runMigration para tener un usuario que pueda crear más orgs vía UI.
//
// Uso:
//   npx convex run seed/migrateToOrganizations:promoteToSuperAdmin \
//     '{"perfil_id":"<id_del_perfil>"}'
export const promoteToSuperAdmin = mutation({
  args: {
    perfil_id: v.id("perfiles_usuarios"),
  },
  handler: async (ctx, args) => {
    const perfil = await ctx.db.get(args.perfil_id);
    if (!perfil) throw new Error("Perfil no encontrado");
    await ctx.db.patch(args.perfil_id, {
      tipo_usuario: "super_admin",
      organizacion_id: undefined,
    } as any);
    return { success: true };
  },
});
