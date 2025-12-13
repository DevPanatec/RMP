import { action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Script de prueba para verificar el endpoint de historial de ubicaciones
 *
 * Uso:
 * npx convex run testLocationHistory:testFetch
 */
export const testFetch = action({
  args: {},
  handler: async (ctx) => {
    const deviceId = "357956371545858"; // El IMEI del vehículo de prueba

    console.log("🧪 === TEST: Location History Fetch ===");
    console.log("🔍 Testing device:", deviceId);

    try {
      // Test 1: Historial de hoy
      console.log("\n📅 Test 1: Fetching today's history...");
      const todayData = await ctx.runAction(api.safetag.fetchTodayHistory, {
        deviceId,
      });

      console.log("✅ Today's data response:", {
        locationCount: todayData.locations?.length || 0,
        totalDistance: todayData.totalDistance,
        hasLocations: todayData.locations && todayData.locations.length > 0,
      });

      if (todayData.locations && todayData.locations.length > 0) {
        console.log("📍 First location:", todayData.locations[0]);
        console.log("📍 Last location:", todayData.locations[todayData.locations.length - 1]);
      }

      // Test 2: Historial de los últimos 7 días
      console.log("\n📅 Test 2: Fetching last 7 days history...");
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);

      const weekData = await ctx.runAction(api.safetag.fetchLocationHistory, {
        deviceId,
        startDate: sevenDaysAgo.toISOString(),
        endDate: now.toISOString(),
      });

      console.log("✅ Week data response:", {
        locationCount: weekData.locations?.length || 0,
        totalDistance: weekData.totalDistance,
        hasLocations: weekData.locations && weekData.locations.length > 0,
      });

      // Test 3: Verificar si el device existe en SafeTag
      console.log("\n🔍 Test 3: Checking if device exists in SafeTag...");
      const devices = await ctx.runAction(api.safetag.fetchDevices);
      const deviceExists = devices.some(d => d._id === deviceId);

      console.log("✅ Device check:", {
        deviceExists,
        totalDevicesFound: devices.length,
        deviceIds: devices.map(d => d._id),
      });

      // Resultado final
      console.log("\n🎯 === TEST RESULTS ===");
      console.log("Today's history locations:", todayData.locations?.length || 0);
      console.log("Week history locations:", weekData.locations?.length || 0);
      console.log("Device exists in SafeTag:", deviceExists);
      console.log("Device IMEI:", deviceId);

      if (!deviceExists) {
        console.error("❌ ISSUE: Device not found in SafeTag API!");
        console.error("   Available devices:", devices.map(d => `${d._id} (${d.prefs?.name})`).join(", "));
      }

      if (todayData.locations && todayData.locations.length === 0) {
        console.warn("⚠️ WARNING: No location data for today. This might be normal if the device hasn't transmitted yet today.");
      }

      return {
        success: true,
        todayLocations: todayData.locations?.length || 0,
        weekLocations: weekData.locations?.length || 0,
        deviceExists,
        deviceId,
      };

    } catch (error: any) {
      console.error("❌ TEST FAILED:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      return {
        success: false,
        error: error.message,
      };
    }
  },
});
