/**
 * HTTP Routes for RMP - SafeTag Webhook Integration
 */
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

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

// HMAC-SHA256 signature verify. Cliente firma `${timestamp}.${rawBody}` con SAFETAG_WEBHOOK_SECRET.
// Header: X-Webhook-Signature: sha256=<hex>; X-Webhook-Timestamp: <unix-ms>.
// ±60s window contra replay.
async function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secret: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!signatureHeader || !timestampHeader) return { ok: false, reason: "missing-headers" };
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad-timestamp" };
  const driftMs = Math.abs(Date.now() - ts);
  if (driftMs > 60_000) return { ok: false, reason: "timestamp-drift" };

  const provided = signatureHeader.replace(/^sha256=/i, "");
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const msg = enc.encode(`${ts}.${rawBody}`);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, msg);
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time compare.
  if (provided.length !== expected.length) return { ok: false, reason: "bad-signature" };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0 ? { ok: true } : { ok: false, reason: "bad-signature" };
}

http.route({
  path: "/safetag/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.SAFETAG_WEBHOOK_SECRET ?? process.env.SAFETAG_WEBHOOK_TOKEN;
    if (!secret) {
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawBody = await request.text();
    const sigHeader = request.headers.get("x-webhook-signature");
    const tsHeader = request.headers.get("x-webhook-timestamp");

    // HMAC-firmado preferido. Fallback legacy: token estático en x-webhook-token (SOLO si no hay firma).
    let authed = false;
    if (sigHeader && tsHeader) {
      const verify = await verifySignature(rawBody, sigHeader, tsHeader, secret);
      authed = verify.ok;
    } else {
      const legacyToken =
        request.headers.get("x-webhook-token") ||
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      authed = legacyToken === secret;
    }

    if (!authed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const deviceId = data.device_id || data.imei || data._id;
    const gpsData = data.data || data.location || data;
    // Aceptar 0 explícitamente (lat=0 es válido en el ecuador, no falsy).
    const latRaw = gpsData.latitude ?? gpsData.lat;
    const lonRaw = gpsData.longitude ?? gpsData.lon ?? gpsData.lng;
    const latitude = typeof latRaw === "number" ? latRaw : Number(latRaw);
    const longitude = typeof lonRaw === "number" ? lonRaw : Number(lonRaw);

    if (
      !deviceId ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180
    ) {
      return new Response(JSON.stringify({ error: "Invalid data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Timestamp: aceptar number ms, ISO string, o usar now() como fallback.
    let timestampMs: number;
    if (typeof data.timestamp === "number" && Number.isFinite(data.timestamp)) {
      timestampMs = data.timestamp;
    } else if (typeof data.timestamp === "string") {
      const parsed = new Date(data.timestamp).getTime();
      timestampMs = Number.isFinite(parsed) ? parsed : Date.now();
    } else {
      timestampMs = Date.now();
    }

    const result = await ctx.runMutation(internal.vehicleHistory.createFromWebhook, {
      imei: String(deviceId),
      gps_latitud: latitude,
      gps_longitud: longitude,
      gps_velocidad: Number(gpsData.speed) || 0,
      gps_rumbo: Number(gpsData.heading ?? gpsData.course) || 0,
      timestamp_ms: timestampMs,
    });

    // Disparar geofence check después del update (antes solo el cron lo hacía).
    if (result?.success && result.vehiculoId) {
      try {
        await ctx.runMutation(internal.geofences.checkVehicleGeofences, {
          vehiculoId: result.vehiculoId,
          latitud: latitude,
          longitud: longitude,
        });
      } catch (e) {
        // No tirar el webhook por error en geofence — log y continuar.
        console.error("Geofence check failed", e);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
