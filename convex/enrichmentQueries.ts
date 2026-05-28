import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Resuelve model_year_id desde vehiculo (busca/crea make+model+year en KB).
// Usada por enrichment.ts (que es "use node").
export const resolveModelYearId = internalQuery({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }) => {
    const veh = await ctx.db.get(vehiculo_id);
    if (!veh?.marca || !veh?.modelo || !veh?.anio) return null;

    const slug = veh.marca.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const make = await ctx.db.query("makes").withIndex("by_slug", q => q.eq("slug", slug)).first();
    if (!make) return null;

    const models = await ctx.db.query("models").withIndex("by_make", q => q.eq("make_id", make._id)).collect();
    const matchModel = models.find(m =>
      m.nombre.toLowerCase().trim() === veh.modelo!.toLowerCase().trim()
    );
    if (!matchModel) return null;

    const my = await ctx.db.query("model_years")
      .withIndex("by_model_year", q => q.eq("model_id", matchModel._id).eq("year", veh.anio!))
      .first();
    return my?._id ?? null;
  },
});

// Retorna info basica del vehiculo + refs KB para enrichment.
export const getVehicleBasics = internalQuery({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }) => {
    const veh = await ctx.db.get(vehiculo_id);
    if (!veh) return null;

    const equipMap: Record<string, string> = {
      barredora: "barredora",
      compactador: "compactador",
      camion_carga: "camion_carga",
      bus: "bus",
      pickup: "pickup",
      cisterna: "cisterna",
      fumigadora: "fumigadora",
    };
    const equipClass = veh.tipo_vehiculo ? equipMap[veh.tipo_vehiculo] : null;

    let make_id = null;
    let model_id = null;
    let model_year_id = null;

    if (veh.marca && veh.modelo) {
      const slug = veh.marca.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const make = await ctx.db.query("makes").withIndex("by_slug", q => q.eq("slug", slug)).first();
      if (make) {
        make_id = make._id;
        const models = await ctx.db.query("models").withIndex("by_make", q => q.eq("make_id", make._id)).collect();
        const matchModel = models.find(m =>
          m.nombre.toLowerCase().trim() === veh.modelo!.toLowerCase().trim()
        );
        if (matchModel) {
          model_id = matchModel._id;
          if (veh.anio) {
            const my = await ctx.db.query("model_years")
              .withIndex("by_model_year", q => q.eq("model_id", matchModel._id).eq("year", veh.anio!))
              .first();
            if (my) model_year_id = my._id;
          }
        }
      }
    }

    return {
      marca: veh.marca,
      modelo: veh.modelo,
      anio: veh.anio,
      tipo_vehiculo: veh.tipo_vehiculo,
      equipment_class: equipClass,
      organizacion_id: veh.organizacion_id,
      make_id,
      model_id,
      model_year_id,
    };
  },
});
