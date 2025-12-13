import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Script para configurar el IMEI de un vehículo por ID
 * para que funcione con el webhook de SafeTag
 * 
 * Ejecutar desde el dashboard de Convex o mediante CLI
 */
export const setupVehicleIMEIById = mutation({
  args: {
    vehiculoId: v.id("vehiculos"),
    imei: v.string(),
  },
  handler: async (ctx, args) => {
    const { vehiculoId, imei } = args;

    console.log(`🔧 [Setup] Configurando IMEI para vehículo ${vehiculoId}...`);

    // Obtener el vehículo por ID
    const vehicle = await ctx.db.get(vehiculoId);

    if (!vehicle) {
      console.error(`❌ [Setup] Vehículo no encontrado: ${vehiculoId}`);
      return {
        success: false,
        error: `Vehicle not found: ${vehiculoId}`,
      };
    }

    // Actualizar los campos de IMEI
    await ctx.db.patch(vehicle._id, {
      gps_imei: imei,
      safetag_device_id: imei,
      gps_conectado: false, // Se actualizará cuando llegue el primer webhook
    });

    console.log(`✅ [Setup] IMEI configurado: ${vehicle.placa} (${vehicle._id}) -> ${imei}`);
    console.log(`📡 [Setup] Webhook listo para recibir datos de SafeTag`);

    return {
      success: true,
      vehicleId: vehicle._id,
      placa: vehicle.placa,
      imei: imei,
      message: `Vehicle ${vehicle.placa} configured with IMEI ${imei}`,
    };
  },
});

/**
 * Script para configurar el IMEI del vehículo GPS-TEST-001
 * para que funcione con el webhook de SafeTag
 * 
 * Ejecutar desde el dashboard de Convex o mediante CLI
 */
export const setupVehicleIMEI = mutation({
  args: {
    placa: v.string(),
    imei: v.string(),
  },
  handler: async (ctx, args) => {
    const { placa, imei } = args;

    console.log(`🔧 [Setup] Configurando IMEI para vehículo ${placa}...`);

    // Buscar el vehículo por placa
    const vehicle = await ctx.db
      .query("vehiculos")
      .withIndex("by_placa", (q) => q.eq("placa", placa))
      .first();

    if (!vehicle) {
      console.error(`❌ [Setup] Vehículo no encontrado: ${placa}`);
      return {
        success: false,
        error: `Vehicle not found: ${placa}`,
      };
    }

    // Actualizar los campos de IMEI
    await ctx.db.patch(vehicle._id, {
      gps_imei: imei,
      safetag_device_id: imei,
      gps_conectado: false, // Se actualizará cuando llegue el primer webhook
    });

    console.log(`✅ [Setup] IMEI configurado: ${placa} -> ${imei}`);
    console.log(`📡 [Setup] Webhook listo para recibir datos de SafeTag`);

    return {
      success: true,
      vehicleId: vehicle._id,
      placa: vehicle.placa,
      imei: imei,
      message: `Vehicle ${placa} configured with IMEI ${imei}`,
    };
  },
});

/**
 * Listar todos los vehículos con sus IMEIs
 */
export const listVehicleIMEIs = mutation({
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehiculos").collect();

    console.log("📋 [Setup] Vehículos registrados:");
    
    const vehicleList = vehicles.map(v => ({
      id: v._id,
      placa: v.placa,
      gps_imei: v.gps_imei || "NO CONFIGURADO",
      safetag_device_id: v.safetag_device_id || "NO CONFIGURADO",
    }));

    vehicleList.forEach(v => {
      console.log(`  - ${v.placa}: IMEI=${v.gps_imei}, SafeTag=${v.safetag_device_id}`);
    });

    return vehicleList;
  },
});
