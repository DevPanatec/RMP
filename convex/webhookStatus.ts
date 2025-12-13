import { query } from "./_generated/server";

/**
 * Ver últimos datos GPS recibidos vía webhook
 */
export const checkRecentWebhookData = query({
  handler: async (ctx) => {
    // Obtener los últimos 20 registros
    const recentHistory = await ctx.db
      .query("vehicle_location_history")
      .withIndex("by_timestamp")
      .order("desc")
      .take(20);

    const webhookData = recentHistory.filter(r => r.source === "safetag_webhook");

    console.log(`📊 Últimos ${webhookData.length} datos recibidos vía webhook (de los últimos 20 registros):`);
    console.log("=".repeat(60));
    
    if (webhookData.length === 0) {
      console.log("⚠️ No se han recibido datos vía webhook aún.");
      console.log("💡 Espera 10-30 segundos para que SafeTag envíe la primera actualización.");
      return [];
    }

    for (const record of webhookData) {
      const vehicle = await ctx.db.get(record.vehiculo_id);
      const time = new Date(record.timestamp);
      const ago = Math.floor((Date.now() - record.timestamp) / 1000 / 60);
      
      console.log(`
🚛 ${vehicle?.placa || "DESCONOCIDO"}
   - Timestamp: ${time.toLocaleString()} (hace ${ago} minutos)
   - Posición: [${record.gps_latitud.toFixed(5)}, ${record.gps_longitud.toFixed(5)}]
   - Velocidad: ${record.gps_velocidad || 0} km/h
   - Rumbo: ${record.gps_rumbo || 0}°
      `);
    }

    console.log("=".repeat(60));
    console.log(`✅ Total de datos vía webhook: ${webhookData.length}`);

    return webhookData.map(r => ({
      timestamp: new Date(r.timestamp).toISOString(),
      vehiculo_id: r.vehiculo_id,
      position: [r.gps_latitud, r.gps_longitud],
      speed: r.gps_velocidad,
      heading: r.gps_rumbo,
      source: r.source,
    }));
  },
});
