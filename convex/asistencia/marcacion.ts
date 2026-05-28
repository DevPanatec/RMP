// Asistencia — Marcación con PIN (Fase 1) + Facial (Fase 2 HARDENED).
// Módulo: ASI
//
// Cadena de validación común: kiosko_token → empleado activo+puede_marcar → método ok →
// geofence → tipo_marca consistente con jornada del día → upsert jornadas_asistencia + log.
//
// HARDENING facial (audit Fase 2):
// 1. Cliente envía solo embedding + empleado_id claim. Server hace match contra DB.
// 2. Embedding norm validada server-side (||v|| ≈ 1, sin esto un vector escalado pasa threshold).
// 3. Rate-limit per empleado (mirror de PIN: 5 fails → 15 min lockout).
// 4. Session nonce single-use (60s TTL) anti-replay.
// 5. Embeddings NUNCA salen de DB al cliente (getKioskoContext eliminado).
// 6. fecha calculada en TZ Panamá (no UTC) — overnight shifts funcionan.
// 7. bcrypt.compare async (no bloquea event loop).
// 8. GPS accuracy considerada en geofence (dist - accuracy <= radio).

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { haversineMeters, getPanamaFecha } from "../lib/geo";

const EMBEDDING_DIM = 1024;
// Threshold default — el server usa el de la zone si está configurado.
const FACIAL_THRESHOLD_DEFAULT = 0.6; // subido de 0.55 → 0.6 pa' gov (industria ArcFace usa 0.6-0.7)
const LIVENESS_THRESHOLD = 0.6;
const EMBEDDING_NORM_TOL = 0.02; // ||v|| debe estar en [0.98, 1.02]

const MAX_INTENTOS_PIN = 5;
const MAX_INTENTOS_FACIAL = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 min (PIN)
const LOCKOUT_FACIAL_MS = 15 * 60 * 1000; // 15 min (facial — más estricto)

const FACIAL_SESSION_TTL_MS = 60 * 1000; // 60s

type TipoMarca = "entrada" | "salida_almuerzo" | "regreso_almuerzo" | "salida";

const TIPO_MARCA_VALIDOS: TipoMarca[] = [
  "entrada",
  "salida_almuerzo",
  "regreso_almuerzo",
  "salida",
];

// ─── PIN (Fase 1) ───────────────────────────────────────────────────

