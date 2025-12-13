import { mutation } from "./_generated/server";

/**
 * Actualizar IMEI del vehículo GPS-TEST-001
 * HARDCODED para evitar errores de JSON
 */
export const updateGPSTestVehicle = mutation({
  handler: async (ctx) => {
    const vehiculoId = "m172zn3g6g2c6aqt27chrcyqe97wp766" as any;
    const imei = "357956371545858";

    console.log(`🔧 [Setup] Configurando IMEI para vehículo ${vehiculoId}...`);

    try {
      // Obtener el vehículo
      const vehicle = await ctx.db.get(vehiculoId);

      if (!vehicle) {
        console.error(`❌ [Setup] Vehículo no encontrado con ID: ${vehiculoId}`);
        return {
          success: false,
          error: `Vehicle not found: ${vehiculoId}`,
        };
      }

      console.log(`📋 [Setup] Vehículo encontrado: ${vehicle.placa}`);

      // Actualizar los campos de IMEI
      await ctx.db.patch(vehicle._id, {
        gps_imei: imei,
        safetag_device_id: imei,
        gps_conectado: false,
      });

      console.log(`✅ [Setup] IMEI configurado exitosamente`);
      console.log(`   Vehículo: ${vehicle.placa}`);
      console.log(`   ID: ${vehicle._id}`);
      console.log(`   IMEI: ${imei}`);
      console.log(`📡 [Setup] Webhook listo para recibir datos de SafeTag`);

      return {
        success: true,
        vehicleId: vehicle._id,
        placa: vehicle.placa,
        imei: imei,
        message: `Vehicle ${vehicle.placa} configured with IMEI ${imei}`,
      };
    } catch (error: any) {
      console.error(`❌ [Setup] Error:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
