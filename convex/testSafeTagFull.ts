import { action } from "./_generated/server";

/**
 * Ver la respuesta COMPLETA del API SafeTag con el header correcto
 */
export const viewFullResponse = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.SAFETAG_API_KEY;
    const username = process.env.SAFETAG_USERNAME;

    const response = await fetch(
      `https://api.safetagtracking.com/api/v1/devices/${username}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    console.log("📦 FULL SafeTag API Response:");
    console.log(JSON.stringify(data, null, 2));

    return {
      success: true,
      data: data,
    };
  },
});
