import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireWriteRole } from "./lib/auth";
import { internal } from "./_generated/api";

// ─── Storage Upload ───────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireWriteRole(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// ─── Mutations ────────────────────────────────────────────

export const saveDocument = mutation({
  args: {
    model_year_id: v.optional(v.id("model_years")),
    vehiculo_id: v.optional(v.id("vehiculos")),
    tipo: v.string(),                 // "service_manual" | "parts_catalog" | "operator_manual" | "brochure"
    storage_id: v.id("_storage"),
    file_name: v.string(),
    file_size: v.number(),
    page_count: v.optional(v.number()),
    license_declaration: v.boolean(),
    extracted_text: v.optional(v.string()),  // si cliente ya extrajo via pdf.js/Tesseract
    extraction_method: v.optional(v.string()), // "pdfjs" | "tesseract" | "none"
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    if (!scope.organizacionId && !scope.isSuperAdmin) {
      throw new Error("Sin organización asignada");
    }
    if (!args.license_declaration) {
      throw new Error("Debes confirmar que tienes derecho a usar este documento");
    }

    const docId = await ctx.db.insert("oem_documents", {
      model_year_id: args.model_year_id,
      vehiculo_id: args.vehiculo_id,
      tipo: args.tipo,
      storage_id: args.storage_id,
      file_name: args.file_name,
      file_size: args.file_size,
      page_count: args.page_count,
      uploaded_by: scope.perfil!._id,
      source: "manual_upload",
      license_declaration: args.license_declaration,
      organizacion_id: scope.organizacionId!,
    });

    // Crear ingestion_run en estado "queued" si vino texto extraído
    if (args.extracted_text && args.extracted_text.length > 100) {
      const runId = await ctx.db.insert("ingestion_runs", {
        document_id: docId,
        model_year_id: args.model_year_id,
        estado: "ocr_done",
        ocr_provider: args.extraction_method ?? "pdfjs",
        audit_log: [{
          timestamp: Date.now(),
          event: "ocr_complete",
          detail: {
            method: args.extraction_method,
            chars: args.extracted_text.length,
          },
        }],
        organizacion_id: scope.organizacionId!,
      });
      // Schedule Claude semantic extraction (async)
      try {
        await ctx.scheduler.runAfter(0, internal.ingestion.processWithClaude, {
          ingestion_run_id: runId,
          extracted_text: args.extracted_text,
        });
      } catch (err) {
        console.warn("ingestion schedule failed", err);
      }
    }

    return docId;
  },
});

// ─── Queries ──────────────────────────────────────────────

export const listForVehicle = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const veh = await ctx.db.get(vehiculo_id);
    if (!veh) return [];
    if (!scope.isSuperAdmin && veh.organizacion_id !== scope.organizacionId) return [];

    const direct = await ctx.db
      .query("oem_documents")
      .withIndex("by_vehiculo", q => q.eq("vehiculo_id", vehiculo_id))
      .collect();
    return direct.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const listForOrg = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    if (!scope.organizacionId && !scope.isSuperAdmin) return [];
    const all = scope.isSuperAdmin
      ? await ctx.db.query("oem_documents").collect()
      : await ctx.db.query("oem_documents")
          .withIndex("by_organizacion", q => q.eq("organizacion_id", scope.organizacionId!))
          .collect();
    all.sort((a, b) => b._creationTime - a._creationTime);
    return all.slice(0, args.limit ?? 50);
  },
});
