"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import * as crypto from "crypto";

// DOE Alternative Fuels Data Center — Medium & Heavy Duty Vehicles search.
// Open dataset publico, sin auth, sin rate limit duro.
// Docs: https://developer.nrel.gov/docs/transportation/vehicles-v1/
// Cobertura: vocational vehicles (street sweeper, refuse, cab/chassis, pickup, step van).
//
// Para uso productivo, registrar API key gratis en https://developer.nrel.gov/signup/.
// Sin key (DEMO_KEY) tiene rate limit muy bajo. Set env DOE_AFDC_API_KEY.

const BASE = "https://developer.nrel.gov/api/transportation-vehicles/v1";

function hashContent(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

interface AfdcVehicle {
  id: number;
  make: string;
  model: string;
  model_year: number;
  fuel_id: number;
  vehicle_class: string;
  category_id: number;
  drivetrain_type?: string;
  base_msrp?: number;
}

interface AfdcResponse {
  result: AfdcVehicle[];
}

export const searchByMakeModel = internalAction({
  args: { make: v.string(), model: v.optional(v.string()) },
  handler: async (_ctx, { make, model }): Promise<{ ok: boolean; results?: AfdcVehicle[]; error?: string }> => {
    const apiKey = process.env.DOE_AFDC_API_KEY ?? "DEMO_KEY";
    const params = new URLSearchParams({
      api_key: apiKey,
      manufacturer: make,
    });
    if (model) params.set("model", model);
    const url = `${BASE}/vehicles.json?${params.toString()}`;
    try {
      const resp = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "RMP-CMMS/1.0",
        },
      });
      if (!resp.ok) return { ok: false as const, error: `HTTP ${resp.status}` };
      const data = await resp.json() as AfdcResponse;
      return { ok: true as const, results: data.result ?? [] };
    } catch (err: any) {
      return { ok: false as const, error: err.message ?? String(err) };
    }
  },
});

// Sync masivo: para una make en KB, busca todos sus modelos en DOE AFDC.
// Crea kb_sources entries + opcional upsert model + model_year + override.
export const syncMakeFromAfdc = internalAction({
  args: { make_id: v.id("makes") },
  handler: async (ctx, { make_id }): Promise<{ ok: boolean; created?: number; error?: string }> => {
    const make: any = await ctx.runQuery(internal.makes.getInternal, { id: make_id });
    if (!make) return { ok: false as const, error: "make no existe" };

    const result: any = await ctx.runAction(internal.integrations.doeAfdc.searchByMakeModel, {
      make: make.nombre,
    });
    if (!result.ok) return { ok: false as const, error: result.error };

    const items: AfdcVehicle[] = result.results ?? [];
    let created = 0;
    for (const item of items) {
      const url = `${BASE}/vehicles/${item.id}.json`;
      const hash = hashContent(JSON.stringify(item));
      await ctx.runMutation(internal.kbSources.recordInternal, {
        make_id,
        source_url: url,
        source_type: "doe_afdc",
        content_hash: hash,
        parsed_data: item,
        confidence: 0.8,
        license: "public_domain",
        attribution: "DOE Alternative Fuels Data Center (NREL)",
      });
      created++;
    }
    return { ok: true as const, created };
  },
});
