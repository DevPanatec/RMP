import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireWriteRole } from "./lib/auth";

// Lista todas las versiones disponibles de diagrama para un vehiculo.
// Incluye:
//   1. Best-effort inference (siempre disponible, confidence 0.3-0.5)
//   2. Cada template_override del model_year (con su source + confidence)
// User puede seleccionar la preferida via setPreferredVersion.
export const listVersionsForVehicle = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const veh = await ctx.db.get(vehiculo_id);
    if (!veh) return [];
    if (
      !scope.isSuperAdmin &&
      !scope.isCrossOrgViewer &&
      veh.organizacion_id !== scope.organizacionId
    ) {
      return [];
    }

    const versions: any[] = [];

    // Siempre incluir "best-effort" como Tier 0
    versions.push({
      id: "inferred",
      source: "auto_inference",
      version_label: "Auto — best effort",
      confidence: 0.4,
      is_inferred: true,
      param_overrides: null,
      created_at: null,
    });

    // Resolver model_year_id si vehiculo tiene marca/modelo/año
    if (veh.marca && veh.modelo) {
      const slug = veh.marca.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const make = await ctx.db.query("makes").withIndex("by_slug", q => q.eq("slug", slug)).first();
      if (make) {
        const models = await ctx.db.query("models").withIndex("by_make", q => q.eq("make_id", make._id)).collect();
        const matchModel = models.find(m =>
          m.nombre.toLowerCase().trim() === veh.modelo!.toLowerCase().trim()
        );
        if (matchModel && veh.anio) {
          const my = await ctx.db.query("model_years")
            .withIndex("by_model_year", q => q.eq("model_id", matchModel._id).eq("year", veh.anio!))
            .first();
          if (my) {
            const overrides = await ctx.db.query("template_overrides")
              .withIndex("by_model_year", q => q.eq("model_year_id", my._id))
              .collect();
            // Filter por visibility
            const visible = overrides.filter(o =>
              o.visibility === "global" ||
              o.organizacion_id === scope.organizacionId ||
              scope.isSuperAdmin
            );
            for (const o of visible) {
              versions.push({
                id: o._id,
                source: o.source,
                version_label: o.version_label ?? `v ${o.source}`,
                confidence: o.confidence,
                approved_by: o.approved_by,
                approved_at: o.approved_at,
                visibility: o.visibility,
                param_overrides: o.param_overrides,
                created_at: o._creationTime,
                is_inferred: false,
              });
            }
          }
        }
      }
    }

    // Ordenar: preferred primero (si existe), luego confidence desc
    versions.sort((a, b) => {
      if (veh.preferred_template_override_id === a.id) return -1;
      if (veh.preferred_template_override_id === b.id) return 1;
      return b.confidence - a.confidence;
    });

    return {
      versions,
      preferred_id: veh.preferred_template_override_id ?? null,
    };
  },
});

// Setea la version preferida para un vehiculo.
// Pasa override_id = null para volver a auto-best.
export const setPreferredVersion = mutation({
  args: {
    vehiculo_id: v.id("vehiculos"),
    override_id: v.union(v.id("template_overrides"), v.null()),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    const veh = await ctx.db.get(args.vehiculo_id);
    if (!veh) throw new Error("Vehiculo no existe");
    if (!scope.isSuperAdmin && veh.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }

    // Validar que el override exista si no es null
    if (args.override_id) {
      const ov = await ctx.db.get(args.override_id);
      if (!ov) throw new Error("Override no existe");
    }

    await ctx.db.patch(args.vehiculo_id, {
      preferred_template_override_id: args.override_id ?? undefined,
    });

    // Audit log
    await ctx.db.insert("kb_audit_log", {
      event: "vehicle.preferred_diagram_set",
      entity_type: "vehiculo",
      entity_id: args.vehiculo_id as unknown as string,
      before_state: { preferred_template_override_id: veh.preferred_template_override_id },
      after_state: { preferred_template_override_id: args.override_id },
      user_id: scope.perfil!.userId,
      source: "user_action",
      timestamp: Date.now(),
      organizacion_id: veh.organizacion_id ?? undefined,
    });
  },
});
