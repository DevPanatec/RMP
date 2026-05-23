import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getScopedProjectId, getScopedOrgId, getAuthScope, requireProjectAccess, requireSuperAdmin, requireWriteRole } from "./lib/auth";
import { requireModulo } from "./lib/modules";

// Cleanup admin-only: marca como 'completada' todos los route_progress 'en_progreso'.
export const cleanupStaleInProgress = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const stale = await ctx.db
      .query("route_progress")
      .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
      .collect();
    let count = 0;
    for (const sp of stale) {
      await ctx.db.patch(sp._id, { estado: "completada" });
      count++;
    }
    return { closed: count };
  },
});

export const list = query({
  args: {
    proyecto_id: v.optional(v.id("proyectos")),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const scopedProject = await getScopedProjectId(ctx, args.proyecto_id ?? null);
    if (scopedProject) {
      return await ctx.db
        .query("route_progress")
        .withIndex("by_proyecto", (q) => q.eq("proyecto_id", scopedProject))
        .collect();
    }
    const scopedOrg = await getScopedOrgId(ctx, args.organizacion_id ?? null);
    const scope = await getAuthScope(ctx);
    if (!scopedOrg) {
      if (scope.isSuperAdmin || scope.isCrossOrgViewer) {
        return await ctx.db.query("route_progress").collect();
      }
      return [];
    }
    const all = await ctx.db.query("route_progress").collect();
    return all.filter((rp) => rp.organizacion_id === scopedOrg);
  },
});

// Verifica que el caller pueda consultar info del conductor solicitado.
// - Conductor: solo puede consultar lo suyo.
// - Admin: solo conductores de su misma org.
// - Super_admin: libre.
async function assertConductorAccess(
  ctx: any,
  conductorId: any
): Promise<void> {
  const scope = await getAuthScope(ctx);
  if (!scope.perfil) throw new Error("No autenticado");
  if (scope.isSuperAdmin) return;
  if (scope.perfil._id === conductorId) return;
  if (scope.isAdmin) {
    const conductor = await ctx.db.get(conductorId);
    if (!conductor) throw new Error("Conductor no encontrado");
    if (!scope.organizacionId || conductor.organizacion_id !== scope.organizacionId) {
      throw new Error("Acceso denegado");
    }
    return;
  }
  throw new Error("Acceso denegado");
}

// Match por conductor_id (preciso). Mantiene fallback a conductor_nombre legacy
// para datos antiguos sin conductor_id en frontend.
export const getByConductor = query({
  args: {
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    conductor_nombre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.conductor_id) {
      await assertConductorAccess(ctx, args.conductor_id);
      return await ctx.db
        .query("route_progress")
        .withIndex("by_conductor_id", (q) => q.eq("conductor_id", args.conductor_id!))
        .collect();
    }
    if (args.conductor_nombre) {
      // Legacy fallback: solo super_admin/admin pueden buscar por nombre arbitrario.
      const scope = await getAuthScope(ctx);
      if (!scope.isSuperAdmin && !scope.isAdmin) {
        throw new Error("Acceso denegado");
      }
      const results = await ctx.db
        .query("route_progress")
        .withIndex("by_conductor", (q) => q.eq("conductor_nombre", args.conductor_nombre!))
        .collect();
      // Filtrar por org del scope (admin solo ve su propia org, super_admin ve todo)
      if (scope.isSuperAdmin) return results;
      if (!scope.organizacionId) return [];
      // resolver org a través del proyecto_id
      const proyectoCache = new Map<string, any>();
      const filtered: any[] = [];
      for (const r of results) {
        if (!r.proyecto_id) continue;
        let p = proyectoCache.get(r.proyecto_id as string);
        if (!p) { p = await ctx.db.get(r.proyecto_id); proyectoCache.set(r.proyecto_id as string, p); }
        if (p?.organizacion_id === scope.organizacionId) filtered.push(r);
      }
      return filtered;
    }
    return [];
  },
});

