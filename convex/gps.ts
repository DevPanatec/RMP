import { internalMutation } from "./_generated/server";

/**
 * Internal mutation: Marcar vehículos como desconectados si no han reportado en 5 minutos
 * (Llamada periódicamente desde convex/crons.ts vía internal.gps.updateConnectionStatus)
 */
export const updateConnectionStatus = internalMutation({
  handler: async (ctx) => {
    const vehicles = await ctx.db
      .query("vehiculos")
      .filter((q) => q.neq(q.field("gps_imei"), undefined))
      .collect();

    const now = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

    let disconnectedCount = 0;

    for (const vehicle of vehicles) {
      const lastUpdate = vehicle.gps_ultima_actualizacion
        ? new Date(vehicle.gps_ultima_actualizacion).getTime()
        : 0;

      const isConnected = lastUpdate > 0 && now - lastUpdate < TIMEOUT_MS;

      if (vehicle.gps_conectado !== isConnected) {
        await ctx.db.patch(vehicle._id, {
          gps_conectado: isConnected,
        });

        if (!isConnected) {
          disconnectedCount++;
          console.log(`⚠️ GPS desconectado: ${vehicle.placa} (IMEI ${vehicle.gps_imei})`);
        }
      }
    }

    return {
      checked: vehicles.length,
      disconnected: disconnectedCount,
    };
  },
});
