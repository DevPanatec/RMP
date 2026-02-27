import { mutation } from "./_generated/server";

/**
 * Seed system volume presets for maintenance module
 *
 * Run once manually: npx convex run seedVolumePresets:seedSystemPresets
 *
 * This creates 4 default system presets that all users can access.
 */
export const seedSystemPresets = mutation({
  handler: async (ctx) => {
    // Check if system presets already exist
    const existing = await ctx.db
      .query("maintenance_volume_presets")
      .withIndex("by_is_custom", (q) => q.eq("is_custom", false))
      .collect();

    if (existing.length > 0) {
      console.log("✅ System presets already exist, skipping seed");
      return { success: false, message: "System presets already exist", count: existing.length };
    }

    const SYSTEM_PRESETS = [
      {
        label: 'Descarga Completa (Tanque Lleno)',
        volume_gallons: 6000,
        cost_per_gallon: 0.11,
        total_cost: 660.00,
        description: 'Descarga completa del tanque de agua de 6000 galones',
        is_custom: false,
        is_global: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
      },
      {
        label: 'Descarga Parcial (Medio Tanque)',
        volume_gallons: 3000,
        cost_per_gallon: 0.11,
        total_cost: 330.00,
        description: 'Descarga parcial de aproximadamente medio tanque (3000 galones)',
        is_custom: false,
        is_global: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
      },
      {
        label: 'Descarga Mínima (Mantenimiento Ligero)',
        volume_gallons: 1500,
        cost_per_gallon: 0.11,
        total_cost: 165.00,
        description: 'Descarga mínima para mantenimiento ligero o limpieza rutinaria',
        is_custom: false,
        is_global: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
      },
      {
        label: 'Descarga de Emergencia',
        volume_gallons: 6000,
        cost_per_gallon: 0.11,
        total_cost: 660.00,
        description: 'Descarga completa de emergencia para situaciones críticas',
        is_custom: false,
        is_global: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
      },
    ];

    const insertedIds = [];
    for (const preset of SYSTEM_PRESETS) {
      const id = await ctx.db.insert("maintenance_volume_presets", preset);
      insertedIds.push(id);
      console.log(`✅ Created system preset: ${preset.label}`);
    }

    console.log(`✅ Seeded ${SYSTEM_PRESETS.length} system volume presets`);
    return {
      success: true,
      count: SYSTEM_PRESETS.length,
      ids: insertedIds,
      message: `Successfully seeded ${SYSTEM_PRESETS.length} system presets`
    };
  },
});