export const getActiveProgress = query({
  args: {
    conductor_id: v.optional(v.id("perfiles_usuarios")),
    conductor_nombre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.conductor_id) {
      await assertConductorAccess(ctx, args.conductor_id);
      return await ctx.db
        .query("route_progress")
        .withIndex("by_conductor_id_estado", (q) =>
          q.eq("conductor_id", args.conductor_id!).eq("estado", "en_progreso")
        )
        .first();
    }
    if (args.conductor_nombre) {
      // Legacy fallback: solo super_admin/admin pueden buscar por nombre arbitrario.
      const scope = await getAuthScope(ctx);
      if (!scope.isSuperAdmin && !scope.isAdmin) {
        throw new Error("Acceso denegado");
      }
      return await ctx.db
        .query("route_progress")
        .withIndex("by_conductor", (q) => q.eq("conductor_nombre", args.conductor_nombre!))
        .filter((q) => q.eq(q.field("estado"), "en_progreso"))
        .first();
    }
    return null;
  },
});

export const start = mutation({
  args: {
    conductor_id: v.id("perfiles_usuarios"),
    conductor_nombre: v.string(),
    ruta_id: v.id("rutas"),
    vehiculo_id: v.id("vehiculos"),
    asignacion_id: v.id("asignaciones_rutas"),
    total_paradas: v.number(),
    tipo_ruta: v.string(),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");
    await requireModulo(ctx, "REC");
    // Solo el conductor dueño o super_admin pueden iniciar la ruta.
    if (!scope.isSuperAdmin && scope.perfil._id !== args.conductor_id) {
      throw new Error("Acceso denegado: solo el conductor asignado puede iniciar la ruta");
    }

    // Validar acceso al vehículo (anti cross-tenant hijack).
    // Si el conductor tiene vehiculo_asignado_id, debe coincidir.
    // Si no lo tiene (legacy / recién creado), validar contra la asignación + org.
    if (!scope.isSuperAdmin) {
      const veh = await ctx.db.get(args.vehiculo_id);
      if (!veh) throw new Error("Vehículo no encontrado");
      if (!veh.organizacion_id || veh.organizacion_id !== scope.organizacionId) {
        throw new Error("Vehículo no pertenece a la organización del conductor");
      }
      if (scope.perfil.vehiculo_asignado_id) {
        if (scope.perfil.vehiculo_asignado_id !== args.vehiculo_id) {
          throw new Error("Acceso denegado: vehículo no asignado a este conductor");
        }
      } else {
        // Sin vehículo fijo: validar que la asignación apunte a ese vehículo y a este conductor.
        const asignacionCheck = await ctx.db.get(args.asignacion_id);
        if (!asignacionCheck || asignacionCheck.vehiculo_id !== args.vehiculo_id) {
          throw new Error("Asignación no coincide con el vehículo");
        }
        if (asignacionCheck.conductor_id && asignacionCheck.conductor_id !== scope.perfil._id) {
          throw new Error("Asignación no pertenece a este conductor");
        }
      }
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Idempotency: si ya existe en_progreso para esta misma asignación, devolverlo.
    // Previene duplicados por double-click / network retry.
    const stale = await ctx.db
      .query("route_progress")
      .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
      .collect();
    const existingSameAssignment = stale.find(
      (sp) => sp.asignacion_id === args.asignacion_id
    );
    if (existingSameAssignment) {
      return existingSameAssignment._id;
    }

    // Cerrar progress en_progreso del mismo VEHÍCULO (un vehículo no puede correr 2 rutas).
    // Filtramos por vehículo (no por nombre conductor — colisiones cross-org).
    for (const sp of stale) {
      if (sp.vehiculo_id === args.vehiculo_id) {
        await ctx.db.patch(sp._id, { estado: "completada" });
      }
    }

    // Sync assignment only for one-off (non-recurring) — recurring keeps `programada`
    const assignment = await ctx.db.get(args.asignacion_id);
    if (assignment?.proyecto_id) {
      await requireProjectAccess(ctx, assignment.proyecto_id);
    }
    const isRecurring = Array.isArray(assignment?.dias_semana) && assignment.dias_semana.length > 0;
    if (assignment && !isRecurring) {
      await ctx.db.patch(args.asignacion_id, {
        estado: "en_progreso",
        fecha_inicio: today,
      });
    }

    // Derivar proyecto_id: asignación primero, luego ruta como fallback
    let proyecto_id = assignment?.proyecto_id;
    if (!proyecto_id) {
      const ruta = await ctx.db.get(args.ruta_id);
      proyecto_id = ruta?.proyecto_id;
    }
    if (proyecto_id && assignment && !assignment.proyecto_id) {
      await ctx.db.patch(args.asignacion_id, { proyecto_id });
    }

    // Marcar vehículo como en_ruta. El KPI "vehículos en ruta" lee de aquí.
    await ctx.db.patch(args.vehiculo_id, { estado: "en_ruta" });

    // Derivar organizacion_id: asignación → vehículo → conductor.
    let organizacion_id = assignment?.organizacion_id ?? null;
    if (!organizacion_id) {
      const veh = await ctx.db.get(args.vehiculo_id);
      organizacion_id = veh?.organizacion_id ?? null;
    }
    if (!organizacion_id) {
      organizacion_id = scope.perfil?.organizacion_id ?? null;
    }

    return await ctx.db.insert("route_progress", {
      ...args,
      proyecto_id,
      fecha_inicio: now.toISOString(),
      estado: "en_progreso",
      ...(organizacion_id && { organizacion_id }),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("route_progress"),
    paradas_completadas: v.optional(v.array(v.any())),
    posicion_actual: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "REC");
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Progreso no encontrado");
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");
    // Solo el conductor dueño o super_admin/admin del proyecto.
    // isCrossOrgViewer no exime de la verificación de proyecto — puede leer, no escribir.
    const isOwner = scope.perfil._id === existing.conductor_id;
    if (!isOwner && !scope.isSuperAdmin) {
      if (existing.proyecto_id) await requireProjectAccess(ctx, existing.proyecto_id);
      else if (existing.organizacion_id) {
        if (!scope.organizacionId || scope.organizacionId !== existing.organizacion_id) throw new Error("Acceso denegado");
      }
    }
    return await ctx.db.patch(id, updates);
  },
});

export const complete = mutation({
  args: {
    id: v.id("route_progress"),
    route_report_id: v.optional(v.id("route_reports")),
  },
  handler: async (ctx, args) => {
    await requireWriteRole(ctx);
    await requireModulo(ctx, "REC");
    const progress = await ctx.db.get(args.id);
    if (!progress) throw new Error("Progreso no encontrado");

    const scope = await getAuthScope(ctx);
    if (!scope.perfil) throw new Error("No autenticado");
    const isOwner = scope.perfil._id === progress.conductor_id;
    if (!isOwner && !scope.isSuperAdmin) {
      if (progress.proyecto_id) await requireProjectAccess(ctx, progress.proyecto_id);
    }

    if (progress.estado === "completada") {
      return args.id;
    }

    await ctx.db.patch(args.id, {
      estado: "completada",
      route_report_id: args.route_report_id,
    });

    // Sync assignment only for one-off (non-recurring) — recurring stays `programada`
    if (progress?.asignacion_id) {
      const assignment = await ctx.db.get(progress.asignacion_id);
      const isRecurring = Array.isArray(assignment?.dias_semana) && assignment.dias_semana.length > 0;
      if (assignment && !isRecurring) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        await ctx.db.patch(progress.asignacion_id, {
          estado: "completada",
          fecha_completacion: today,
        });
      }
    }

    // Liberar vehículo: solo si no hay otro route_progress en_progreso usándolo.
    if (progress?.vehiculo_id) {
      const otroEnProgreso = await ctx.db
        .query("route_progress")
        .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
        .filter((q) => q.eq(q.field("vehiculo_id"), progress.vehiculo_id))
        .first();
      if (!otroEnProgreso) {
        await ctx.db.patch(progress.vehiculo_id, { estado: "disponible" });
      }
    }

    return args.id;
  },
});
