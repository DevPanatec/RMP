import { query } from "./_generated/server";

/**
 * Listar TODOS los vehículos con sus placas e IMEIs
 */
export const listAll = query({
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehiculos").collect();

    console.log("📋 [Debug] Vehículos en la base de datos:");
    console.log(`Total: ${vehicles.length} vehículos`);
    
    vehicles.forEach(v => {
      console.log(`
        ID: ${v._id}
        Placa: ${v.placa}
        Nombre: ${v.nombre || "SIN NOMBRE"}
        IMEI GPS: ${v.gps_imei || "NO CONFIGURADO"}
        SafeTag Device: ${v.safetag_device_id || "NO CONFIGURADO"}
        Estado: ${v.estado}
        ---
      `);
    });

    return vehicles.map(v => ({
      _id: v._id,
      placa: v.placa,
      nombre: v.nombre || "SIN NOMBRE",
      gps_imei: v.gps_imei || null,
      safetag_device_id: v.safetag_device_id || null,
      estado: v.estado,
      tipo_servicio: v.tipo_servicio,
    }));
  },
});
