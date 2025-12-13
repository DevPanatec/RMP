// Script para crear usuarios de prueba en Convex Auth
// Ejecutar con: node scripts/seedUsers.js

import { ConvexHttpClient } from "convex/browser";
import fetch from "node-fetch";

// Polyfill para fetch en Node.js
globalThis.fetch = fetch;

const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://tikpsugkuyotqgxsvgor.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

const users = [
  {
    email: "admin@rmp.com",
    password: "admin123",
    userData: {
      tipo_usuario: "admin",
      nombre_completo: "Administrador Test",
      telefono: "809-555-0001",
      documento: "001-0000001-0",
    },
  },
  {
    email: "enterprise@rmp.com",
    password: "enterprise123",
    userData: {
      tipo_usuario: "enterprise",
      nombre_completo: "Empresa Test",
      telefono: "809-555-0002",
      documento: "001-0000002-0",
    },
  },
  {
    email: "conductor@rmp.com",
    password: "conductor123",
    userData: {
      tipo_usuario: "conductor",
      nombre_completo: "Conductor Test",
      telefono: "809-555-0003",
      documento: "001-0000003-0",
    },
  },
];

async function createUser(user) {
  try {
    console.log(`\n📝 Creando usuario: ${user.email}...`);

    // Nota: ConvexHttpClient no soporta auth actions directamente
    // Necesitamos usar el API de Convex Auth a través de HTTP
    const authUrl = `${CONVEX_URL}/api/auth`;

    const response = await fetch(`${authUrl}/signIn/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        flow: "signUp",
        ...user.userData,
      }),
    });

    if (response.ok) {
      console.log(`✅ Usuario creado: ${user.email}`);
      return { success: true, email: user.email };
    } else {
      const error = await response.text();
      console.log(`❌ Error creando ${user.email}: ${error}`);
      return { success: false, email: user.email, error };
    }
  } catch (err) {
    console.error(`❌ Error creando ${user.email}:`, err.message);
    return { success: false, email: user.email, error: err.message };
  }
}

async function main() {
  console.log("🌱 Iniciando creación de usuarios de prueba en Convex Auth...\n");
  console.log(`📍 Convex URL: ${CONVEX_URL}\n`);

  const results = [];

  for (const user of users) {
    const result = await createUser(user);
    results.push(result);
    // Esperar un poco entre creaciones
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 RESUMEN");
  console.log("=".repeat(50) + "\n");

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Usuarios creados exitosamente: ${successful.length}`);
  successful.forEach((r) => console.log(`   - ${r.email}`));

  if (failed.length > 0) {
    console.log(`\n❌ Usuarios con error: ${failed.length}`);
    failed.forEach((r) => console.log(`   - ${r.email}: ${r.error}`));
  }

  console.log("\n" + "=".repeat(50));
  console.log("\n💡 Para iniciar sesión, usa:");
  console.log("   • admin@rmp.com / admin123");
  console.log("   • enterprise@rmp.com / enterprise123");
  console.log("   • conductor@rmp.com / conductor123\n");

  client.close();
}

main().catch(console.error);
