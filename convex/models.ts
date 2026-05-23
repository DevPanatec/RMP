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
        if (args.make_id) return q.search("nombre", args.query).eq("make_id", args.make_id);
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
    await ctx.db.patch(id, {
      visibility: "global",
      organizacion_id: undefined,
      validated: true,
    });
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
