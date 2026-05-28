import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireAdminWrite, requireWriteRole } from "./lib/auth";

// ─── Queries ──────────────────────────────────────────────

// Lista modelos visibles para el scope actual: global + private_org del usuario.
export const list = query({
  args: { make_id: v.optional(v.id("makes")), equipment_class: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];

    let q;
    if (args.make_id) {
      q = ctx.db.query("models").withIndex("by_make", i => i.eq("make_id", args.make_id!));
    } else if (args.equipment_class) {
      q = ctx.db.query("models").withIndex("by_class", i => i.eq("equipment_class", args.equipment_class!));
    } else {
      q = ctx.db.query("models");
    }
    const all = await q.collect();
    // Filtrar por visibility: global + privados de mi org
    return all.filter(m =>
      m.visibility === "global" ||
      (m.visibility === "private_org" && m.organizacion_id === scope.organizacionId) ||
      scope.isSuperAdmin
    );
  },
});

// Search fuzzy + filter por visibility scope.
export const search = query({
  args: {
    query: v.string(),
    make_id: v.optional(v.id("makes")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil || !args.query || args.query.length < 1) return [];

    let qb = ctx.db
      .query("models")
      .withSearchIndex("search_nombre", q => {
        if (args.make_id) return (q.search("nombre", args.query) as any).eq("make_id", args.make_id);
        return q.search("nombre", args.query);
      });
    const results = await qb.take(args.limit ?? 15);

    // Filter por visibility
    return results.filter(m =>
      m.visibility === "global" ||
      (m.visibility === "private_org" && m.organizacion_id === scope.organizacionId) ||
      scope.isSuperAdmin
    );
  },
});

export const get = query({
  args: { id: v.id("models") },
  handler: async (ctx, { id }) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return null;
    const m = await ctx.db.get(id);
    if (!m) return null;
    if (m.visibility === "private_org" && m.organizacion_id !== scope.organizacionId && !scope.isSuperAdmin) {
      return null;
    }
    return m;
  },
});

// ─── Mutations ────────────────────────────────────────────