export const marcarConPin = mutation({
  args: {
    device_token: v.string(),
    cedula: v.string(),
    pin: v.string(),
    tipo_marca: v.string(),
    gps_lat: v.number(),
    gps_lng: v.number(),
    gps_accuracy: v.optional(v.number()), // metros (HARDENING #8)
    foto_storage_id: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = getPanamaFecha(); // HARDENING #6

    // 1. Kiosko válido
    const kiosko = await ctx.db
      .query("kioscos")
      .withIndex("by_token", (q) => q.eq("device_token", args.device_token))
      .first();
    if (!kiosko) return { ok: false, error: "kiosko_invalido" };
    if (!kiosko.activo) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "kiosko_inactivo",
        cedula_intentada: args.cedula,
        tipo_marca_intentada: args.tipo_marca,
        metodo: "pin",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "kiosko_inactivo" };
    }

    if (!TIPO_MARCA_VALIDOS.includes(args.tipo_marca as TipoMarca)) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "tipo_marca_invalido",
        cedula_intentada: args.cedula,
        tipo_marca_intentada: args.tipo_marca,
        metodo: "pin",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "tipo_marca_invalido" };
    }
    const tipoMarca = args.tipo_marca as TipoMarca;

    // 2. Empleado por cédula + org del kiosko
    const empleados = await ctx.db
      .query("empleados")
      .withIndex("by_org_cedula", (q) =>
        q.eq("organizacion_id", kiosko.organizacion_id).eq("cedula", args.cedula.trim()),
      )
      .collect();
    const emp = empleados[0];
    if (!emp) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "empleado_no_existe",
        cedula_intentada: args.cedula,
        tipo_marca_intentada: tipoMarca,
        metodo: "pin",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "empleado_no_existe" };
    }
    if (!emp.activo || emp.puede_marcar === false) {
      await logIntento(ctx, {
        empleado_id: emp._id,
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "empleado_inactivo",
        cedula_intentada: args.cedula,
        tipo_marca_intentada: tipoMarca,
        metodo: "pin",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "empleado_inactivo" };
    }

    // 3. Lockout PIN
    if (emp.pin_bloqueado_hasta && emp.pin_bloqueado_hasta > now) {
      await logIntento(ctx, {
        empleado_id: emp._id,
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "pin_locked",
        cedula_intentada: args.cedula,
        tipo_marca_intentada: tipoMarca,
        metodo: "pin",
        foto_storage_id: args.foto_storage_id,
        detalle: `bloqueado hasta ${new Date(emp.pin_bloqueado_hasta).toISOString()}`,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "pin_locked", bloqueado_hasta: emp.pin_bloqueado_hasta };
    }

    // 4. Verificar PIN (async — no bloquea event loop)
    if (!emp.pin_hash) {
      await logIntento(ctx, {
        empleado_id: emp._id,
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "pin_no_configurado",
        cedula_intentada: args.cedula,
        tipo_marca_intentada: tipoMarca,
        metodo: "pin",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "pin_no_configurado" };
    }
    const pinOk = await bcrypt.compare(args.pin, emp.pin_hash);
    if (!pinOk) {
      const intentos = (emp.pin_intentos_fallidos ?? 0) + 1;
      const patch: any = { pin_intentos_fallidos: intentos };
      if (intentos >= MAX_INTENTOS_PIN) {
        patch.pin_bloqueado_hasta = now + LOCKOUT_MS;
        patch.pin_intentos_fallidos = 0;
      }
      await ctx.db.patch(emp._id, patch);
      await logIntento(ctx, {
        empleado_id: emp._id,
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "pin_fail",
        cedula_intentada: args.cedula,
        tipo_marca_intentada: tipoMarca,
        metodo: "pin",
        foto_storage_id: args.foto_storage_id,
        detalle: `intento ${intentos}/${MAX_INTENTOS_PIN}`,
        organizacion_id: kiosko.organizacion_id,
      });
      return {
        ok: false,
        error: "pin_fail",
        intentos_restantes: Math.max(0, MAX_INTENTOS_PIN - intentos),
      };
    }

    // 5. Validaciones comunes (zone + geofence + tipo consistente)
    const common = await validateMarcacion(ctx, {
      emp,
      kiosko,
      tipoMarca,
      today,
      gps_lat: args.gps_lat,
      gps_lng: args.gps_lng,
      gps_accuracy: args.gps_accuracy,
      metodo: "pin",
      cedula: args.cedula,
      foto_storage_id: args.foto_storage_id,
      now,
    });
    if (!common.ok) return (common as any).error;

    // 6. Upsert jornada
    const jornada = await upsertJornada(ctx, {
      emp,
      kiosko,
      tipoMarca,
      today,
      now,
      gps: { lat: args.gps_lat, lng: args.gps_lng },
      foto_storage_id: args.foto_storage_id,
      metodo: "pin",
    });

    // Limpiar intentos fallidos al login exitoso
    if (emp.pin_intentos_fallidos && emp.pin_intentos_fallidos > 0) {
      await ctx.db.patch(emp._id, { pin_intentos_fallidos: 0 });
    }

    await logIntento(ctx, {
      empleado_id: emp._id,
      kiosko_id: kiosko._id,
      timestamp: now,
      resultado: "ok",
      cedula_intentada: args.cedula,
      tipo_marca_intentada: tipoMarca,
      metodo: "pin",
      foto_storage_id: args.foto_storage_id,
      organizacion_id: kiosko.organizacion_id,
    });

    return {
      ok: true,
      jornada_id: jornada?._id,
      tipo_marca: tipoMarca,
      empleado_nombre: `${emp.nombre} ${emp.apellido}`,
      timestamp: now,
    };
  },
});

// ─── Facial Session (HARDENING #4 — nonce anti-replay) ──────────────

/**
 * Cliente pide sesión antes de marcar facial. Server emite nonce single-use (60s TTL).
 * `marcarConFacial` debe traer el nonce y se consume al usar.
 * Mitigación: replay de un request body capturado expira en 60s y solo funciona 1 vez.
 */
