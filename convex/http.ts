/**
 * HTTP Routes for RMP - SafeTag Webhook Integration
 * Last updated: 2025-12-11
 */
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Health endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// SafeTag webhook
http.route({
  path: "/safetag/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("🔔 Webhook recibido");
    
    const data = await request.json();
    const deviceId = data.device_id || data.imei || data._id;
    const gpsData = data.data || data.location || data;
    const latitude = gpsData.latitude || gpsData.lat;
    const longitude = gpsData.longitude || gpsData.lon || gpsData.lng;
    
    if (!deviceId || !latitude || !longitude) {
      return new Response(JSON.stringify({ error: "Invalid data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const result = await ctx.runMutation(api.vehicleHistory.createFromWebhook, {
      imei: String(deviceId),
      gps_latitud: parseFloat(latitude),
      gps_longitud: parseFloat(longitude),
      gps_velocidad: parseFloat(gpsData.speed || 0),
      gps_rumbo: parseFloat(gpsData.heading || gpsData.course || 0),
      timestamp: data.timestamp || new Date().toISOString(),
    });
    
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
