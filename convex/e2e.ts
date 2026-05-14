// E2E test bootstrap + purge.
//
// SECURITY: This module is gated by `process.env.ALLOW_E2E === "1"`.
// Without that env var set, every exposed function throws immediately.
// The actions intentionally do NOT require auth — they bootstrap test
// users (chicken-and-egg). The env gate IS the security boundary.
//
// Defense in depth: every write/delete also verifies the affected
// record's nombre/placa/etc starts with `[E2E-` or matches a runId
// pattern. Anything not tagged is rejected.
//
// Usage (one-time setup, in dev only):
//   npx convex env set ALLOW_E2E 1
//
// Bootstrap a test environment:
//   npx convex run e2e:bootstrap '{"runId":"abc123"}'
//
// Tear it down:
//   npx convex run e2e:purge '{"runId":"abc123"}'
//
// Disable when done:
//   npx convex env remove ALLOW_E2E

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const TAG_PREFIX = "[E2E-";

function assertAllowed() {
  if (process.env.ALLOW_E2E !== "1") {
    throw new Error(
      "e2e module disabled. Set ALLOW_E2E=1 in Convex env to enable.",
    );
  }
}

const ROLES = ["super_admin", "admin", "enterprise", "viewer", "conductor"] as const;
type Role = (typeof ROLES)[number];

// Generated test password — meets Clerk strength requirements
// (uppercase, lowercase, digit, symbol, length 12+). Stable per run
// so credentials.json is reproducible.
function passwordFor(runId: string, role: Role): string {
  return `E2e-${runId}-${role}-Pass!1`;
}

function emailFor(runId: string, role: Role): string {
  // Use hyphen, not underscore — Clerk accepts but cleaner.
  // Use example.com — IANA reserved, valid email format, accepted by Clerk.
  const roleSlug = role.replace(/_/g, "-");
  return `e2e-${roleSlug}-${runId}@example.com`;
}

// ============================================================================
// PUBLIC ACTIONS
// ============================================================================

export const bootstrap = action({
  args: { runId: v.string() },
  handler: async (ctx, { runId }): Promise<{
    runId: string;
    orgId: string;
    proyectoId: string;
    users: Record<Role, { email: string; password: string; userId: string; perfilId: string }>;
    vehicleId: string;
    rutaId: string;
    asignacionId: string;
  }> => {
    assertAllowed();

    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) throw new Error("CLERK_SECRET_KEY missing");
    const clerkDomain =
      process.env.CLERK_FRONTEND_DOMAIN ||
      "https://peaceful-mustang-86.clerk.accounts.dev";

    // Step 1: Clerk users
    const clerkUsers: Record<Role, { clerkId: string; email: string; password: string }> = {} as any;
    for (const role of ROLES) {
      const email = emailFor(runId, role);
      const password = passwordFor(runId, role);

      const res = await fetch("https://api.clerk.com/v1/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: [email],
          password,
          first_name: "[E2E]",
          last_name: role,
          skip_password_checks: false,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Clerk create ${role} failed: ${err}`);
      }
      const data = await res.json();
      clerkUsers[role] = { clerkId: data.id, email, password };
    }

    // Step 2: Convex data via internal mutation
    const result: {
      orgId: string;
      proyectoId: string;
      perfiles: Record<Role, string>;
      vehicleId: string;
      rutaId: string;
      asignacionId: string;
    } = await ctx.runMutation(internal.e2e._bootstrapData, {
      runId,
      clerkDomain,
      clerkUsers,
    });

    // Step 3: Compose return
    const users: Record<Role, { email: string; password: string; userId: string; perfilId: string }> = {} as any;
    for (const role of ROLES) {
      users[role] = {
        email: clerkUsers[role].email,
        password: clerkUsers[role].password,
        userId: `${clerkDomain}|${clerkUsers[role].clerkId}`,
        perfilId: result.perfiles[role],
      };
    }
    return {
      runId,
      orgId: result.orgId,
      proyectoId: result.proyectoId,
      users,
      vehicleId: result.vehicleId,
      rutaId: result.rutaId,
      asignacionId: result.asignacionId,
    };
  },
});

export const purge = action({
  args: { runId: v.string() },
  handler: async (ctx, { runId }): Promise<{ clerkDeleted: number; convexDeleted: Record<string, number> }> => {
    assertAllowed();

    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) throw new Error("CLERK_SECRET_KEY missing");

    // 1. Find clerk users via tagged email pattern
    const perfiles: Array<{ _id: string; userId: string; email: string }> =
      await ctx.runQuery(internal.e2e._perfilsByRunId, { runId });

    let clerkDeleted = 0;
    for (const p of perfiles) {
      // userId format: https://clerk-domain|user_id  → extract user_id
      const clerkId = p.userId.split("|")[1];
      if (!clerkId) continue;
      try {
        const res = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${clerkSecret}` },
        });
        if (res.ok) clerkDeleted++;
        else console.warn(`Clerk delete ${clerkId} status ${res.status}`);
      } catch (err) {
        console.warn(`Clerk delete failed for ${clerkId}:`, err);
      }
    }

    // 2. Convex cascade purge
    const convexDeleted = await ctx.runMutation(internal.e2e._purgeData, { runId });

    return { clerkDeleted, convexDeleted };
  },
});

