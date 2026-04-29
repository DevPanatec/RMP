import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const LEGACY_NAME = "Legacy / Sin Proyecto";

// Mutation única: asigna proyecto_id "Legacy" a todos los registros que no lo tengan.
// Idempotente: se puede ejecutar varias veces.
// Run: `npx convex run seed/migrateToMultiProject:run`
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Crear proyecto Legacy si no existe
    const existentes = await ctx.db
      .query("proyectos")
      .filter((q) => q.eq(q.field("nombre"), LEGACY_NAME))
      .collect();
    let legacyId: Id<"proyectos">;
    if (existentes.length > 0) {
      legacyId = existentes[0]._id;
    } else {
      legacyId = await ctx.db.insert("proyectos", {
        nombre: LEGACY_NAME,
        descripcion: "Proyecto creado automáticamente para registros pre-migración multi-proyecto.",
        activo: true,
      });
    }

    const counts = {
      proyecto_legacy_id: legacyId,
      rutas: 0,
      asignaciones_rutas: 0,
      salas: 0,
      lugares: 0,
      cleaning_assignments: 0,
      cleaning_reports: 0,
      fumigation_assignments: 0,
      fumigation_reports: 0,
      route_progress: 0,
      route_reports: 0,
      route_events: 0,
      reportes_riesgo: 0,
      vehiculos_proyecto_asignado_limpio: 0,
    };

    // 2. Backfill base: rutas, asignaciones, salas, lugares
    for (const r of await ctx.db.query("rutas").collect()) {
      if (!r.proyecto_id) {
        await ctx.db.patch(r._id, { proyecto_id: legacyId });
        counts.rutas++;
      }
    }
    for (const a of await ctx.db.query("asignaciones_rutas").collect()) {
      if (!a.proyecto_id) {
        // Derivar de la ruta si tiene
        const ruta = await ctx.db.get(a.ruta_id);
        await ctx.db.patch(a._id, { proyecto_id: ruta?.proyecto_id ?? legacyId });
        counts.asignaciones_rutas++;
      }
    }
    for (const s of await ctx.db.query("salas").collect()) {
      if (!s.proyecto_id) {
        await ctx.db.patch(s._id, { proyecto_id: legacyId });
        counts.salas++;
      }
    }
    for (const l of await ctx.db.query("lugares").collect()) {
      if (!l.proyecto_id) {
        await ctx.db.patch(l._id, { proyecto_id: legacyId });
        counts.lugares++;
      }
    }

    // 3. Tablas hijas: derivar de padre
    for (const ca of await ctx.db.query("cleaning_assignments").collect()) {
      if (!ca.proyecto_id) {
        const sala = await ctx.db.get(ca.sala_id);
        await ctx.db.patch(ca._id, { proyecto_id: sala?.proyecto_id ?? legacyId });
        counts.cleaning_assignments++;
      }
    }
    for (const cr of await ctx.db.query("cleaning_reports").collect()) {
      if (!cr.proyecto_id) {
        const sala = await ctx.db.get(cr.sala_id);
        await ctx.db.patch(cr._id, { proyecto_id: sala?.proyecto_id ?? legacyId });
        counts.cleaning_reports++;
      }
    }
    for (const fa of await ctx.db.query("fumigation_assignments").collect()) {
      if (!fa.proyecto_id) {
        const lugar = await ctx.db.get(fa.lugar_id);
        await ctx.db.patch(fa._id, { proyecto_id: lugar?.proyecto_id ?? legacyId });
        counts.fumigation_assignments++;
      }
    }
    for (const fr of await ctx.db.query("fumigation_reports").collect()) {
      if (!fr.proyecto_id) {
        const lugar = await ctx.db.get(fr.lugar_id);
        await ctx.db.patch(fr._id, { proyecto_id: lugar?.proyecto_id ?? legacyId });
        counts.fumigation_reports++;
      }
    }

    // 4. Route tracking: derivar de asignación
    for (const rp of await ctx.db.query("route_progress").collect()) {
      if (!rp.proyecto_id) {
        const a = await ctx.db.get(rp.asignacion_id);
        await ctx.db.patch(rp._id, { proyecto_id: a?.proyecto_id ?? legacyId });
        counts.route_progress++;
      }
    }
    for (const rr of await ctx.db.query("route_reports").collect()) {
      if (!rr.proyecto_id) {
        let proyecto_id: Id<"proyectos"> | undefined;
        if (rr.asignacion_id) {
          const a = await ctx.db.get(rr.asignacion_id);
          proyecto_id = a?.proyecto_id;
        }
        if (!proyecto_id && rr.ruta_id) {
          const r = await ctx.db.get(rr.ruta_id);
          proyecto_id = r?.proyecto_id;
        }
        await ctx.db.patch(rr._id, { proyecto_id: proyecto_id ?? legacyId });
        counts.route_reports++;
      }
    }
    for (const re of await ctx.db.query("route_events").collect()) {
      if (!re.proyecto_id) {
        let proyecto_id: Id<"proyectos"> | undefined;
        if (re.asignacion_id) {
          const a = await ctx.db.get(re.asignacion_id);
          proyecto_id = a?.proyecto_id;
        }
        if (!proyecto_id && re.ruta_id) {
          const r = await ctx.db.get(re.ruta_id);
          proyecto_id = r?.proyecto_id;
        }
        await ctx.db.patch(re._id, { proyecto_id: proyecto_id ?? legacyId });
        counts.route_events++;
      }
    }

    // 5. Reportes de riesgo
    for (const rr of await ctx.db.query("reportes_riesgo").collect()) {
      if (!rr.proyecto_id) {
        let proyecto_id: Id<"proyectos"> | undefined;
        if (rr.ruta_id) {
          const r = await ctx.db.get(rr.ruta_id);
          proyecto_id = r?.proyecto_id;
        }
        await ctx.db.patch(rr._id, { proyecto_id: proyecto_id ?? legacyId });
        counts.reportes_riesgo++;
      }
    }

    // 6. Vehículos: limpiar proyecto_asignado_id (deprecado, vehículo es shared)
    for (const v of await ctx.db.query("vehiculos").collect()) {
      if (v.proyecto_asignado_id) {
        await ctx.db.patch(v._id, { proyecto_asignado_id: undefined });
        counts.vehiculos_proyecto_asignado_limpio++;
      }
    }

    return counts;
  },
});
