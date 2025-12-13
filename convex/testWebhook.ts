/**
 * Script de prueba para verificar que los HTTP endpoints funcionan
 * 
 * Si este archivo se puede ver en el dashboard de Convex como función,
 * significa que el deployment está funcionando.
 */
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const testHttp = httpRouter();

testHttp.route({
  path: "/test-ping",
  method: "GET",
  handler: httpAction(async () => {
    console.log("🏓 Test ping recibido");
    return new Response(
      JSON.stringify({ 
        status: "pong", 
        message: "HTTP endpoints están funcionando correctamente",
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }),
});

export default testHttp;