export const startFacialSession = mutation({
  args: { device_token: v.string() },
  handler: async (ctx, args) => {
    const kiosko = await ctx.db
      .query("kioscos")
      .withIndex("by_token", (q) => q.eq("device_token", args.device_token))
      .first();
    if (!kiosko || !kiosko.activo) throw new Error("Kiosko inválido");

    const now = Date.now();
    const nonce = randomHex(32);
    await ctx.db.insert("facial_sessions", {
      nonce,
      kiosko_id: kiosko._id,
      organizacion_id: kiosko.organizacion_id,
      creado_en: now,
      expira_en: now + FACIAL_SESSION_TTL_MS,
      consumido_en: undefined,
    });
    return { nonce, expira_en: now + FACIAL_SESSION_TTL_MS };
  },
});

// ─── Facial (Fase 2 HARDENED) ───────────────────────────────────────
//
// Cliente envía: device_token, session_nonce (de startFacialSession),
// empleado_id (claim, server re-valida match), embedding_actual (1024D normalizado),
// liveness_score (heurística cliente, server logueada pero no es trust boundary),
// tipo_marca, gps + accuracy, foto_storage_id.
//
// Server:
//  - Valida nonce single-use (TTL 60s).
//  - Valida ||embedding|| ≈ 1 (HARDENING #2).
//  - Hace cosine similarity contra empleado_facial_data EN DB (HARDENING #1 — cliente
//    nunca recibe el embedding pa' falsificar). Si falla, rate-limit.
//  - Loguea TODO en marcacion_intentos pa' forense.

