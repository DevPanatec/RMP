// Backfill: poblar campos de plan en orgs legacy + storage_bytes_used inicial.
// Gated por env var ALLOW_BACKFILL=1 + requireSuperAdmin.
// Soporta --dry-run via arg `dryRun: true` → reporta cambios sin escribir.

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireSuperAdmin } from "../lib/auth";

function assertBackfillAllowed() {
  if (process.env.ALLOW_BACKFILL !== "1") {
    throw new Error(
      "Backfill disabled. Set ALLOW_BACKFILL=1 in Convex env: npx convex env set ALLOW_BACKFILL 1"
    );
  }
}

// ---------- Step 1: poblar campos de plan en orgs ----------
export const backfillOrgPlanFields = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    assertBackfillAllowed();
    const dryRun = args.dryRun === true;

    const orgs = await ctx.db.query("organizaciones").collect();
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const changes: Array<{ orgId: string; nombre: string; setFields: string[] }> = [];

    for (const org of orgs) {
      const setFields: string[] = [];
      const patch: Record<string, unknown> = {};

      if (!org.escala) {
        patch.escala = "S";
        setFields.push("escala=S");
      }
      if (!org.modulos_activos || org.modulos_activos.length === 0) {
        patch.modulos_activos = ["REC"];
        setFields.push("modulos_activos=[REC]");
      }
      if (!org.setup_status) {
        patch.setup_status = "pagado";
        setFields.push("setup_status=pagado");
      }
      if (org.discount_pct === undefined || org.discount_pct === null) {
        patch.discount_pct = 0;
        setFields.push("discount_pct=0");
      }
      if (!org.fecha_inicio_plan) {
        // Convertir fecha_creacion (ISO string) a ms epoch
        const created = org.fecha_creacion ? new Date(org.fecha_creacion).getTime() : now;
        patch.fecha_inicio_plan = isNaN(created) ? now : created;
        setFields.push("fecha_inicio_plan=desde_fecha_creacion");
      }
      if (!org.fecha_renovacion_plan) {
        patch.fecha_renovacion_plan = (patch.fecha_inicio_plan as number ?? now) + THIRTY_DAYS_MS;
        setFields.push("fecha_renovacion_plan=+30d");
      }

      if (setFields.length === 0) continue;

      changes.push({ orgId: org._id, nombre: org.nombre, setFields });

      if (!dryRun) {
        await ctx.db.patch(org._id, patch);
        await ctx.db.insert("org_audit_log", {
          organizacion_id: org._id,
          changed_by_user_id: "migration:backfill",
          changed_by_email: "migration@system",
          action: "backfill_plan_fields",
          field: setFields.join(","),
          before_value: null,
          after_value: patch,
          notas: "Backfill seed_plan_fields.ts",
          timestamp: now,
        });
      }
    }

    return {
      mode: dryRun ? "dry-run" : "applied",
      total_orgs: orgs.length,
      orgs_changed: changes.length,
      changes,
    };
  },
});

// ---------- Step 1b: limpiar códigos de módulos eliminados del catálogo ----------
// Tras eliminar API/SSO/WL del MODULO_CATALOG, orgs en prod pueden tener
// modulos_activos: ['REC', 'API', ...]. Esto deja códigos huérfanos: sumModulosUsd
// los ignora silenciosamente (no facturás), pero quedan visibles en UI + audit log.
// Este step los strippea y registra en audit_log.
const DELETED_MODULE_CODES = ["API", "SSO", "WL"];
export const stripDeletedModuleCodes = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    assertBackfillAllowed();
    const dryRun = args.dryRun === true;
    const now = Date.now();

    const orgs = await ctx.db.query("organizaciones").collect();
    const changes: Array<{ orgId: string; nombre: string; before: string[]; after: string[]; stripped: string[] }> = [];

    for (const org of orgs) {
      const current = org.modulos_activos ?? [];
      const stripped = current.filter((c) => DELETED_MODULE_CODES.includes(c));
      if (stripped.length === 0) continue;

      const next = current.filter((c) => !DELETED_MODULE_CODES.includes(c));
      changes.push({ orgId: org._id, nombre: org.nombre, before: current, after: next, stripped });

      if (!dryRun) {
        await ctx.db.patch(org._id, { modulos_activos: next });
        await ctx.db.insert("org_audit_log", {
          organizacion_id: org._id,
          changed_by_user_id: "migration:strip_deleted",
          changed_by_email: "migration@system",
          action: "strip_deleted_modules",
          field: "modulos_activos",
          before_value: current,
          after_value: next,
          notas: `Códigos eliminados del catálogo (API/SSO/WL): ${stripped.join(", ")}`,
          timestamp: now,
        });
      }
    }

    return {
      mode: dryRun ? "dry-run" : "applied",
      total_orgs: orgs.length,
      orgs_changed: changes.length,
      changes,
    };
  },
});

