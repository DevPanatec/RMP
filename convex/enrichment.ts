"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Auto-enriquece un vehiculo recien creado usando sources gratis:
//   1. Wikidata SPARQL (si marca + modelo coinciden)
//   2. NHTSA vPIC (si VIN disponible — futuro)
//   3. Similar models existentes en KB (copia params con confidence ajustado)
//   4. Best-effort inference (siempre disponible)
//
// Crea template_override Tier-0 con source="auto_inference".
// Crea Tier-1 si Wikidata responde.
// Audit log de cada operacion.
export const enrichVehicle = internalAction({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }): Promise<{ ok: boolean; versions_created: number; errors?: string[] }> => {
    const errors: string[] = [];
    let versionsCreated = 0;

    // 1. Inference best-effort
    try {
      const inferred: any = await ctx.runQuery((internal as any).diagramInference.inferBestEffortParams, { vehiculo_id });
      if (inferred && inferred.equipment_class) {
        // Solo crear si hay model_year resolvable
        const myId = await ctx.runQuery(internal.enrichmentQueries.resolveModelYearId, { vehiculo_id });
        if (myId) {
          await ctx.runMutation(internal.enrichmentMutations.upsertOverride, {
            model_year_id: myId,
            equipment_class: inferred.equipment_class,
            template_name: inferred.equipment_class,
            param_overrides: inferred.params,
            confidence: inferred.confidence,
            source: "auto_inference",
            version_label: `Auto — ${inferred.source_chain.join(" + ")}`,
          });
          versionsCreated++;
        }
      }
    } catch (err: any) {
      errors.push(`inference: ${err.message ?? err}`);
    }

    // 2. Wikidata
    try {
      const vehInfo: any = await ctx.runQuery(internal.enrichmentQueries.getVehicleBasics, { vehiculo_id });
      if (vehInfo?.marca && vehInfo?.modelo && vehInfo?.model_year_id && vehInfo?.equipment_class) {
        const wiki: any = await ctx.runAction((internal as any).integrations.wikidata.syncModelSpecs, {
          model_id: vehInfo.model_id,
          model_year_id: vehInfo.model_year_id,
          make_id: vehInfo.make_id,
          model_label: vehInfo.modelo,
          make_label: vehInfo.marca,
        });
        if (wiki?.ok && wiki.parsed) {
          // Wikidata specs en params hint — confianza 0.65
          await ctx.runMutation(internal.enrichmentMutations.upsertOverride, {
            model_year_id: vehInfo.model_year_id,
            equipment_class: vehInfo.equipment_class,
            template_name: vehInfo.equipment_class,
            param_overrides: { _wikidata_hints: wiki.parsed },
            confidence: 0.65,
            source: "wikidata",
            version_label: "Wikidata specs",
          });
          versionsCreated++;
        }
      }
    } catch (err: any) {
      errors.push(`wikidata: ${err.message ?? err}`);
    }

    return { ok: errors.length === 0, versions_created: versionsCreated, errors: errors.length ? errors : undefined };
  },
});
