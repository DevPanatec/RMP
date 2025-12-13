import { query } from "./_generated/server";

export default query({
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehiculos").collect();

    console.log("🚗 Total vehicles:", vehicles.length);

    vehicles.forEach(v => {
      console.log("\n📍 Vehicle:", {
        placa: v.placa,
        nombre: v.nombre,
        safetag_device_id: v.safetag_device_id,
        safetag_device_name: v.safetag_device_name,
        gps_imei: v.gps_imei,
      });
    });

    return vehicles;
  },
});
