import { action } from "./_generated/server";

/**
 * Función de prueba v2 - Probar múltiples endpoints
 */
export const testMultipleEndpoints = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.SAFETAG_API_KEY;
    const username = process.env.SAFETAG_USERNAME;

    console.log("🧪 Testing SafeTag API - Multiple Endpoints...");
    console.log("🔑 API Key:", apiKey?.substring(0, 20) + "...");
    console.log("👤 Username:", username);

    if (!apiKey || !username) {
      throw new Error("SafeTag credentials not configured");
    }

    const endpoints = [
      {
        name: "devices/{username}",
        url: `https://api.safetagtracking.com/api/v1/devices/${username}`,
      },
      {
        name: "devices (query param)",
        url: `https://api.safetagtracking.com/api/v1/devices?username=${username}`,
      },
      {
        name: "user/devices",
        url: `https://api.safetagtracking.com/api/v1/user/devices`,
      },
      {
        name: "trackers",
        url: `https://api.safetagtracking.com/api/v1/trackers`,
      },
      {
        name: "user (get user info)",
        url: `https://api.safetagtracking.com/api/v1/user`,
      },
    ];

    const results = [];

    for (const endpoint of endpoints) {
      console.log(`\n━━━ Testing: ${endpoint.name} ━━━`);
      console.log(`URL: ${endpoint.url}`);

      try {
        const response = await fetch(endpoint.url, {
          method: "GET",
          headers: {
            "API-Key": apiKey,
            "Content-Type": "application/json",
          },
        });

        console.log(`Status: ${response.status} ${response.ok ? "✅" : "❌"}`);

        const contentType = response.headers.get("content-type");
        console.log(`Content-Type: ${contentType}`);

        let data;
        if (contentType?.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        console.log(`Response type: ${typeof data}`);
        console.log(`Is array: ${Array.isArray(data)}`);

        if (typeof data === 'object' && data !== null) {
          console.log(`Keys: ${Object.keys(data).join(", ")}`);
        }

        const preview = typeof data === 'string'
          ? data.substring(0, 200)
          : JSON.stringify(data).substring(0, 200);

        console.log(`Preview: ${preview}...`);

        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          status: response.status,
          ok: response.ok,
          responseType: typeof data,
          isArray: Array.isArray(data),
          preview: preview,
        });

        // Si encontramos un endpoint que funciona, devolver los datos completos
        if (response.ok && typeof data === 'object' && !data.error && data !== "Error: Missing params.") {
          console.log("✅✅✅ FOUND WORKING ENDPOINT!");
          return {
            success: true,
            workingEndpoint: endpoint.name,
            workingUrl: endpoint.url,
            data: data,
            fullResponse: JSON.stringify(data),
          };
        }

      } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          error: error.message,
        });
      }
    }

    console.log("\n━━━ SUMMARY ━━━");
    console.log(JSON.stringify(results, null, 2));

    return {
      success: false,
      message: "No working endpoint found",
      results: results,
    };
  },
});