export const create = mutation({
  args: {
    make_id: v.id("makes"),
    nombre: v.string(),
    equipment_class: v.string(),
    tipo_vehiculo_default: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    visibility: v.optional(v.string()), // default: private_org
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    const visibility = args.visibility ?? "private_org";
    if (visibility === "global" && !scope.isSuperAdmin) {
      throw new Error("Solo super_admin puede crear modelos globales");
    }
    return await ctx.db.insert("models", {
      make_id: args.make_id,
      nombre: args.nombre,
      equipment_class: args.equipment_class,
      tipo_vehiculo_default: args.tipo_vehiculo_default,
      aliases: args.aliases,
      validated: scope.isSuperAdmin && visibility === "global",
      visibility,
      organizacion_id: visibility === "private_org" ? scope.organizacionId ?? undefined : undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("models"),
    nombre: v.optional(v.string()),
    equipment_class: v.optional(v.string()),
    tipo_vehiculo_default: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    const m = await ctx.db.get(args.id);
    if (!m) throw new Error("Modelo no existe");
    if (m.visibility === "global" && !scope.isSuperAdmin) {
      throw new Error("Solo super_admin puede editar modelos globales");
    }
    if (m.visibility === "private_org" && m.organizacion_id !== scope.organizacionId && !scope.isSuperAdmin) {
      throw new Error("Acceso denegado");
    }
    const { id, ...rest } = args;
    const patch: any = {};
    for (const [k, val] of Object.entries(rest)) if (val !== undefined) patch[k] = val;
    await ctx.db.patch(id, patch);
  },
});

// Super_admin promueve un modelo private_org a global.
export const promoteToGlobal = mutation({
  args: { id: v.id("models") },
  handler: async (ctx, { id }) => {
    const scope = await requireAdminWrite(ctx);
    if (!scope.isSuperAdmin) throw new Error("Solo super_admin");

    const before = await ctx.db.get(id);
    if (!before) throw new Error("Model no existe");

    await ctx.db.patch(id, {
      visibility: "global",
      organizacion_id: undefined,
      validated: true,
    });

    // Audit log
    await ctx.db.insert("kb_audit_log", {
      event: "promote_to_global",
      entity_type: "model",
      entity_id: id as unknown as string,
      before_state: {
        visibility: before.visibility,
        organizacion_id: before.organizacion_id,
        validated: before.validated,
      },
      after_state: { visibility: "global", organizacion_id: undefined, validated: true },
      user_id: scope.perfil!.userId,
      source: "user_action",
      timestamp: Date.now(),
      organizacion_id: before.organizacion_id,
    });
  },
});

// Busca modelos similares a un vehiculo dado. Usa fuzzy contains + año más cercano.
// Retorna candidatos ordenados por similarity score (0-1).
export const findSimilar = query({
  args: {
    marca: v.string(),
    modelo: v.string(),
    anio: v.optional(v.number()),
    equipment_class: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];

    // Resolver make
    const slug = args.marca.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const make = await ctx.db
      .query("makes")
      .withIndex("by_slug", q => q.eq("slug", slug))
      .first();
    if (!make) return [];

    const allModels = await ctx.db
      .query("models")
      .withIndex("by_make", q => q.eq("make_id", make._id))
      .collect();

    const target = args.modelo.toLowerCase().trim();
    const candidates: any[] = [];
    for (const m of allModels) {
      // Scope filter
      if (m.visibility === "private_org" && m.organizacion_id !== scope.organizacionId && !scope.isSuperAdmin) {
        continue;
      }
      if (args.equipment_class && m.equipment_class !== args.equipment_class) continue;

      const mName = m.nombre.toLowerCase().trim();
      let score = 0;
      if (mName === target) score = 1.0;
      else if (mName.includes(target) || target.includes(mName)) score = 0.7;
      else {
        // Levenshtein-lite: primer palabra match
        const targetFirst = target.split(" ")[0];
        const mFirst = mName.split(" ")[0];
        if (targetFirst === mFirst) score = 0.5;
      }
      if (score === 0) continue;

      // Buscar años disponibles
      const years = await ctx.db
        .query("model_years")
        .withIndex("by_model", q => q.eq("model_id", m._id))
        .collect();
      let bestYear = null;
      let yearDelta = Infinity;
      if (args.anio && years.length > 0) {
        for (const y of years) {
          const d = Math.abs(y.year - args.anio);
          if (d < yearDelta) {
            yearDelta = d;
            bestYear = y;
          }
        }
      } else if (years.length > 0) {
        bestYear = years[0];
      }

      // Adjustar score por proximidad de año
      if (args.anio && yearDelta !== Infinity) {
        if (yearDelta === 0) score += 0.0;
        else if (yearDelta <= 2) score -= 0.05;
        else if (yearDelta <= 5) score -= 0.15;
        else score -= 0.25;
      }

      candidates.push({
        model: m,
        make_nombre: make.nombre,
        best_year: bestYear,
        year_delta: yearDelta === Infinity ? null : yearDelta,
        similarity_score: Math.max(0, score),
      });
    }
    candidates.sort((a, b) => b.similarity_score - a.similarity_score);
    return candidates.slice(0, args.limit ?? 5);
  },
});

// Lista modelos elegibles para promotion a global (solo super_admin).
// Criterio: validated=true + visibility=private_org + tienen >=1 vehiculo asociado.
export const listPendingPromotion = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil || !scope.isSuperAdmin) return [];
    const candidates = await ctx.db
      .query("models")
      .withIndex("by_visibility", q => q.eq("visibility", "private_org"))
      .collect();

    // Enriquecer con make + count de vehiculos
    const result: any[] = [];
    for (const m of candidates) {
      if (!m.validated) continue;
      const make = await ctx.db.get(m.make_id);
      // Contar vehiculos que usan este modelo (across all orgs)
      const allVeh = await ctx.db.query("vehiculos").collect();
      const vehCount = allVeh.filter(v =>
        v.modelo?.toLowerCase().trim() === m.nombre.toLowerCase().trim() &&
        v.marca?.toLowerCase().trim() === make?.nombre.toLowerCase().trim()
      ).length;
      if (vehCount === 0) continue;
      result.push({
        ...m,
        make_nombre: make?.nombre ?? "?",
        vehicle_count: vehCount,
      });
    }
    result.sort((a, b) => b.vehicle_count - a.vehicle_count);
    return result.slice(0, args.limit ?? 50);
  },
});

// Upsert: si modelo con mismo nombre+make existe, retorna su id; sino crea.
export const upsert = mutation({
  args: {
    make_id: v.id("makes"),
    nombre: v.string(),
    equipment_class: v.string(),
    tipo_vehiculo_default: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scope = await requireWriteRole(ctx);
    // Busca por make+nombre
    const existing = await ctx.db
      .query("models")
      .withIndex("by_make", q => q.eq("make_id", args.make_id))
      .collect();
    const match = existing.find(m =>
      m.nombre.toLowerCase().trim() === args.nombre.toLowerCase().trim() &&
      (m.visibility === "global" ||
        m.organizacion_id === scope.organizacionId ||
        scope.isSuperAdmin)
    );
    if (match) return match._id;

    return await ctx.db.insert("models", {
      make_id: args.make_id,
      nombre: args.nombre,
      equipment_class: args.equipment_class,
      tipo_vehiculo_default: args.tipo_vehiculo_default,
      validated: false,
      visibility: "private_org",
      organizacion_id: scope.organizacionId ?? undefined,
    });
  },
});
