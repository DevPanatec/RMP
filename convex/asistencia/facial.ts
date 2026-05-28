// Asistencia — Facial enrollment + lookup (Fase 2).
// Módulo: ASI
//
// SEGURIDAD:
// - Embeddings nunca se exponen vía query pública con auth Clerk admin.
// - Match SIEMPRE server-side en marcacion.ts (cliente no es trust boundary).
// - Server SIEMPRE re-valida similarity + norm + nonce + rate-limit.

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireAdminWrite, requireSuperAdmin } from "../lib/auth";
import { requireModulo } from "../lib/modules";

const EMBEDDING_DIM = 1024;
const MIN_EMBEDDINGS_ENROLLMENT = 3; // mínimo aceptable. Recomendado 5-7.
const MAX_EMBEDDINGS_ENROLLMENT = 10;

// Admin enrolla embeddings del empleado (toma N fotos en cliente con human library).
// Cliente envía: array de embeddings raw (cada uno 1024 floats normalizados),
// foto_storage_ids (subidas con generateUploadUrl previamente), y quality_scores opcional.
// Server: valida + calcula promedio L2-normalizado + upsert tabla + setea empleado.tiene_facial=true.
export const enrollEmpleado = mutation({
  args: {
    empleado_id: v.id("empleados"),
    embeddings: v.array(v.array(v.number())),
    foto_storage_ids: v.array(v.id("_storage")),
    quality_scores: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");

    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización");
    await requireOrgAccess(ctx, emp.organizacion_id);

    // Validación shape
    const n = args.embeddings.length;
    if (n < MIN_EMBEDDINGS_ENROLLMENT) {
      throw new Error(`Mínimo ${MIN_EMBEDDINGS_ENROLLMENT} fotos para enrollment (recibidas ${n})`);
    }
    if (n > MAX_EMBEDDINGS_ENROLLMENT) {
      throw new Error(`Máximo ${MAX_EMBEDDINGS_ENROLLMENT} fotos por enrollment`);
    }
    for (const emb of args.embeddings) {
      if (emb.length !== EMBEDDING_DIM) {
        throw new Error(`Embedding debe tener ${EMBEDDING_DIM} dimensiones (recibido ${emb.length})`);
      }
    }
    if (args.foto_storage_ids.length !== n) {
      throw new Error("foto_storage_ids debe coincidir en longitud con embeddings");
    }

    // Server-side normalize cada embedding raw (defensa en profundidad — cliente debería
    // mandarlos normalizados, pero validamos pa' que match server-side sea correcto).
    const embeddingsNorm = args.embeddings.map((emb) => {
      let norm = 0;
      for (let i = 0; i < EMBEDDING_DIM; i++) norm += emb[i] * emb[i];
      norm = Math.sqrt(norm);
      if (norm < 1e-9) throw new Error("Embedding inválido (norma cero) en enrollment");
      return emb.map((x) => x / norm);
    });

    // Promedio L2-normalizado: mean(embeddings_norm) → normalize.
    // Esto deja embedding_promedio listo pa' cosine similarity vía dot product.
    const promedio = new Array<number>(EMBEDDING_DIM).fill(0);
    for (const emb of embeddingsNorm) {
      for (let i = 0; i < EMBEDDING_DIM; i++) {
        promedio[i] += emb[i];
      }
    }
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      promedio[i] /= n;
    }
    let norm = 0;
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      norm += promedio[i] * promedio[i];
    }
    norm = Math.sqrt(norm);
    if (norm < 1e-9) throw new Error("Embedding promedio inválido (norma cero) — fotos demasiado heterogéneas");
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      promedio[i] /= norm;
    }

    // Upsert: 1 registro por empleado.
    const existing = await ctx.db
      .query("empleado_facial_data")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
      .first();

    const scope = await getAuthScope(ctx);
    const data = {
      empleado_id: args.empleado_id,
      embeddings: embeddingsNorm, // versiones normalizadas (no las raw del cliente)
      embedding_promedio: promedio,
      embedding_dim: EMBEDDING_DIM,
      foto_storage_ids: args.foto_storage_ids,
      quality_scores: args.quality_scores,
      enrolled_at: Date.now(),
      enrolled_by: scope.perfil?._id,
      organizacion_id: emp.organizacion_id,
    };

    if (existing) {
      // Borrar fotos antiguas pa' no acumular storage
      for (const oldStorageId of existing.foto_storage_ids) {
        if (!args.foto_storage_ids.includes(oldStorageId)) {
          try {
            await ctx.storage.delete(oldStorageId);
          } catch {
            // best effort — si falla seguimos
          }
        }
      }
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("empleado_facial_data", data);
    }

    await ctx.db.patch(args.empleado_id, { tiene_facial: true });
    return { ok: true, n_embeddings: n };
  },
});

// Borra enrollment del empleado (reset facial).
export const clearFacial = mutation({
  args: { empleado_id: v.id("empleados") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (emp.organizacion_id) await requireOrgAccess(ctx, emp.organizacion_id);
    const existing = await ctx.db
      .query("empleado_facial_data")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
      .first();
    if (existing) {
      for (const sid of existing.foto_storage_ids) {
        try { await ctx.storage.delete(sid); } catch { /* best effort */ }
      }
      await ctx.db.delete(existing._id);
    }
    await ctx.db.patch(args.empleado_id, { tiene_facial: false });
    return { ok: true };
  },
});

