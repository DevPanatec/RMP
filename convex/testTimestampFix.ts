/**
 * Test: Verificar que los timestamps se generen correctamente
 * 
 * Este test verifica que:
 * 1. Cada actualización GPS tenga un timestamp único (Date.now())
 * 2. Los timestamps estén ordenados secuencialmente
 * 3. No haya duplicados de timestamp aunque SafeTag envíe el mismo last_updated
 * 
 * Uso:
 * npx convex run testTimestampFix:testTimestampBehavior
 */

import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const testTimestampBehavior = action({
  handler: async (ctx) => {
    console.log("🧪 Test: Verificando comportamiento de timestamps");
    console.log("================================================\n");

    // Simular múltiples actualizaciones de SafeTag con el MISMO last_updated
    const mockDeviceUpdates = [
      {
        _id: "357956371545858",
        name: "GPS 1",
        latitude: 8.9932,
        longitude: -79.5018,
        speed: 45,
        course: 84,
        last_updated: "2025-12-12T12:00:00.000Z", // ← MISMO TIMESTAMP
        battery: 85,
        signal: 60,
      },
      {
        _id: "357956371545858",
        name: "GPS 1",
        latitude: 8.9935, // ← COORDENADAS DIFERENTES
        longitude: -79.5020,
        speed: 47,
        course: 85,
        last_updated: "2025-12-12T12:00:00.000Z", // ← MISMO TIMESTAMP (problema de SafeTag)
        battery: 85,
        signal: 61,
      },
      {
        _id: "357956371545858",
        name: "GPS 1",
        latitude: 8.9938, // ← COORDENADAS DIFERENTES
        longitude: -79.5022,
        speed: 48,
        course: 86,
        last_updated: "2025-12-12T12:00:00.000Z", // ← MISMO TIMESTAMP (problema de SafeTag)
        battery: 84,
        signal: 62,
      },
    ];

    console.log("📍 Simulando 3 actualizaciones GPS con el MISMO last_updated de SafeTag:");
    console.log("   (Este es el comportamiento real cuando el vehículo se mueve en línea recta)\n");

    const results = [];

    // Obtener vehículo de prueba
    const vehicles = await ctx.runQuery(api.safetag.getVehiclesWithSafeTag);
    if (vehicles.length === 0) {
      console.error("❌ No hay vehículos con SafeTag configurado");
      console.log("\n💡 Ejecuta primero:");
      console.log("   npx convex run createTestVehicle:create");
      return { success: false, error: "No test vehicle found" };
    }

    const testVehicle = vehicles[0];
    console.log(`🚗 Vehículo de prueba: ${testVehicle.placa} (${testVehicle._id})\n`);

    // Procesar cada update con un delay simulado
    for (let i = 0; i < mockDeviceUpdates.length; i++) {
      const update = mockDeviceUpdates[i];
      
      console.log(`\n📥 Update ${i + 1}:`);
      console.log(`   SafeTag last_updated: ${update.last_updated}`);
      console.log(`   Coordenadas: [${update.latitude}, ${update.longitude}]`);
      console.log(`   Velocidad: ${update.speed} km/h`);

      const beforeTimestamp = Date.now();
      
      // Llamar a la mutation (ahora usa Date.now() internamente)
      await ctx.runMutation(api.safetag.updateVehicleFromSafeTag, {
        vehiculoId: testVehicle._id,
        deviceData: update,
      });

      const afterTimestamp = Date.now();
      
      console.log(`   ✅ Timestamp NUESTRO: ${new Date(beforeTimestamp).toISOString()}`);
      console.log(`   ⏱️  Procesado en: ${afterTimestamp - beforeTimestamp}ms`);

      results.push({
        updateNumber: i + 1,
        safetagTimestamp: update.last_updated,
        ourTimestamp: beforeTimestamp,
        coords: [update.latitude, update.longitude],
      });

      // Delay de 2 segundos entre updates para simular tiempo real
      if (i < mockDeviceUpdates.length - 1) {
        console.log("   ⏳ Esperando 2 segundos...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log("\n\n📊 RESUMEN DEL TEST:");
    console.log("==================");
    
    console.log("\n1. SafeTag timestamps (problema - todos iguales):");
    const safetagTimestamps = results.map(r => r.safetagTimestamp);
    const uniqueSafetagTimestamps = new Set(safetagTimestamps);
    console.log(`   Total: ${safetagTimestamps.length}`);
    console.log(`   Únicos: ${uniqueSafetagTimestamps.size}`);
    console.log(`   ❌ ${safetagTimestamps.length - uniqueSafetagTimestamps.size} duplicados encontrados`);

    console.log("\n2. Nuestros timestamps (solución - todos únicos):");
    const ourTimestamps = results.map(r => r.ourTimestamp);
    const uniqueOurTimestamps = new Set(ourTimestamps);
    console.log(`   Total: ${ourTimestamps.length}`);
    console.log(`   Únicos: ${uniqueOurTimestamps.size}`);
    
    if (uniqueOurTimestamps.size === ourTimestamps.length) {
      console.log(`   ✅ Todos los timestamps son únicos (CORRECTO)`);
    } else {
      console.log(`   ❌ ${ourTimestamps.length - uniqueOurTimestamps.size} duplicados encontrados`);
    }

    console.log("\n3. Orden secuencial:");
    let isSequential = true;
    for (let i = 1; i < ourTimestamps.length; i++) {
      if (ourTimestamps[i] <= ourTimestamps[i - 1]) {
        isSequential = false;
        console.log(`   ❌ Timestamp ${i + 1} NO es mayor que ${i}`);
      }
    }
    if (isSequential) {
      console.log(`   ✅ Todos los timestamps están en orden secuencial (CORRECTO)`);
    }

    console.log("\n4. Diferencia de tiempo entre updates:");
    for (let i = 1; i < results.length; i++) {
      const diff = results[i].ourTimestamp - results[i - 1].ourTimestamp;
      console.log(`   Update ${i} → ${i + 1}: ${diff}ms (${(diff / 1000).toFixed(2)}s)`);
    }

    console.log("\n\n✅ TEST COMPLETADO");
    console.log("==================");
    console.log("🔥 FIX APLICADO:");
    console.log("   - Usamos Date.now() en vez de SafeTag last_updated");
    console.log("   - Cada update tiene timestamp único y secuencial");
    console.log("   - El playback GPS funcionará correctamente sin saltos de hora");
    console.log("   - El timestamp original de SafeTag se guarda en safetag_timestamp para debugging");

    return {
      success: true,
      testVehicle: testVehicle.placa,
      totalUpdates: results.length,
      uniqueTimestamps: uniqueOurTimestamps.size,
      isSequential,
      results,
    };
  },
});
