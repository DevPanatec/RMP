// Asistencia — Kioscos (dispositivos físicos de marcación).
// Módulo: ASI
//
// HARDENING (Fase 2 audit):
// - getKioskoContext YA NO devuelve embeddings (biometric PII). Splits en 2 queries:
//   * getKioskoEmpleados: estático (empleados + meta), cacheable largo.
//   * getKioskoState: dinámico (jornadas hoy + horarios), reactivo a marcaciones.
// - Token kiosko via crypto.randomUUID (no Math.random).
// - Loops paralelizados con Promise.all.

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";
import { getPanamaFecha } from "../lib/geo";

// ─── Admin queries ──────────────────────────────────────────────────

export const list = query({
  args: { activo: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    let rows: any[];
    if (scope.isSuperAdmin) {
      rows = await ctx.db.query("kioscos").collect();
    } else if (scope.organizacionId) {
      rows = await ctx.db
        .query("kioscos")
        .withIndex("by_organizacion", (q) => q.eq("organizacion_id", scope.organizacionId!))
        .collect();
    } else {
      rows = [];
    }
    if (args.activo !== undefined) {
      rows = rows.filter((k) => k.activo === args.activo);
    }
    return rows;
  },
});

export const getById = query({
  args: { id: v.id("kioscos") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    await requireOrgAccess(ctx, row.organizacion_id);
    return row;
  },
});

// ─── Kiosko-facing queries (token gated) ────────────────────────────
//
// Split en 2 queries pa' minimizar payload reactivo:
// 1. getKioskoEmpleados: cambia raro (cuando admin enrolla / asigna zona).
// 2. getKioskoState: cambia cada marcación (jornadas hoy).
//
// Embeddings NUNCA salen al cliente. Match es 100% server-side.

/**
 * Lookup interno reusable (NO export como query) pa' que las 2 queries públicas
 * y mutations compartan la lógica de cargar kiosko + zona.
 */
async function loadKioskoMeta(ctx: any, deviceToken: string) {
  const kiosko = await ctx.db
    .query("kioscos")
    .withIndex("by_token", (q: any) => q.eq("device_token", deviceToken))
    .first();
  if (!kiosko || !kiosko.activo) return null;
  const zona = await ctx.db.get(kiosko.attendance_zone_id);
  if (!zona || !zona.activo) return null;
  return { kiosko, zona };
}

/**
 * Datos estáticos del kiosko: kiosko meta + zona + lista de empleados elegibles
 * (con flags tiene_pin/tiene_facial pero SIN embeddings).
 *
 * Reactividad: cambia cuando alguien enrolla facial, asigna zona, crea/desactiva
 * empleado, o renombra zona. NO cambia con cada marcación (esa es la otra query).
 */
export const getKioskoEmpleados = query({
  args: { device_token: v.string() },
  handler: async (ctx, args) => {
    const meta = await loadKioskoMeta(ctx, args.device_token);
    if (!meta) return null;
    const { kiosko, zona } = meta;
    const today = getPanamaFecha();

    // Empleados con asignación vigente a esta zona
    const asignacionesZona = await ctx.db
      .query("asignacion_zona_historico")
      .withIndex("by_zone", (q) => q.eq("attendance_zone_id", kiosko.attendance_zone_id))
      .collect();
    const empleadosIdSet = new Set<string>();
    for (const a of asignacionesZona) {
      if (a.vigencia_desde <= today && (!a.vigencia_hasta || a.vigencia_hasta >= today)) {
        empleadosIdSet.add(a.empleado_id);
      }
    }

    // Cargar empleados en paralelo (era for-await secuencial)
    const empleadosRaw: any[] = await Promise.all(
      Array.from(empleadosIdSet).map((id) => ctx.db.get(id as any)),
    );
    const empleados = empleadosRaw
      .filter((e: any) => !!e && e.activo && e.puede_marcar !== false)
      .map((e: any) => ({
        _id: e._id as string,
        nombre: e.nombre,
        apellido: e.apellido,
        cedula: e.cedula,
        tiene_pin: !!e.pin_hash,
        tiene_facial: !!e.tiene_facial,
        // ⚠️ NO embedding_promedio — biometric PII. Match es server-side.
      }));

    return {
      kiosko: {
        _id: kiosko._id,
        nombre: kiosko.nombre,
        attendance_zone_id: kiosko.attendance_zone_id,
        organizacion_id: kiosko.organizacion_id,
      },
      zona: {
        _id: zona._id,
        nombre: zona.nombre,
        latitud: zona.latitud,
        longitud: zona.longitud,
        radio: zona.radio,
        direccion: zona.direccion,
        liveness_mode: zona.liveness_mode ?? "passive_first",
        facial_threshold: zona.facial_threshold ?? 0.6,
        auto_confirm_segundos: zona.auto_confirm_segundos ?? 5,
      },
      empleados,
    };
  },
});

/**
 * Estado dinámico del día: jornadas + horarios vigentes (pa' auto-detect tipo_marca).
 * Reactivo a cada marcación. Payload chico (sin embeddings, sin meta zona).
 */
