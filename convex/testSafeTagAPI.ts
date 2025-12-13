import { action } from "./_generated/server";

/**
 * Función de prueba para ver la respuesta cruda de SafeTag API
 */
export const testSafeTagAPI = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.SAFETAG_API_KEY;
    const username = process.env.SAFETAG_USERNAME;

    console.log("🧪 Testing SafeTag API...");
    console.log("🔑 API Key configured:", apiKey ? "YES" : "NO");
    console.log("👤 Username configured:", username ? "YES" : "NO");
    console.log("👤 Username value:", username);

    if (!apiKey || !username) {
      throw new Error("SafeTag credentials not configured");
    }

    const url = `https://api.safetagtracking.com/api/v1/devices/${username}`;
    console.log("🌐 Calling URL:", url);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "API-Key": apiKey,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);
      console.log("📡 Response headers:", JSON.stringify(Object.fromEntries(response.headers.entries())));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", errorText);
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      console.log("📦 Response type:", typeof data);
      console.log("📦 Is array:", Array.isArray(data));

      if (data && typeof data === 'object') {
        console.log("📦 Keys:", Object.keys(data));
        console.log("📦 Full JSON (truncated):", JSON.stringify(data).substring(0, 1000));
      } else {
        console.log("📦 Raw data:", data);
      }

      return {
        success: true,
        responseType: typeof data,
        isArray: Array.isArray(data),
        keys: data && typeof data === 'object' ? Object.keys(data) : [],
        preview: JSON.stringify(data).substring(0, 500),
      };
    } catch (error: any) {
      console.error("❌ Exception:", error.message);
      throw error;
    }
  },
});
