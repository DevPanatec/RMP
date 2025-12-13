import { query } from "./_generated/server";

/**
 * Debug script para verificar el vehículo con SafeTag
 */
export const checkSafeTagVehicle = query({
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehiculos").collect();

    console.log("=== ALL VEHICLES ===");
    vehicles.forEach(v => {
      console.log({
        _id: v._id,
        nombre: v.nombre,
        placa: v.placa,
        safetag_device_id: v.safetag_device_id,
        safetag_device_name: v.safetag_device_name,
        gps_latitud: v.gps_latitud,
        gps_longitud: v.gps_longitud,
        gps_en_linea: v.gps_en_linea,
      });
    });

    const safetagVehicle = vehicles.find(v => v.placa === "GPS-TEST-001");

    if (safetagVehicle) {
      console.log("\n=== SafeTag Vehicle Found ===");
      console.log(JSON.stringify(safetagVehicle, null, 2));
    } else {
      console.log("\n❌ Vehicle GPS-TEST-001 NOT FOUND");
    }

    return {
      totalVehicles: vehicles.length,
      safetagVehicleExists: !!safetagVehicle,
      safetagVehicle: safetagVehicle || null,
      allVehicles: vehicles.map(v => ({
        placa: v.placa,
        nombre: v.nombre,
        hasSafeTag: !!v.safetag_device_id,
        deviceId: v.safetag_device_id,
      })),
    };
  },
});
