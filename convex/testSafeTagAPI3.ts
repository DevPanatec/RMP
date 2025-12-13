import { action } from "./_generated/server";

/**
 * Función de prueba v3 - Probar diferentes métodos de autenticación
 */
export const testAuthMethods = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.SAFETAG_API_KEY;
    const username = process.env.SAFETAG_USERNAME;

    console.log("🧪 Testing SafeTag API - Different Auth Methods...");
    console.log("🔑 API Key:", apiKey?.substring(0, 20) + "...");
    console.log("👤 Username:", username);

    if (!apiKey || !username) {
      throw new Error("SafeTag credentials not configured");
    }

    const testUrl = `https://api.safetagtracking.com/api/v1/devices/${username}`;
    const results = [];

    // Test 1: API-Key header (current method)
    console.log("\n━━━ Test 1: API-Key header ━━━");
    try {
      const response1 = await fetch(testUrl, {
        method: "GET",
        headers: {
          "API-Key": apiKey,
          "Content-Type": "application/json",
        },
      });
      const data1 = await response1.text();
      console.log(`Status: ${response1.status}`);
      console.log(`Response: ${data1.substring(0, 200)}`);
      results.push({
        method: "API-Key header",
        status: response1.status,
        response: data1.substring(0, 200),
      });
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      results.push({ method: "API-Key header", error: error.message });
    }

    // Test 2: Bearer token
    console.log("\n━━━ Test 2: Bearer token ━━━");
    try {
      const response2 = await fetch(testUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });
      const data2 = await response2.text();
      console.log(`Status: ${response2.status}`);
      console.log(`Response: ${data2.substring(0, 200)}`);
      results.push({
        method: "Bearer token",
        status: response2.status,
        response: data2.substring(0, 200),
      });
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      results.push({ method: "Bearer token", error: error.message });
    }

    // Test 3: Query parameter
    console.log("\n━━━ Test 3: Query parameter ━━━");
    try {
      const response3 = await fetch(`${testUrl}?api_key=${apiKey}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data3 = await response3.text();
      console.log(`Status: ${response3.status}`);
      console.log(`Response: ${data3.substring(0, 200)}`);
      results.push({
        method: "Query parameter",
        status: response3.status,
        response: data3.substring(0, 200),
      });
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      results.push({ method: "Query parameter", error: error.message });
    }

    // Test 4: x-api-key header (common alternative)
    console.log("\n━━━ Test 4: x-api-key header ━━━");
    try {
      const response4 = await fetch(testUrl, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      });
      const data4 = await response4.text();
      console.log(`Status: ${response4.status}`);
      console.log(`Response: ${data4.substring(0, 200)}`);
      results.push({
        method: "x-api-key header",
        status: response4.status,
        response: data4.substring(0, 200),
      });
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      results.push({ method: "x-api-key header", error: error.message });
    }

    // Test 5: POST request with body
    console.log("\n━━━ Test 5: POST with body ━━━");
    try {
      const response5 = await fetch(`https://api.safetagtracking.com/api/v1/devices`, {
        method: "POST",
        headers: {
          "API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });
      const data5 = await response5.text();
      console.log(`Status: ${response5.status}`);
      console.log(`Response: ${data5.substring(0, 200)}`);
      results.push({
        method: "POST with body",
        status: response5.status,
        response: data5.substring(0, 200),
      });
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      results.push({ method: "POST with body", error: error.message });
    }

    // Test 6: Try fetching device by IMEI directly
    console.log("\n━━━ Test 6: Device by IMEI ━━━");
    const imei = "357956371545858";
    try {
      const response6 = await fetch(
        `https://api.safetagtracking.com/api/v1/devices/${imei}`,
        {
          method: "GET",
          headers: {
            "API-Key": apiKey,
            "Content-Type": "application/json",
          },
        }
      );
      const data6 = await response6.text();
      console.log(`Status: ${response6.status}`);
      console.log(`Response: ${data6.substring(0, 200)}`);
      results.push({
        method: "Device by IMEI",
        status: response6.status,
        response: data6.substring(0, 200),
      });
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      results.push({ method: "Device by IMEI", error: error.message });
    }

    console.log("\n━━━ SUMMARY ━━━");
    console.log(JSON.stringify(results, null, 2));

    return {
      success: true,
      results,
    };
  },
});