// ============================================================================
// INTERNAL — DB ops
// ============================================================================

export const _bootstrapData = internalMutation({
  args: {
    runId: v.string(),
    clerkDomain: v.string(),
    clerkUsers: v.any(),
  },
  handler: async (ctx, { runId, clerkDomain, clerkUsers }) => {
    assertAllowed();
    const tag = `${TAG_PREFIX}${runId}]`;

    // Org
    const orgId = await ctx.db.insert("organizaciones", {
      nombre: `${tag} Test Org`,
      slug: `e2e-${runId}-org`,
      descripcion: "E2E test organization — auto-purged",
      activo: true,
      fecha_creacion: new Date().toISOString(),
    });

    // Proyecto (needed for enterprise/conductor)
    const proyectoId = await ctx.db.insert("proyectos", {
      nombre: `${tag} Test Proyecto`,
      descripcion: "E2E test project",
      activo: true,
      organizacion_id: orgId,
    });

    // Vehículo (sin IMEI real para no chocar con cron SafeTag)
    const vehicleId = await ctx.db.insert("vehiculos", {
      nombre: `${tag} Camión Test`,
      placa: `E2E-${runId.toUpperCase()}-01`.slice(0, 12),
      tipo_servicio: "recoleccion",
      tipo_vehiculo: "compactador",
      estado: "disponible",
      gps_latitud: 8.983333,
      gps_longitud: -79.51667,
      gps_velocidad: 0,
      gps_conectado: false,
      organizacion_id: orgId,
      proyecto_asignado_id: proyectoId,
    });

    // 10 puntos GPS sintéticos para testear playback modal
    const baseTs = Date.now() - 60 * 60 * 1000; // 1h atrás
    for (let i = 0; i < 10; i++) {
      await ctx.db.insert("vehicle_location_history", {
        vehiculo_id: vehicleId,
        timestamp: baseTs + i * 60 * 1000,
        gps_latitud: 8.983333 + i * 0.0005,
        gps_longitud: -79.51667 + i * 0.0005,
        gps_velocidad: i < 5 ? 25 : 0,
        gps_rumbo: 90,
        source: "manual",
      });
    }

    // Ruta
    const rutaId = await ctx.db.insert("rutas", {
      nombre: `${tag} Ruta Test`,
      descripcion: "E2E test route",
      tipo_servicio: "recoleccion",
      estado: "pendiente",
      paradas: [
        { nombre: "Parada 1", latitud: 8.983333, longitud: -79.51667, orden: 1 },
        { nombre: "Parada 2", latitud: 8.984, longitud: -79.517, orden: 2 },
        { nombre: "Parada 3", latitud: 8.985, longitud: -79.518, orden: 3 },
      ],
      proyecto_id: proyectoId,
      organizacion_id: orgId,
    });

    // Perfiles: 5 users, todos en mismo org excepto super_admin (sin org)
    const perfiles: Record<Role, string> = {} as any;
    for (const role of ROLES) {
      const cu = clerkUsers[role];
      const userId = `${clerkDomain}|${cu.clerkId}`;
      const tipo = role;
      const isSuperAdmin = role === "super_admin";

      const perfilId = await ctx.db.insert("perfiles_usuarios", {
        userId,
        tipo_usuario: tipo,
        nombre_completo: `${tag} ${role}`,
        email: cu.email,
        organizacion_id: isSuperAdmin ? undefined : orgId,
        proyecto_id:
          role === "enterprise" || role === "conductor"
            ? proyectoId
            : undefined,
        vehiculo_asignado_id: role === "conductor" ? vehicleId : undefined,
        activo: true,
      });
      perfiles[role] = perfilId;
    }

    // Asignación de la ruta al conductor + vehículo
    const conductorPerfilId = perfiles.conductor as any;
    const asignacionId = await ctx.db.insert("asignaciones_rutas", {
      ruta_id: rutaId,
      conductor_id: conductorPerfilId,
      conductor_nombre: `${tag} conductor`,
      vehiculo_id: vehicleId,
      proyecto_id: proyectoId,
      fecha_asignacion: new Date().toISOString().slice(0, 10),
      estado: "asignada",
      organizacion_id: orgId,
    });

    return { orgId, proyectoId, perfiles, vehicleId, rutaId, asignacionId };
  },
});