// Devuelve URL firmada de UNA foto de enrollment (pa' que admin verifique).
export const getEnrollmentPhotoUrl = query({
  args: { empleado_id: v.id("empleados"), index: v.number() },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp || !emp.organizacion_id) return null;
    if (!scope.isSuperAdmin && scope.organizacionId !== emp.organizacion_id) return null;
    const data = await ctx.db
      .query("empleado_facial_data")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
      .first();
    if (!data) return null;
    if (args.index < 0 || args.index >= data.foto_storage_ids.length) return null;
    return await ctx.storage.getUrl(data.foto_storage_ids[args.index]);
  },
});

// Upload URL para fotos de enrollment (admin only).
export const generateEnrollmentUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    return await ctx.storage.generateUploadUrl();
  },
});

// Devuelve URLs firmadas de TODAS las fotos enrolladas + quality scores (admin preview).
export const getEnrollmentPhotos = query({
  args: { empleado_id: v.id("empleados") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp || !emp.organizacion_id) return null;
    if (!scope.isSuperAdmin && scope.organizacionId !== emp.organizacion_id) return null;
    const data = await ctx.db
      .query("empleado_facial_data")
      .withIndex("by_empleado", (q) => q.eq("empleado_id", args.empleado_id))
      .first();
    if (!data) return null;
    const urls = await Promise.all(
      data.foto_storage_ids.map((sid) => ctx.storage.getUrl(sid)),
    );
    return {
      enrolled_at: data.enrolled_at,
      n_fotos: data.foto_storage_ids.length,
      fotos: urls.map((url, i) => ({
        url,
        quality: data.quality_scores?.[i] ?? null,
      })),
    };
  },
});

// URL firmada de la foto de UN intento de marcación (admin auditoría forense).
export const getIntentoPhotoUrl = query({
  args: { intento_id: v.id("marcacion_intentos") },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const intento = await ctx.db.get(args.intento_id);
    if (!intento) return null;
    if (!scope.isSuperAdmin && scope.organizacionId !== intento.organizacion_id) return null;
    if (!intento.foto_storage_id) return null;
    return await ctx.storage.getUrl(intento.foto_storage_id);
  },
});

// Borrar storage objects huérfanos de un enrollment fallido. Idempotente.
// Cliente lo llama en catch de Promise.allSettled cuando 1+ uploads succedieron
// pero el enrollment global falló.
export const deleteOrphanStorage = mutation({
  args: { storage_ids: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    let deleted = 0;
    for (const sid of args.storage_ids) {
      try {
        await ctx.storage.delete(sid);
        deleted++;
      } catch {
        // ignore — best-effort
      }
    }
    return { deleted };
  },
});

// ─── Migration: re-normalize legacy embeddings ──────────────────────
//
// Pre-hardening enrollEmpleado NO normalizaba cada embedding raw antes de promediar.
// Post-hardening marcarConFacial usa MAX(cosine(actual, raw_i)) — si raw_i no está
// normalizado el score sale distorsionado.
//
// Esta mutation itera empleado_facial_data, normaliza embeddings[] + recomputa
// embedding_promedio. Idempotente (re-normalizar uno ya normalizado = no-op).
// Gated por super_admin + procesa chunk pa' no excederse del timeout.

const MIGRATION_CHUNK = 50;

// Public trigger para super_admin (corre el chunk loop manualmente). Devuelve
// { normalized, skipped, nextCursor, done }. Super_admin re-invoca con nextCursor
// hasta done=true. Idempotente.
export const triggerNormalizeMigration = mutation({
  args: { cursor: v.optional(v.id("empleado_facial_data")) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const q = ctx.db.query("empleado_facial_data");
    const rows = args.cursor
      ? await q.filter((f) => f.gt(f.field("_id"), args.cursor!)).take(MIGRATION_CHUNK)
      : await q.take(MIGRATION_CHUNK);
    let normalized = 0;
    let skipped = 0;
    for (const row of rows) {
      const dim = row.embedding_dim;
      const newRaw = row.embeddings.map((emb) => {
        let n = 0;
        for (let i = 0; i < dim; i++) n += emb[i] * emb[i];
        n = Math.sqrt(n);
        if (n < 1e-9) return emb;
        if (Math.abs(n - 1) < 1e-6) return emb;
        return emb.map((x) => x / n);
      });
      const N = newRaw.length;
      const prom = new Array<number>(dim).fill(0);
      for (const e of newRaw) for (let i = 0; i < dim; i++) prom[i] += e[i];
      for (let i = 0; i < dim; i++) prom[i] /= N;
      let pn = 0;
      for (let i = 0; i < dim; i++) pn += prom[i] * prom[i];
      pn = Math.sqrt(pn);
      if (pn < 1e-9) { skipped++; continue; }
      for (let i = 0; i < dim; i++) prom[i] /= pn;
      await ctx.db.patch(row._id, {
        embeddings: newRaw,
        embedding_promedio: prom,
      });
      normalized++;
    }
    const nextCursor = rows.length === MIGRATION_CHUNK ? rows[rows.length - 1]._id : null;
    return { normalized, skipped, nextCursor, done: nextCursor === null };
  },
});