export const getKioskoState = query({
  args: { device_token: v.string() },
  handler: async (ctx, args) => {
    const meta = await loadKioskoMeta(ctx, args.device_token);
    if (!meta) return null;
    const { kiosko } = meta;
    const today = getPanamaFecha();

    // Empleados elegibles (otra vez — query separado por reactividad)
    const asignacionesZona = await ctx.db
      .query("asignacion_zona_historico")
      .withIndex("by_zone", (q) => q.eq("attendance_zone_id", kiosko.attendance_zone_id))
      .collect();
    const empleadosIds: string[] = [];
    for (const a of asignacionesZona) {
      if (a.vigencia_desde <= today && (!a.vigencia_hasta || a.vigencia_hasta >= today)) {
        empleadosIds.push(a.empleado_id);
      }
    }

    // Jornadas hoy + asignaciones horario — paralelo
    const [jornadasArr, horariosArr] = await Promise.all([
      Promise.all(
        empleadosIds.map((id) =>
          ctx.db
            .query("jornadas_asistencia")
            .withIndex("by_empleado_fecha", (q) => q.eq("empleado_id", id as any).eq("fecha", today))
            .first(),
        ),
      ),
      // Horario resuelto: PRIMERO override calendario, fallback asignacion default
      Promise.all(
        empleadosIds.map(async (id) => {
          const override = await ctx.db
            .query("turnos_calendario")
            .withIndex("by_empleado_fecha", (q) =>
              q.eq("empleado_id", id as any).eq("fecha", today),
            )
            .first();
          if (override) {
            // Si override existe (incluso con horario_plantilla_id=null=OFF) lo respetamos
            return { horario_plantilla_id: override.horario_plantilla_id, source: "calendario" };
          }
          const asignaciones = await ctx.db
            .query("asignacion_horario_historico")
            .withIndex("by_empleado_vigencia", (q) => q.eq("empleado_id", id as any))
            .order("desc")
            .collect();
          const vigente = asignaciones.find(
            (a: any) =>
              a.vigencia_desde <= today &&
              (!a.vigencia_hasta || a.vigencia_hasta >= today),
          );
          if (!vigente) return null;
          return { horario_plantilla_id: vigente.horario_plantilla_id, source: "asignacion" };
        }),
      ),
    ]);

    // Cargar plantillas únicas (no 1 por empleado)
    const plantillaIds = Array.from(
      new Set(
        horariosArr
          .filter((h: any) => h && h.horario_plantilla_id)
          .map((h: any) => h.horario_plantilla_id as string),
      ),
    );
    const plantillas = await Promise.all(plantillaIds.map((pid) => ctx.db.get(pid as any)));
    const plantillaMap = new Map(
      plantillas.filter(Boolean).map((p: any) => [p._id as string, p]),
    );

    const jornadasHoy: Record<string, any> = {};
    const horariosVigentes: Record<string, any> = {};
    empleadosIds.forEach((empId, idx) => {
      const j = jornadasArr[idx];
      if (j) {
        jornadasHoy[empId] = {
          entrada: !!j.entrada_timestamp,
          salida_almuerzo: !!j.salida_almuerzo_timestamp,
          regreso_almuerzo: !!j.regreso_almuerzo_timestamp,
          salida: !!j.salida_timestamp,
          estado: j.estado,
        };
      }
      const h = horariosArr[idx];
      if (h) {
        // OFF explícito (calendario override sin plantilla) → marca como off pa' UI
        if (!h.horario_plantilla_id) {
          horariosVigentes[empId] = { off: true, source: h.source };
        } else {
          const plantilla = plantillaMap.get(h.horario_plantilla_id as string);
          if (plantilla) {
            horariosVigentes[empId] = {
              hora_entrada: plantilla.hora_entrada,
              hora_salida: plantilla.hora_salida,
              hora_almuerzo_inicio: plantilla.hora_almuerzo_inicio,
              hora_almuerzo_fin: plantilla.hora_almuerzo_fin,
              source: h.source,
            };
          }
        }
      }
    });

    return { jornadasHoy, horariosVigentes, fecha: today };
  },
});

// NOTA: `getKioskoContext` (legacy combinado) ELIMINADO. KioskoApp migra a
// getKioskoEmpleados + getKioskoState. Esta separación evita re-enviar
// embeddings + meta zona en cada ping/marcación, y nunca expone embeddings al cliente.

// ─── Mutations admin ────────────────────────────────────────────────

export const create = mutation({
  args: {
    nombre: v.string(),
    attendance_zone_id: v.id("attendance_zones"),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const zona = await ctx.db.get(args.attendance_zone_id);
    if (!zona) throw new Error("Zona no encontrada");
    await requireOrgAccess(ctx, zona.organizacion_id);
    const scope = await getAuthScope(ctx);
    const token = generateDeviceToken();
    return await ctx.db.insert("kioscos", {
      nombre: args.nombre,
      attendance_zone_id: args.attendance_zone_id,
      device_token: token,
      ultimo_ping: undefined,
      activo: true,
      organizacion_id: zona.organizacion_id,
      created_at: Date.now(),
      created_by: scope.perfil?._id,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("kioscos"),
    nombre: v.optional(v.string()),
    activo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Kiosko no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const regenerateToken = mutation({
  args: { id: v.id("kioscos") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Kiosko no encontrado");
    await requireOrgAccess(ctx, row.organizacion_id);
    const token = generateDeviceToken();
    await ctx.db.patch(args.id, { device_token: token });
    return token;
  },
});

export const ping = mutation({
  args: { device_token: v.string() },
  handler: async (ctx, args) => {
    // Pa' heartbeat del kiosko — no requiere Clerk auth (token = auth)
    const row = await ctx.db
      .query("kioscos")
      .withIndex("by_token", (q) => q.eq("device_token", args.device_token))
      .first();
    if (!row || !row.activo) return false;
    await ctx.db.patch(row._id, { ultimo_ping: Date.now() });
    return true;
  },
});

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Token kiosko crypto-strong via crypto.randomUUID() (Convex runtime soporta crypto global).
 * Pre-fija "ks_" para identificar visualmente en logs.
 */
function generateDeviceToken(): string {
  // crypto.randomUUID es seguro (256 bits entropía pa' UUID v4 cryptographic)
  return "ks_" + crypto.randomUUID();
}
