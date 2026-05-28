"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import * as crypto from "crypto";

// Vincario API — VIN decode global 110+ países.
// Pricing 2026: €0.22-0.49 por lookup. Free tier: 3 reports/mes.
// Cubre vehículos europeos (Mercedes, MAN, Iveco, Renault Trucks, Scania) que NHTSA no.
// Docs: https://vindecoder.eu/api-docs
// Env vars requeridas: VINCARIO_API_KEY, VINCARIO_API_SECRET.

const BASE = "https://api.vindecoder.eu/3.2";

interface VincarioLookup {
  decode: Array<{ label: string; value: string }>;
  balance?: { Lookups: { remaining: number } };
}

function controlSum(vin: string, apiId: string, secretKey: string, action_: string): string {
  // Vincario requiere control sum: sha1(vin + '|' + action + '|' + api_id + '|' + secret).substring(0,10)
  return crypto.createHash("sha1")
    .update(`${vin}|${action_}|${apiId}|${secretKey}`)
    .digest("hex")
    .substring(0, 10);
}

function pickValue(decode: VincarioLookup["decode"], label: string): string | null {
  const item = decode.find(d => d.label === label);
  return item?.value ?? null;
}

export const decodeVin = action({
  args: { vin: v.string() },
  handler: async (_ctx, { vin }): Promise<any> => {
    const apiId = process.env.VINCARIO_API_KEY;
    const secret = process.env.VINCARIO_API_SECRET;
    if (!apiId || !secret) {
      return { ok: false as const, error: "VINCARIO_API_KEY/VINCARIO_API_SECRET no configurados" };
    }

    const cleanVin = vin.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleanVin.length !== 17) {
      return { ok: false as const, error: "VIN debe tener 17 caracteres exactos" };
    }

    const sum = controlSum(cleanVin, apiId, secret, "decode");
    const url = `${BASE}/${apiId}/${sum}/decode/${cleanVin}.json`;

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": "RMP-CMMS/1.0" },
      });
    } catch (err: any) {
      return { ok: false as const, error: `Red: ${err.message ?? err}` };
    }

    if (!resp.ok) {
      return { ok: false as const, error: `HTTP ${resp.status}` };
    }

    const data = await resp.json() as VincarioLookup;
    if (!data.decode || data.decode.length === 0) {
      return { ok: false as const, error: "Vincario no devolvió decode" };
    }

    return {
      ok: true as const,
      data: {
        make: pickValue(data.decode, "Make"),
        model: pickValue(data.decode, "Model"),
        year: parseInt(pickValue(data.decode, "Model Year") ?? "0", 10) || null,
        vehicleType: pickValue(data.decode, "Vehicle Type"),
        bodyClass: pickValue(data.decode, "Body"),
        engineModel: pickValue(data.decode, "Engine Model"),
        engineCylinders: parseInt(pickValue(data.decode, "Number of Cylinders") ?? "0", 10) || null,
        engineDisplacement: pickValue(data.decode, "Displacement (ccm)"),
        fuelType: pickValue(data.decode, "Fuel Type - Primary"),
        transmissionStyle: pickValue(data.decode, "Transmission"),
        gvwr: pickValue(data.decode, "Gross Vehicle Weight Rating (GVWR)"),
        plantCountry: pickValue(data.decode, "Plant Country"),
        balance_remaining: data.balance?.Lookups?.remaining ?? null,
        raw: data.decode,
      },
    };
  },
});

// Sync con kb_source registro
export const syncVin = internalAction({
  args: {
    vin: v.string(),
    model_year_id: v.optional(v.id("model_years")),
    make_id: v.optional(v.id("makes")),
  },
  handler: async (ctx, args): Promise<any> => {
    const result: any = await ctx.runAction((internal as any).integrations.vincario.decodeVin, { vin: args.vin });
    if (!result.ok) return result;

    const content = JSON.stringify(result.data);
    const hash = crypto.createHash("sha256").update(content).digest("hex");

    const sourceId = await ctx.runMutation(internal.kbSources.recordInternal, {
      model_year_id: args.model_year_id,
      make_id: args.make_id,
      source_url: `${BASE}/decode/${args.vin}`,
      source_type: "vincario",
      content_hash: hash,
      parsed_data: result.data,
      confidence: 0.9, // Vincario es comercial, alta confianza
      license: "commercial",
      attribution: "Vincario (vindecoder.eu)",
    });
    return { ok: true as const, source_id: sourceId, data: result.data };
  },
});