export const _perfilsByRunId = internalQuery({
  args: { runId: v.string() },
  handler: async (ctx, { runId }) => {
    assertAllowed();
    const tag = `${TAG_PREFIX}${runId}]`;
    const all = await ctx.db.query("perfiles_usuarios").collect();
    return all
      .filter((p) => p.nombre_completo.includes(tag))
      .map((p) => ({ _id: p._id, userId: p.userId, email: p.email }));
  },
});

export const _purgeData = internalMutation({
  args: { runId: v.string() },
  handler: async (ctx, { runId }) => {
    assertAllowed();
    const tag = `${TAG_PREFIX}${runId}]`;

    const deleted: Record<string, number> = {};

    // Helper: filter+delete records whose `field` contains tag
    async function purgeBy(
      table:
        | "asignaciones_rutas"
        | "rutas"
        | "vehiculos"
        | "perfiles_usuarios"
        | "proyectos"
        | "organizaciones"
        | "vehicle_location_history",
      tagField:
        | "nombre"
        | "nombre_completo"
        | "placa"
        | null,
    ) {
      const all = await ctx.db.query(table).collect();
      let n = 0;
      for (const r of all) {
        const v: any = tagField ? (r as any)[tagField] : null;
        if (tagField && typeof v === "string" && v.includes(tag)) {
          await ctx.db.delete(r._id);
          n++;
        }
      }
      deleted[table] = n;
    }

    // Order matters for FK-ish consistency, though Convex doesn't enforce
    // For asignaciones — match conductor_nombre tag
    {
      const all = await ctx.db.query("asignaciones_rutas").collect();
      let n = 0;
      for (const r of all) {
        if (r.conductor_nombre?.includes(tag)) {
          await ctx.db.delete(r._id);
          n++;
        }
      }
      deleted["asignaciones_rutas"] = n;
    }
    await purgeBy("rutas", "nombre");
    // vehicle_location_history: delete by vehiculo_id of tagged vehicles
    {
      const tagged = (await ctx.db.query("vehiculos").collect()).filter((v) =>
        v.nombre?.includes(tag),
      );
      let n = 0;
      for (const veh of tagged) {
        const hist = await ctx.db
          .query("vehicle_location_history")
          .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", veh._id))
          .collect();
        for (const h of hist) {
          await ctx.db.delete(h._id);
          n++;
        }
      }
      deleted["vehicle_location_history"] = n;
    }
    await purgeBy("vehiculos", "nombre");
    await purgeBy("perfiles_usuarios", "nombre_completo");
    await purgeBy("proyectos", "nombre");
    await purgeBy("organizaciones", "nombre");

    return deleted;
  },
});
