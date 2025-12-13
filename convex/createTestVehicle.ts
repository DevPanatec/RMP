import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mutation para crear un vehículo de prueba con GPS SafeTag configurado
 *
 * Este vehículo de ejemplo tiene:
 * - GPS SafeTag IMEI: 357956371545858
 * - Placa: GPS-TEST-001
 * - Tipo: Camión de Recolección
 */
export const createTestVehicleWithSafeTag = mutation({
  args: {},
  handler: async (ctx) => {
    // Verificar si ya existe un vehículo con este IMEI
    const existingVehicle = await ctx.db
      .query("vehiculos")
      .withIndex("by_safetag_device", (q) =>
        q.eq("safetag_device_id", "357956371545858")
      )
      .first();

    if (existingVehicle) {
      console.log("✅ Ya existe un vehículo con este GPS SafeTag:", existingVehicle.placa);
      return {
        success: true,
        message: "Ya existe un vehículo con este GPS SafeTag",
        vehicleId: existingVehicle._id,
        placa: existingVehicle.placa,
      };
    }

    // Crear nuevo vehículo
    const vehicleId = await ctx.db.insert("vehiculos", {
      nombre: "Camión Recolector con SafeTag GPS",
      placa: "GPS-TEST-001",
      marca: "Chevrolet",
      modelo: "NPR",
      anio: 2023,
      tipo: "camion",
      tipo_servicio: "recoleccion",
      estado: "disponible",
      capacidad_carga: 5000,
      combustible_nivel: 75,
      kilometraje: 15000,

      // Campos GPS SafeTag
      safetag_device_id: "357956371545858",
      safetag_device_name: "GPS SafeTag Principal",

      // Campos GPS (se actualizarán automáticamente con la sincronización)
      gps_latitud: undefined,
      gps_longitud: undefined,
      gps_velocidad: undefined,
      gps_rumbo: undefined,
      gps_ultima_actualizacion: undefined,
      gps_bateria: undefined,
      gps_senal: undefined,
      gps_en_linea: false,
      gps_conectado: false,
    });

    console.log("✅ Vehículo de prueba creado con GPS SafeTag configurado");
    console.log("   Placa: GPS-TEST-001");
    console.log("   IMEI: 357956371545858");
    console.log("   ID:", vehicleId);

    return {
      success: true,
      message: "Vehículo creado exitosamente con GPS SafeTag",
      vehicleId: vehicleId,
      placa: "GPS-TEST-001",
      imei: "357956371545858",
    };
  },
});