export const marcarConFacial = mutation({
  args: {
    device_token: v.string(),
    session_nonce: v.string(),
    empleado_id: v.id("empleados"),
    embedding_actual: v.array(v.number()),
    liveness_score: v.number(),
    tipo_marca: v.string(),
    gps_lat: v.number(),
    gps_lng: v.number(),
    gps_accuracy: v.optional(v.number()),
    foto_storage_id: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = getPanamaFecha();

    // 1. Kiosko
    const kiosko = await ctx.db
      .query("kioscos")
      .withIndex("by_token", (q) => q.eq("device_token", args.device_token))
      .first();
    if (!kiosko || !kiosko.activo) {
      return { ok: false, error: "kiosko_invalido" };
    }

    // 2. Session nonce válido + consume
    const session = await ctx.db
      .query("facial_sessions")
      .withIndex("by_nonce", (q) => q.eq("nonce", args.session_nonce))
      .first();
    if (!session) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "session_invalid",
        tipo_marca_intentada: args.tipo_marca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        detalle: "nonce no existe",
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "session_invalid" };
    }
    if (session.consumido_en) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "session_invalid",
        tipo_marca_intentada: args.tipo_marca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        detalle: "nonce ya consumido (replay attempt)",
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "session_invalid" };
    }
    if (session.expira_en < now) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "session_invalid",
        tipo_marca_intentada: args.tipo_marca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        detalle: "nonce expirado",
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "session_invalid" };
    }
    if (session.kiosko_id !== kiosko._id) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "session_invalid",
        tipo_marca_intentada: args.tipo_marca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        detalle: "nonce de otro kiosko",
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "session_invalid" };
    }
    // Consume nonce (idempotent — incluso si falla resto del flow, no se reusa)
    await ctx.db.patch(session._id, { consumido_en: now });

    // 3. Tipo de marca válido
    if (!TIPO_MARCA_VALIDOS.includes(args.tipo_marca as TipoMarca)) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "tipo_marca_invalido",
        tipo_marca_intentada: args.tipo_marca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "tipo_marca_invalido" };
    }
    const tipoMarca = args.tipo_marca as TipoMarca;

    // 4. Sanity check embedding shape
    if (args.embedding_actual.length !== EMBEDDING_DIM) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "facial_invalid_shape",
        tipo_marca_intentada: tipoMarca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
        detalle: `embedding dim ${args.embedding_actual.length} != ${EMBEDDING_DIM}`,
      });
      return { ok: false, error: "facial_invalid_shape" };
    }

    // 4b. Validar norm L2 ≈ 1 (HARDENING #2 — cierra magnitude attack)
    const norm = vectorNorm(args.embedding_actual);
    if (Math.abs(norm - 1) > EMBEDDING_NORM_TOL) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "facial_invalid_norm",
        tipo_marca_intentada: tipoMarca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
        detalle: `||v||=${norm.toFixed(4)} fuera de [${1 - EMBEDDING_NORM_TOL}, ${1 + EMBEDDING_NORM_TOL}]`,
      });
      return { ok: false, error: "facial_invalid_norm" };
    }

    // 5. Empleado válido en la org del kiosko
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp || emp.organizacion_id !== kiosko.organizacion_id) {
      await logIntento(ctx, {
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "empleado_no_existe",
        tipo_marca_intentada: tipoMarca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "empleado_no_existe" };
    }
    if (!emp.activo || emp.puede_marcar === false) {
      await logIntento(ctx, {
        empleado_id: emp._id,
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "empleado_inactivo",
        tipo_marca_intentada: tipoMarca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "empleado_inactivo" };
    }

    // 5b. Rate-limit facial (HARDENING #3)
    if (emp.facial_bloqueado_hasta && emp.facial_bloqueado_hasta > now) {
      await logIntento(ctx, {
        empleado_id: emp._id,
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "facial_locked",
        tipo_marca_intentada: tipoMarca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        detalle: `bloqueado hasta ${new Date(emp.facial_bloqueado_hasta).toISOString()}`,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "facial_locked", bloqueado_hasta: emp.facial_bloqueado_hasta };
    }

    // 6. Liveness (heurística cliente — se loguea pero no es trust boundary primary;
    //    el bloqueo real es nonce + rate-limit + embedding match contra DB).
    //    TODO Fase 3: re-derivar liveness server-side via Convex Node action con
    //    @vladmandic/human + @tensorflow/tfjs (WASM backend). Pendiente validar
    //    deploy a Convex (bundle size + cold start). Mientras tanto el cliente envía
    //    liveness pero el daño está acotado por nonce single-use + rate-limit.
    if (args.liveness_score < LIVENESS_THRESHOLD) {
      await bumpFacialFail(ctx, emp, now);
      await logIntento(ctx, {
        empleado_id: emp._id,
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "liveness_fail",
        tipo_marca_intentada: tipoMarca,
        metodo: "facial",
        liveness_score: args.liveness_score,
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "liveness_fail", liveness_score: args.liveness_score };
    }

    // 7. Server-side match contra DB (HARDENING #1 — cliente jamás vio el embedding promedio)
    if (!emp.tiene_facial) {
      await logIntento(ctx, {
        empleado_id: emp._id,
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "facial_no_enrolled",
        tipo_marca_intentada: tipoMarca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "facial_no_enrolled" };
    }
    const facial = await ctx.db
      .query("empleado_facial_data")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", emp._id))
      .first();
    if (!facial) {
      await logIntento(ctx, {
        empleado_id: emp._id,
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "facial_no_enrolled",
        tipo_marca_intentada: tipoMarca,
        metodo: "facial",
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
      });
      return { ok: false, error: "facial_no_enrolled" };
    }

    // Score autoritativo: MAX(sim_promedio, max(sim_individual)).
    // Esto evita que un solo embedding de baja calidad en enrollment degrade el promedio.
    let sim = cosineSimilarity(args.embedding_actual, facial.embedding_promedio);
    for (const embRaw of facial.embeddings) {
      const s = cosineSimilarity(args.embedding_actual, embRaw);
      if (s > sim) sim = s;
    }

    const zona = await ctx.db.get(kiosko.attendance_zone_id);
    const threshold = zona?.facial_threshold ?? FACIAL_THRESHOLD_DEFAULT;
    if (sim < threshold) {
      await bumpFacialFail(ctx, emp, now);
      await logIntento(ctx, {
        empleado_id: emp._id,
        kiosko_id: kiosko._id,
        timestamp: now,
        resultado: "facial_low_score",
        tipo_marca_intentada: tipoMarca,
        metodo: "facial",
        score: sim,
        liveness_score: args.liveness_score,
        foto_storage_id: args.foto_storage_id,
        organizacion_id: kiosko.organizacion_id,
        detalle: `similarity ${sim.toFixed(3)} < threshold ${threshold}`,
      });
      return { ok: false, error: "facial_low_score", score: sim, threshold };
    }

    // 8. Validaciones comunes
    if (!zona) return { ok: false, error: "zona_no_encontrada" };
    const common = await validateMarcacion(ctx, {
      emp,
      kiosko,
      tipoMarca,
      today,
      gps_lat: args.gps_lat,
      gps_lng: args.gps_lng,
      gps_accuracy: args.gps_accuracy,
      metodo: "facial",
      foto_storage_id: args.foto_storage_id,
      score: sim,
      liveness_score: args.liveness_score,
      now,
    });
    if (!common.ok) return (common as any).error;

    // 9. Upsert jornada
    const jornada = await upsertJornada(ctx, {
      emp,
      kiosko,
      tipoMarca,
      today,
      now,
      gps: { lat: args.gps_lat, lng: args.gps_lng },
      foto_storage_id: args.foto_storage_id,
      metodo: "facial",
      score: sim,
    });

    // Reset rate-limit en éxito
    if ((emp.facial_intentos_fallidos ?? 0) > 0) {
      await ctx.db.patch(emp._id, { facial_intentos_fallidos: 0 });
    }

    await logIntento(ctx, {
      empleado_id: emp._id,
      kiosko_id: kiosko._id,
      timestamp: now,
      resultado: "ok",
      tipo_marca_intentada: tipoMarca,
      metodo: "facial",
      score: sim,
      liveness_score: args.liveness_score,
      foto_storage_id: args.foto_storage_id,
      organizacion_id: kiosko.organizacion_id,
    });

    return {
      ok: true,
      jornada_id: jornada?._id,
      tipo_marca: tipoMarca,
      empleado_nombre: `${emp.nombre} ${emp.apellido}`,
      timestamp: now,
      score: sim,
    };
  },
});

// ─── Server-side 1:N facial match (HARDENING #1 — embeddings nunca salen) ───
//
// Cliente envía embedding "ciego" + device_token. Server itera empleados de la zona,
// calcula cosine vs embedding_promedio, devuelve mejor match (o null) con score.
// SOLO devuelve empleado_id + nombre + score — nunca el embedding match. Cliente
// usa el resultado solo pa' UX greeting; la marcación real corre por marcarConFacial
// que re-valida con norm + nonce + tipo + geofence + threshold.
export const matchFacial = mutation({
  args: {
    device_token: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const kiosko = await ctx.db
      .query("kioscos")
      .withIndex("by_token", (q) => q.eq("device_token", args.device_token))
      .first();
    if (!kiosko || !kiosko.activo) return null;

    // Sanity shape + norm
    if (args.embedding.length !== EMBEDDING_DIM) return null;
    const norm = vectorNorm(args.embedding);
    if (Math.abs(norm - 1) > EMBEDDING_NORM_TOL) return null;

    const zona = await ctx.db.get(kiosko.attendance_zone_id);
    if (!zona) return null;
    const threshold = zona.facial_threshold ?? FACIAL_THRESHOLD_DEFAULT;

    const today = getPanamaFecha();
    const asignaciones = await ctx.db
      .query("asignacion_zona_historico")
      .withIndex("by_zone", (q) => q.eq("attendance_zone_id", kiosko.attendance_zone_id))
      .collect();
    const empleadoIds = asignaciones
      .filter(
        (a) =>
          a.vigencia_desde <= today &&
          (!a.vigencia_hasta || a.vigencia_hasta >= today),
      )
      .map((a) => a.empleado_id);

    // Cargar facial_data de empleados con enrollment activo, en paralelo
    const allFacial = await Promise.all(
      empleadoIds.map((id) =>
        ctx.db
          .query("empleado_facial_data")
          .withIndex("by_empleado", (q) => q.eq("empleado_id", id))
          .first(),
      ),
    );

    let bestId: any = null;
    let bestScore = threshold;
    for (const fd of allFacial) {
      if (!fd) continue;
      const s = cosineSimilarity(args.embedding, fd.embedding_promedio);
      if (s > bestScore) {
        bestScore = s;
        bestId = fd.empleado_id;
      }
    }
    if (!bestId) return null;
    return { empleado_id: bestId, score: bestScore };
  },
});

// Upload URL para foto de marcación (gate por kiosko activo conocido).
export const generateMarcacionUploadUrl = mutation({
  args: { device_token: v.string() },
  handler: async (ctx, args) => {
    const kiosko = await ctx.db
      .query("kioscos")
      .withIndex("by_token", (q) => q.eq("device_token", args.device_token))
      .first();
    if (!kiosko || !kiosko.activo) {
      throw new Error("Kiosko inválido");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Helpers compartidos ────────────────────────────────────────────

async function validateMarcacion(
  ctx: any,
  v: {
    emp: any;
    kiosko: any;
    tipoMarca: TipoMarca;
    today: string;
    gps_lat: number;
    gps_lng: number;
    gps_accuracy?: number;
    metodo: "pin" | "facial";
    foto_storage_id?: any;
    cedula?: string;
    score?: number;
    liveness_score?: number;
    now: number;
  },
): Promise<{ ok: true } | { ok: false; error: any }> {
  // Zone asignada (vigente hoy)
  const asignacionesZona = await ctx.db
    .query("asignacion_zona_historico")
    .withIndex("by_empleado", (q: any) => q.eq("empleado_id", v.emp._id))
    .collect();
  const zonaActiva = asignacionesZona.find(
    (a: any) =>
      a.attendance_zone_id === v.kiosko.attendance_zone_id &&
      a.vigencia_desde <= v.today &&
      (!a.vigencia_hasta || a.vigencia_hasta >= v.today),
  );
  if (!zonaActiva) {
    await logIntento(ctx, {
      empleado_id: v.emp._id,
      kiosko_id: v.kiosko._id,
      timestamp: v.now,
      resultado: "empleado_no_zone",
      cedula_intentada: v.cedula,
      tipo_marca_intentada: v.tipoMarca,
      metodo: v.metodo,
      score: v.score,
      foto_storage_id: v.foto_storage_id,
      detalle: "empleado no asignado a esta zona",
      organizacion_id: v.kiosko.organizacion_id,
    });
    return { ok: false, error: { ok: false, error: "empleado_no_zone" } };
  }

  // Geofence: dist - accuracy <= radio (HARDENING #8 — GPS noisy no penaliza al empleado in-zone)
  const zona = await ctx.db.get(v.kiosko.attendance_zone_id);
  if (!zona) return { ok: false, error: { ok: false, error: "zona_no_encontrada" } };
  const dist = haversineMeters(v.gps_lat, v.gps_lng, zona.latitud, zona.longitud);
  const accuracy = v.gps_accuracy ?? 0;
  const distEffective = Math.max(0, dist - accuracy);
  if (distEffective > zona.radio) {
    await logIntento(ctx, {
      empleado_id: v.emp._id,
      kiosko_id: v.kiosko._id,
      timestamp: v.now,
      resultado: "geofence_fail",
      cedula_intentada: v.cedula,
      tipo_marca_intentada: v.tipoMarca,
      metodo: v.metodo,
      score: v.score,
      foto_storage_id: v.foto_storage_id,
      detalle: `dist ${Math.round(dist)}m (acc ${Math.round(accuracy)}m) > radio ${zona.radio}m`,
      organizacion_id: v.kiosko.organizacion_id,
    });
    return {
      ok: false,
      error: {
        ok: false,
        error: "geofence_fail",
        distancia_m: Math.round(dist),
        accuracy_m: Math.round(accuracy),
        radio_m: zona.radio,
      },
    };
  }

  // Tipo de marca consistente con jornada del día
  const jornadasDelDia = await ctx.db
    .query("jornadas_asistencia")
    .withIndex("by_empleado_fecha", (q: any) =>
      q.eq("empleado_id", v.emp._id).eq("fecha", v.today),
    )
    .collect();
  const jornada = jornadasDelDia[0];
  const consistenteError = checkTipoMarcaConsistencia(v.tipoMarca, jornada);
  if (consistenteError) {
    await logIntento(ctx, {
      empleado_id: v.emp._id,
      kiosko_id: v.kiosko._id,
      timestamp: v.now,
      resultado: "tipo_marca_invalido",
      cedula_intentada: v.cedula,
      tipo_marca_intentada: v.tipoMarca,
      metodo: v.metodo,
      score: v.score,
      foto_storage_id: v.foto_storage_id,
      detalle: consistenteError,
      organizacion_id: v.kiosko.organizacion_id,
    });
    return {
      ok: false,
      error: { ok: false, error: "tipo_marca_invalido", detalle: consistenteError },
    };
  }

  return { ok: true };
}

async function upsertJornada(
  ctx: any,
  v: {
    emp: any;
    kiosko: any;
    tipoMarca: TipoMarca;
    today: string;
    now: number;
    gps: { lat: number; lng: number };
    foto_storage_id?: any;
    metodo: "pin" | "facial";
    score?: number;
  },
) {
  const patch: any = {};
  patch[`${v.tipoMarca}_timestamp`] = v.now;
  patch[`${v.tipoMarca}_metodo`] = v.metodo;
  patch[`${v.tipoMarca}_kiosko_id`] = v.kiosko._id;
  patch[`${v.tipoMarca}_gps`] = v.gps;
  if (v.foto_storage_id) patch[`${v.tipoMarca}_foto_storage_id`] = v.foto_storage_id;
  if (v.score !== undefined) patch[`${v.tipoMarca}_score`] = v.score;

  const existing = await ctx.db
    .query("jornadas_asistencia")
    .withIndex("by_empleado_fecha", (q: any) =>
      q.eq("empleado_id", v.emp._id).eq("fecha", v.today),
    )
    .first();

  if (!existing) {
    const newId = await ctx.db.insert("jornadas_asistencia", {
      empleado_id: v.emp._id,
      fecha: v.today,
      estado: v.tipoMarca === "salida" ? "completa" : "en_curso",
      proyecto_id: v.emp.proyecto_id,
      organizacion_id: v.kiosko.organizacion_id,
      ...patch,
    });
    return await ctx.db.get(newId);
  } else {
    const nextEstado = v.tipoMarca === "salida" ? "completa" : existing.estado;
    await ctx.db.patch(existing._id, { ...patch, estado: nextEstado });
    return await ctx.db.get(existing._id);
  }
}

async function bumpFacialFail(ctx: any, emp: any, now: number) {
  const intentos = (emp.facial_intentos_fallidos ?? 0) + 1;
  const patch: any = { facial_intentos_fallidos: intentos };
  if (intentos >= MAX_INTENTOS_FACIAL) {
    patch.facial_bloqueado_hasta = now + LOCKOUT_FACIAL_MS;
    patch.facial_intentos_fallidos = 0;
  }
  await ctx.db.patch(emp._id, patch);
}

async function logIntento(ctx: any, data: any) {
  await ctx.db.insert("marcacion_intentos", data);
}

function vectorNorm(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

// Cosine similarity. Asume vectores L2-normalizados (server valida norm).
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// Random hex string (n bytes → 2n chars) usando Web Crypto API.
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < arr.length; i++) {
    s += arr[i].toString(16).padStart(2, "0");
  }
  return s;
}

// Devuelve mensaje de error si el tipo de marca no es consistente con la jornada actual.
// null = consistente, ok proceder.
function checkTipoMarcaConsistencia(tipo: TipoMarca, jornada: any | undefined): string | null {
  const has = (k: string) => !!jornada?.[k];
  switch (tipo) {
    case "entrada":
      if (has("entrada_timestamp")) return "ya marcaste entrada hoy";
      return null;
    case "salida_almuerzo":
      if (!has("entrada_timestamp")) return "debes marcar entrada primero";
      if (has("salida_almuerzo_timestamp")) return "ya marcaste salida a almuerzo";
      return null;
    case "regreso_almuerzo":
      if (!has("salida_almuerzo_timestamp")) return "debes marcar salida a almuerzo primero";
      if (has("regreso_almuerzo_timestamp")) return "ya marcaste regreso de almuerzo";
      return null;
    case "salida":
      if (!has("entrada_timestamp")) return "debes marcar entrada primero";
      if (has("salida_timestamp")) return "ya marcaste salida hoy";
      if (has("salida_almuerzo_timestamp") && !has("regreso_almuerzo_timestamp")) {
        return "debes marcar regreso de almuerzo primero";
      }
      return null;
    default:
      return "tipo de marca desconocido";
  }
}
