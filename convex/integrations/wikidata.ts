"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import * as crypto from "crypto";

// Wikidata SPARQL endpoint — gratis, sin auth, sin rate limit duro.
// Docs: https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service
// Cobertura: miles de modelos de vehiculos comerciales y maquinaria.

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

interface SparqlBinding {
  [key: string]: { value: string; type: string };
}

interface SparqlResponse {
  results: { bindings: SparqlBinding[] };
}

function hashContent(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

async function runSparql(query: string): Promise<SparqlBinding[]> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const resp = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "RMP-CMMS/1.0 (https://rmp.example.com; contact@rmp.example.com)",
    },
  });
  if (!resp.ok) throw new Error(`Wikidata HTTP ${resp.status}`);
  const data = await resp.json() as SparqlResponse;
  return data.results.bindings;
}

// Query specs de un modelo via SPARQL.
// Busca por label coincidente + tipo "vehicle" o subclase.
const VEHICLE_SPECS_QUERY = (modelLabel: string, makeLabel?: string) => `
SELECT DISTINCT ?item ?itemLabel ?makeLabel ?productionYear ?engineLabel ?weight ?length WHERE {
  ?item rdfs:label "${modelLabel}"@en.
  ?item wdt:P279*|wdt:P31* wd:Q42889 .  # Q42889 = vehicle
  OPTIONAL { ?item wdt:P176 ?make. }                # P176 manufacturer
  OPTIONAL { ?item wdt:P571 ?productionYear. }      # P571 inception
  OPTIONAL { ?item wdt:P516 ?engine. }              # P516 powered by
  OPTIONAL { ?item wdt:P2067 ?weight. }             # P2067 mass
  OPTIONAL { ?item wdt:P2043 ?length. }             # P2043 length
  ${makeLabel ? `?item wdt:P176 ?makeFilter. ?makeFilter rdfs:label "${makeLabel}"@en.` : ''}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 5
`;

export const fetchModelSpecs = internalAction({
  args: { model_label: v.string(), make_label: v.optional(v.string()) },
  handler: async (ctx, { model_label, make_label }) => {
    try {
      const bindings = await runSparql(VEHICLE_SPECS_QUERY(model_label, make_label));
      if (bindings.length === 0) {
        return { ok: false as const, error: "No matches en Wikidata" };
      }
      const first = bindings[0];
      const parsed = {
        wikidata_uri: first.item?.value ?? null,
        label: first.itemLabel?.value ?? null,
        make: first.makeLabel?.value ?? null,
        production_year: first.productionYear?.value ?? null,
        engine: first.engineLabel?.value ?? null,
        weight_kg: first.weight ? parseFloat(first.weight.value) : null,
        length_m: first.length ? parseFloat(first.length.value) : null,
        raw_bindings: bindings,
      };
      return { ok: true as const, data: parsed };
    } catch (err: any) {
      return { ok: false as const, error: err.message ?? String(err) };
    }
  },
});

// Sync: fetch specs y guarda en kb_sources si encuentra match.
// Returns id del kb_source creado o null si no match.
export const syncModelSpecs = action({
  args: {
    model_id: v.id("models"),
    model_year_id: v.optional(v.id("model_years")),
    make_id: v.optional(v.id("makes")),
    model_label: v.string(),
    make_label: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const result = await ctx.runAction(internal.integrations.wikidata.fetchModelSpecs, {
      model_label: args.model_label,
      make_label: args.make_label,
    });
    if (!result.ok) return { ok: false as const, error: result.error };

    const content = JSON.stringify(result.data);
    const hash = hashContent(content);

    const sourceId = await ctx.runMutation(internal.kbSources.recordInternal, {
      model_year_id: args.model_year_id,
      make_id: args.make_id,
      source_url: result.data.wikidata_uri ?? `https://www.wikidata.org/?label=${encodeURIComponent(args.model_label)}`,
      source_type: "wikidata",
      content_hash: hash,
      parsed_data: result.data,
      confidence: 0.85, // Wikidata es bastante confiable pero requiere validacion
      license: "cc_by_sa",
      attribution: "Wikidata (CC BY-SA 4.0)",
    });
    return { ok: true as const, source_id: sourceId, parsed: result.data };
  },
});
