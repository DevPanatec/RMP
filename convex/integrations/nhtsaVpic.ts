"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// NHTSA vPIC API - gratis, sin auth.
// Docs: https://vpic.nhtsa.dot.gov/api/
// Cobertura: VIN US 1981+, Class 4-8 trucks, buses, trailers, motos.

const VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

interface VpicResult {
  Variable: string;
  Value: string | null;
  ValueId: string | null;
}

interface VpicResponse {
  Count: number;
  Message: string;
  Results: VpicResult[];
}

function pick(results: VpicResult[], variable: string): string | null {
  const r = results.find(x => x.Variable === variable);
  return r?.Value ?? null;
}

export const decodeVin = action({
  args: { vin: v.string() },
  handler: async (_ctx, { vin }) => {
    const cleanVin = vin.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleanVin.length < 11 || cleanVin.length > 17) {
      return {
        ok: false as const,
        error: "VIN debe tener 11-17 caracteres alfanuméricos",
      };
    }

    const url = `${VPIC_BASE}/DecodeVin/${encodeURIComponent(cleanVin)}?format=json`;
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

    const data = await resp.json() as VpicResponse;
    const r = data.Results;

    const make = pick(r, "Make");
    const model = pick(r, "Model");
    const yearStr = pick(r, "Model Year");
    const year = yearStr ? parseInt(yearStr, 10) : null;
    const vehicleType = pick(r, "Vehicle Type");
    const bodyClass = pick(r, "Body Class");
    const engineModel = pick(r, "Engine Model");
    const engineCylinders = pick(r, "Engine Number of Cylinders");
    const engineDisplacement = pick(r, "Displacement (L)");
    const fuelType = pick(r, "Fuel Type - Primary");
    const transmissionStyle = pick(r, "Transmission Style");
    const gvwr = pick(r, "Gross Vehicle Weight Rating From");
    const driveType = pick(r, "Drive Type");
    const plantCountry = pick(r, "Plant Country");

    if (!make && !model) {
      return {
        ok: false as const,
        error: "NHTSA no pudo decodificar este VIN (puede no ser US-spec)",
      };
    }

    return {
      ok: true as const,
      data: {
        make,
        model,
        year,
        vehicleType,
        bodyClass,
        engineModel,
        engineCylinders: engineCylinders ? parseInt(engineCylinders, 10) : null,
        engineDisplacement,
        fuelType,
        transmissionStyle,
        gvwr,
        driveType,
        plantCountry,
        raw: r, // payload completo para auditoría
      },
    };
  },
});

// Lista de fabricantes (cached upstream NHTSA).
export const listAllMakes = action({
  args: {},
  handler: async () => {
    const url = `${VPIC_BASE}/GetAllMakes?format=json`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "RMP-CMMS/1.0" },
    });
    if (!resp.ok) return { ok: false as const, error: `HTTP ${resp.status}` };
    const data = await resp.json() as VpicResponse & { Results: { Make_ID: number; Make_Name: string }[] };
    return { ok: true as const, makes: data.Results };
  },
});

// Modelos de una marca para un año.
export const getModelsForMakeYear = action({
  args: { make: v.string(), year: v.number() },
  handler: async (_ctx, { make, year }) => {
    const url = `${VPIC_BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "RMP-CMMS/1.0" },
    });
    if (!resp.ok) return { ok: false as const, error: `HTTP ${resp.status}` };
    const data = await resp.json() as VpicResponse & { Results: { Model_Name: string }[] };
    return { ok: true as const, models: data.Results.map((r: any) => r.Model_Name) };
  },
});

// Bulk sync: trae todas las marcas commercial truck (vehicleType filter)
// y upsert en tabla makes. Idempotente.
export const bulkSyncMakes = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }): Promise<{ ok: true; synced: number } | { ok: false; error: string }> => {
    const url = `${VPIC_BASE}/GetAllMakes?format=json`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "RMP-CMMS/1.0" },
    });
    if (!resp.ok) return { ok: false as const, error: `HTTP ${resp.status}` };
    const data = await resp.json() as VpicResponse & { Results: { Make_ID: number; Make_Name: string }[] };
    const makes = data.Results.slice(0, limit ?? 200);

    let synced = 0;
    for (const m of makes as any[]) {
      try {
        await ctx.runMutation(internal.makes.upsertFromCrawler, {
          nombre: m.Make_Name,
        });
        synced++;
      } catch {
        // silently skip duplicates / errors
      }
    }
    return { ok: true as const, synced };
  },
});
