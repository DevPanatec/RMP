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

// SafeTag webhook — auth requerida vía header X-Webhook-Token
// Set SAFETAG_WEBHOOK_TOKEN en Convex env vars (npx convex env set SAFETAG_WEBHOOK_TOKEN <secret>)
http.route({
  path: "/safetag/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedToken = process.env.SAFETAG_WEBHOOK_TOKEN;
    if (!expectedToken) {
      console.error("❌ SAFETAG_WEBHOOK_TOKEN no configurado en Convex env");
      return new Response(JSON.stringify({ error: "Webhook auth not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    const provided =
      request.headers.get("x-webhook-token") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!provided || provided !== expectedToken) {
      console.warn("⚠️ Webhook con token inválido o faltante");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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
