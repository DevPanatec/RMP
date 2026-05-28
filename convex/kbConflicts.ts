import { internalMutation } from "./_generated/server";

// Conflict detection cross-source.
// Para cada model_year con >= 2 kb_sources, compara campos críticos del parsed_data.
// Si dos sources discrepan en mismo campo → crea kb_health_alert tipo="conflicting_specs".
// Cron daily.

const CRITICAL_FIELDS = [
  "axle_config",
  "cabin_style",
  "engine",
  "gvwr_kg",
  "wheelbase_mm",
  "fuel_type",
  "transmission",
];

function normalizeValue(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).toLowerCase().trim();
}

export const detectConflicts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const modelYears = await ctx.db.query("model_years").collect();
    let conflictsFound = 0;
    let modelYearsChecked = 0;

    for (const my of modelYears) {
      const sources = await ctx.db
        .query("kb_sources")
        .withIndex("by_model_year", q => q.eq("model_year_id", my._id))
        .collect();
      if (sources.length < 2) continue;
      modelYearsChecked++;

      for (const field of CRITICAL_FIELDS) {
        const values = new Map<string, string[]>(); // normalized_value → list of source_types
        for (const s of sources) {
          const parsed = s.parsed_data;
          if (!parsed || typeof parsed !== "object") continue;
          // Buscar field en niveles distintos: top-level o nested
          const raw = parsed[field] ??
            parsed.specs?.[field] ??
            parsed._wikidata_hints?.[field];
          if (raw === undefined || raw === null || raw === "") continue;
          const norm = normalizeValue(raw);
          if (!values.has(norm)) values.set(norm, []);
          values.get(norm)!.push(s.source_type);
        }
        if (values.size < 2) continue; // todos coinciden

        // Conflict detected — dedup alert si existe
        const existingAlerts = await ctx.db
          .query("kb_health_alerts")
          .withIndex("by_tipo", q => q.eq("tipo", "conflicting_specs"))
          .collect();
        const dupAlert = existingAlerts.find(a =>
          !a.resolved_at &&
          a.entity_id === (my._id as unknown as string) &&
          a.detail?.field === field
        );
        if (dupAlert) continue;

        const valuesByProvider: Record<string, string> = {};
        for (const [norm, providers] of values.entries()) {
          valuesByProvider[providers.join("+")] = norm;
        }

        await ctx.db.insert("kb_health_alerts", {
          tipo: "conflicting_specs",
          severity: "warn",
          entity_type: "model_year",
          entity_id: my._id as unknown as string,
          mensaje: `Conflicto en campo "${field}" entre sources: ${JSON.stringify(valuesByProvider)}`,
          detail: { field, values: valuesByProvider, model_year_id: my._id },
          detected_at: Date.now(),
        });
        conflictsFound++;
      }
    }

    return { conflicts_found: conflictsFound, model_years_checked: modelYearsChecked };
  },
});
