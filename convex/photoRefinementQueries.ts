import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getVehiclePhotos = internalQuery({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }) => {
    const photos = await ctx.db
      .query("vehicle_photos")
      .withIndex("by_vehiculo", q => q.eq("vehiculo_id", vehiculo_id))
      .collect();
    return photos.filter(p => p.use_as_ground_truth !== false);
  },
});

export const getCurrentParams = internalQuery({
  args: { model_year_id: v.optional(v.id("model_years")) },
  handler: async (ctx, { model_year_id }) => {
    if (!model_year_id) return null;
    const overrides = await ctx.db
      .query("template_overrides")
      .withIndex("by_model_year", q => q.eq("model_year_id", model_year_id))
      .collect();
    if (overrides.length === 0) return null;
    overrides.sort((a, b) => b.confidence - a.confidence);
    return overrides[0].param_overrides;
  },
});

// Internal: getUrl sin auth gate (action invocador valida arriba).
export const getStorageUrl = internalQuery({
  args: { storage_id: v.id("_storage") },
  handler: async (ctx, { storage_id }) => {
    return await ctx.storage.getUrl(storage_id);
  },
});
