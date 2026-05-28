// Asistencia — Retention crons (data hygiene).
// Módulo: ASI
//
// Purga periódica de:
// 1. marcacion_intentos > 90 días (forense + auditoría tender — retención legal Panamá).
// 2. facial_sessions expiradas (nonces single-use; basta con 1h post-expira).

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

const RETENCION_INTENTOS_DIAS = 90;
const CHUNK = 200;

export const purgeOldIntentos = internalMutation({
  args: { cutoff_ms: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = args.cutoff_ms ?? Date.now() - RETENCION_INTENTOS_DIAS * 24 * 60 * 60 * 1000;
    const old = await ctx.db
      .query("marcacion_intentos")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoff))
      .take(CHUNK);
    for (const row of old) {
      // Borrar foto asociada (best-effort) + el doc
      if (row.foto_storage_id) {
        try { await ctx.storage.delete(row.foto_storage_id); } catch { /* ignore */ }
      }
      await ctx.db.delete(row._id);
    }
    return { purged: old.length, cutoff };
  },
});

export const purgeExpiredFacialSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1h después de expira
    const old = await ctx.db
      .query("facial_sessions")
      .withIndex("by_expira", (q) => q.lt("expira_en", cutoff))
      .take(CHUNK);
    for (const row of old) await ctx.db.delete(row._id);
    return { purged: old.length, cutoff };
  },
});
