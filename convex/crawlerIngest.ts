import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation: recibe items del worker externo via HTTP endpoint /crawler/ingest.
// Resuelve refs (make, model, model_year) por nombre, crea si no existen, y
// graba kb_sources. Idempotente por (source_url, content_hash).

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export const ingestItem = internalMutation({
  args: {
    source_url: v.string(),
    source_type: v.string(),
    content_hash: v.string(),
    parsed_data: v.optional(v.any()),
    confidence: v.optional(v.number()),
    license: v.optional(v.string()),
    attribution: v.optional(v.string()),
    last_modified: v.optional(v.string()),
    etag: v.optional(v.string()),

    // Refs por nombre (resuelve/crea)
    make_name: v.optional(v.string()),
    model_name: v.optional(v.string()),
    model_year: v.optional(v.number()),
    equipment_class: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let make_id: any = undefined;
    let model_id: any = undefined;
    let model_year_id: any = undefined;

    // Resolver/crear make
    if (args.make_name) {
      const slug = slugify(args.make_name);
      const existing = await ctx.db
        .query("makes")
        .withIndex("by_slug", q => q.eq("slug", slug))
        .first();
      make_id = existing?._id ?? (await ctx.db.insert("makes", {
        nombre: args.make_name,
        slug,
        validated: false,
      }));
    }

    // Resolver/crear model (siempre como global si viene del crawler con make_name)
    if (make_id && args.model_name && args.equipment_class) {
      const existingModels = await ctx.db
        .query("models")
        .withIndex("by_make", q => q.eq("make_id", make_id))
        .collect();
      const match = existingModels.find(m =>
        m.nombre.toLowerCase().trim() === args.model_name!.toLowerCase().trim()
      );
      model_id = match?._id ?? (await ctx.db.insert("models", {
        make_id,
        nombre: args.model_name,
        equipment_class: args.equipment_class,
        validated: false,
        visibility: "global", // crawler-sourced = global tentativo
      }));
    }

    // Resolver/crear model_year
    if (model_id && args.model_year) {
      const existingYear = await ctx.db
        .query("model_years")
        .withIndex("by_model_year", q => q.eq("model_id", model_id).eq("year", args.model_year!))
        .first();
      if (existingYear) {
        model_year_id = existingYear._id;
        // Merge parsed_data en specs si aplica
        if (args.parsed_data && typeof args.parsed_data === "object") {
          await ctx.db.patch(model_year_id, {
            specs: { ...(existingYear.specs ?? {}), ...args.parsed_data },
          });
        }
      } else {
        model_year_id = await ctx.db.insert("model_years", {
          model_id,
          year: args.model_year,
          specs: args.parsed_data ?? undefined,
        });
      }
    }

    // Dedup kb_sources por (source_url + content_hash)
    const existingSource = await ctx.db
      .query("kb_sources")
      .withIndex("by_source_type", q => q.eq("source_type", args.source_type))
      .collect();
    const dup = existingSource.find(s =>
      s.source_url === args.source_url && s.content_hash === args.content_hash
    );
    if (dup) {
      await ctx.db.patch(dup._id, { fetched_at: Date.now() });
      return dup._id;
    }

    return await ctx.db.insert("kb_sources", {
      model_year_id,
      make_id,
      source_url: args.source_url,
      source_type: args.source_type,
      content_hash: args.content_hash,
      parsed_data: args.parsed_data,
      confidence: args.confidence ?? 0.7,
      license: args.license ?? "unknown",
      attribution: args.attribution,
      last_modified: args.last_modified,
      etag: args.etag,
      fetched_at: Date.now(),
    });
  },
});

// Audit log inmutable de fetches del crawler (defensa legal contra DMCA).
export const recordCrawlerAudit = internalMutation({
  args: {
    source_url: v.string(),
    status_code: v.number(),
    user_agent: v.string(),
    robots_txt_checked: v.boolean(),
    robots_txt_allowed: v.boolean(),
    response_size_bytes: v.number(),
    result_kb_source_id: v.optional(v.id("kb_sources")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("crawler_audit_log", {
      ...args,
      fetched_at: Date.now(),
    });
  },
});

// Upsert model global (visibility=global) sin auth — usado por crawler OEM.
export const upsertGlobalModel = internalMutation({
  args: {
    make_id: v.id("makes"),
    nombre: v.string(),
    equipment_class: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("models")
      .withIndex("by_make", q => q.eq("make_id", args.make_id))
      .collect();
    const match = existing.find(m =>
      m.nombre.toLowerCase().trim() === args.nombre.toLowerCase().trim()
    );
    if (match) {
      if (match.visibility !== "global") {
        await ctx.db.patch(match._id, { visibility: "global", organizacion_id: undefined });
      }
      return match._id;
    }
    return await ctx.db.insert("models", {
      make_id: args.make_id,
      nombre: args.nombre,
      equipment_class: args.equipment_class,
      validated: false,
      visibility: "global",
    });
  },
});

// Upsert model_year sin auth.
export const upsertGlobalModelYear = internalMutation({
  args: {
    model_id: v.id("models"),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("model_years")
      .withIndex("by_model_year", q => q.eq("model_id", args.model_id).eq("year", args.year))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("model_years", {
      model_id: args.model_id,
      year: args.year,
    });
  },
});
