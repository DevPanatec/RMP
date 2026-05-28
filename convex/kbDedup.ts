import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope } from "./lib/auth";

// Semantic dedup: detecta variantes ("Granite GU713" → alias de "Granite")
// Score: Levenshtein normalized + prefix match + contains match
// Thresholds: >= 0.85 same model, 0.65-0.85 variant (alias), < 0.65 nuevo.

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "");
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
}

// Score 0-1. 1 = exact match. 0 = completely different.
export function similarityScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;

  // Contains match
  if (na.includes(nb) || nb.includes(na)) {
    const longer = Math.max(na.length, nb.length);
    const shorter = Math.min(na.length, nb.length);
    return 0.65 + 0.2 * (shorter / longer); // 0.65-0.85
  }

  // Prefix match (first word)
  const aFirst = na.split(" ")[0];
  const bFirst = nb.split(" ")[0];
  if (aFirst === bFirst && aFirst.length >= 3) return 0.55;

  // Levenshtein
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const lev = 1 - dist / maxLen;
  return Math.max(0, lev * 0.7); // cap Levenshtein contribution
}

// Query: encuentra modelos similares por make + name
export const findSimilarModels = query({
  args: {
    make_id: v.id("makes"),
    name: v.string(),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    const all = await ctx.db
      .query("models")
      .withIndex("by_make", q => q.eq("make_id", args.make_id))
      .collect();
    const threshold = args.threshold ?? 0.65;
    const scored = all
      .filter(m =>
        m.visibility === "global" ||
        m.organizacion_id === scope.organizacionId ||
        scope.isSuperAdmin
      )
      .map(m => ({
        model: m,
        score: similarityScore(m.nombre, args.name),
        // Tambien check aliases
        alias_score: Math.max(
          0,
          ...((m.aliases ?? []).map(a => similarityScore(a, args.name)))
        ),
      }))
      .map(s => ({ ...s, max_score: Math.max(s.score, s.alias_score) }))
      .filter(s => s.max_score >= threshold);

    scored.sort((a, b) => b.max_score - a.max_score);
    return scored.slice(0, 10);
  },
});

// Internal: añade alias a un modelo existente sin crear nuevo.
export const addAliasToModel = internalMutation({
  args: { model_id: v.id("models"), alias: v.string() },
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.model_id);
    if (!m) return;
    const existing = m.aliases ?? [];
    if (existing.some(a => normalize(a) === normalize(args.alias))) return; // dup
    if (normalize(m.nombre) === normalize(args.alias)) return; // mismo que nombre
    await ctx.db.patch(args.model_id, {
      aliases: [...existing, args.alias],
    });
    // Audit
    await ctx.db.insert("kb_audit_log", {
      event: "model.alias_added",
      entity_type: "model",
      entity_id: args.model_id as unknown as string,
      after_state: { alias: args.alias },
      source: "crawler",
      timestamp: Date.now(),
    });
  },
});

// Internal: dedup-or-create — decide si crear nuevo model o añadir alias a existente.
// Returns { model_id, was_new, was_variant }
export const upsertWithDedup = internalMutation({
  args: {
    make_id: v.id("makes"),
    name: v.string(),
    equipment_class: v.string(),
    visibility: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("models")
      .withIndex("by_make", q => q.eq("make_id", args.make_id))
      .collect();
    const visible = all.filter(m =>
      m.visibility === "global" ||
      m.organizacion_id === args.organizacion_id
    );

    let bestMatch: any = null;
    let bestScore = 0;
    for (const m of visible) {
      const score = Math.max(
        similarityScore(m.nombre, args.name),
        ...((m.aliases ?? []).map(a => similarityScore(a, args.name)))
      );
      if (score > bestScore) {
        bestScore = score;
        bestMatch = m;
      }
    }

    if (bestMatch && bestScore >= 0.85) {
      // Same model — no alias needed
      return { model_id: bestMatch._id, was_new: false, was_variant: false, score: bestScore };
    }
    if (bestMatch && bestScore >= 0.65) {
      // Variant — add alias
      const existing = bestMatch.aliases ?? [];
      if (!existing.some((a: string) => normalize(a) === normalize(args.name))) {
        await ctx.db.patch(bestMatch._id, { aliases: [...existing, args.name] });
        await ctx.db.insert("kb_audit_log", {
          event: "model.variant_detected",
          entity_type: "model",
          entity_id: bestMatch._id as unknown as string,
          after_state: { variant: args.name, score: bestScore },
          source: "crawler",
          timestamp: Date.now(),
        });
        // Alert info
        await ctx.db.insert("kb_health_alerts", {
          tipo: "variant_detected",
          severity: "info",
          entity_type: "model",
          entity_id: bestMatch._id as unknown as string,
          mensaje: `Variante "${args.name}" detectada para modelo ${bestMatch.nombre} (score ${bestScore.toFixed(2)})`,
          detail: { variant: args.name, score: bestScore },
          detected_at: Date.now(),
        });
      }
      return { model_id: bestMatch._id, was_new: false, was_variant: true, score: bestScore };
    }

    // Nuevo modelo
    const newId = await ctx.db.insert("models", {
      make_id: args.make_id,
      nombre: args.name,
      equipment_class: args.equipment_class,
      validated: false,
      visibility: args.visibility ?? "global",
      organizacion_id: args.organizacion_id,
    });
    return { model_id: newId, was_new: true, was_variant: false, score: 0 };
  },
});