// ---------- Step 2: backfill file_size en photos legacy + storage_bytes_used per org ----------
// IMPORTANTE: usa ctx.storage.getMetadata per file → costo proporcional a #photos.
// Paginar para no agotar timeout (limit por batch).
export const backfillStorageCounters = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number()), // default 200
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    assertBackfillAllowed();
    const dryRun = args.dryRun === true;
    // Default 1000 — Convex mutation limit es 8s; en pruebas 1000 fotos terminan ~3s.
    // Si tu org excede, pasá batchSize: 2000 explícitamente.
    const batchSize = args.batchSize ?? 1000;

    // Acumular por org_id (lo derivamos del assignment/task de cada foto)
    const orgTotals = new Map<string, number>();
    let photosScanned = 0;
    let photosBackfilled = 0;

    // ---- CLEANING PHOTOS ----
    const cleaningPhotos = await ctx.db.query("cleaning_photos").take(batchSize);
    for (const photo of cleaningPhotos) {
      photosScanned++;
      let size = photo.file_size;
      if (!size || size <= 0) {
        try {
          const meta = await ctx.storage.getMetadata(photo.storage_id);
          size = meta?.size ?? 0;
          if (size > 0 && !dryRun) {
            await ctx.db.patch(photo._id, { file_size: size });
            photosBackfilled++;
          }
        } catch {
          // Storage file no encontrado — skip
          continue;
        }
      }
      // Resolver org via assignment
      const assignment = await ctx.db.get(photo.assignment_id);
      const orgId = assignment?.organizacion_id;
      if (orgId && size) {
        orgTotals.set(orgId as string, (orgTotals.get(orgId as string) ?? 0) + size);
      }
    }

    // ---- FUMIGATION PHOTOS ----
    const fumiPhotos = await ctx.db.query("fumigation_photos").take(batchSize);
    for (const photo of fumiPhotos) {
      photosScanned++;
      let size = photo.file_size;
      if (!size || size <= 0) {
        try {
          const meta = await ctx.storage.getMetadata(photo.storage_id);
          size = meta?.size ?? 0;
          if (size > 0 && !dryRun) {
            await ctx.db.patch(photo._id, { file_size: size });
            photosBackfilled++;
          }
        } catch {
          continue;
        }
      }
      const assignment = await ctx.db.get(photo.assignment_id);
      const orgId = assignment?.organizacion_id;
      if (orgId && size) {
        orgTotals.set(orgId as string, (orgTotals.get(orgId as string) ?? 0) + size);
      }
    }

    // ---- MAINTENANCE PHOTOS ----
    const mtoPhotos = await ctx.db.query("maintenance_photos").take(batchSize);
    for (const photo of mtoPhotos) {
      photosScanned++;
      let size = photo.file_size;
      if (!size || size <= 0) {
        try {
          const meta = await ctx.storage.getMetadata(photo.storage_id);
          size = meta?.size ?? 0;
          if (size > 0 && !dryRun) {
            await ctx.db.patch(photo._id, { file_size: size });
            photosBackfilled++;
          }
        } catch {
          continue;
        }
      }
      const task = await ctx.db.get(photo.task_id);
      const orgId = task?.organizacion_id;
      if (orgId && size) {
        orgTotals.set(orgId as string, (orgTotals.get(orgId as string) ?? 0) + size);
      }
    }

    // ---- Aplicar totals a las orgs ----
    const orgUpdates: Array<{ orgId: string; total_bytes: number }> = [];
    for (const [orgId, totalBytes] of orgTotals.entries()) {
      orgUpdates.push({ orgId, total_bytes: totalBytes });
      if (!dryRun) {
        await ctx.db.patch(orgId as any, {
          storage_bytes_used: totalBytes,
          storage_last_recompute: Date.now(),
        });
      }
    }

    return {
      mode: dryRun ? "dry-run" : "applied",
      photos_scanned: photosScanned,
      photos_backfilled_file_size: photosBackfilled,
      orgs_updated: orgUpdates.length,
      org_updates: orgUpdates,
      note: photosScanned >= batchSize * 3
        ? `Posible más fotos sin escanear — re-ejecutar con batchSize=${batchSize * 2}`
        : "Backfill completo de fotos.",
    };
  },
});
