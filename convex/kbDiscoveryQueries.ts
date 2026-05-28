import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Top makes por cantidad de vehiculos asociados. Usado por kbDiscovery para
// priorizar crawl. Convex action node-runtime no puede tener queries.

export const listTopMakesByVehicleCount = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const makes = await ctx.db.query("makes").collect();
    const allVeh = await ctx.db.query("vehiculos").collect();
    const counts = new Map<string, number>();
    for (const v of allVeh) {
      if (!v.marca) continue;
      const slug = v.marca.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    const enriched = makes.map(m => ({
      _id: m._id,
      nombre: m.nombre,
      slug: m.slug,
      vehicle_count: counts.get(m.slug) ?? 0,
    }));
    enriched.sort((a, b) => b.vehicle_count - a.vehicle_count);
    return enriched.slice(0, args.limit);
  },
});
