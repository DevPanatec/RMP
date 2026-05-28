"use node";

import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";

// Photo-aware refinement con Claude Opus 4.7 vision.
// Lee fotos del vehiculo (multi-ángulo) + template TS actual + KB specs
// → devuelve JSON con params ajustados al vehículo real.
//
// Tier-3 override (confidence 0.90+). One-time cost ~$0.30, cached forever.
//
// Env var: ANTHROPIC_API_KEY (compartida con ingestion.ts).

const MODEL = "claude-opus-4-7";
const MAX_PHOTOS = 6;

const SYSTEM_PROMPT = `Eres un experto en vehículos comerciales pesados. Recibirás:
- Fotos de un vehículo en distintos ángulos
- Equipment_class (compactador, barredora, fumigadora, cisterna, pickup, bus, camion_carga)
- Params actuales del template SVG

Tu trabajo: analizar las fotos y devolver JSON con params ajustados al vehículo REAL en las fotos.
Estructura del JSON (SOLO el JSON, sin comentarios fuera):

{
  "params": {
    "axle_config": "4x2|6x2|6x4|8x4|8x6 (basado en # ejes visible)",
    "cabin_style": "conventional|cab_over",
    "wheelbase_ratio": 0.4-0.7,
    "compactor_size_ratio": 0.10-0.20 (solo si compactador),
    "tank_size_ratio": 0.30-0.60 (solo si fumigadora/cisterna/barredora),
    "side_brushes": true|false (solo si barredora),
    "length_ratio": 0.85-1.0 (solo si bus),
    "door_count": 1-3 (solo si bus),
    "has_articulated": true|false (solo si bus),
    "cargo_body_type": "flatbed|box|dump|stake|tanker (solo si camion_carga)",
    "has_double_cab": true|false (solo si pickup),
    "has_4x4": true|false (solo si pickup)
  },
  "observations": ["lista de observaciones del vehículo en español, max 5"],
  "confidence": 0-1
}

Incluye SOLO params relevantes al equipment_class. NO inventes si no es visible.`;

export const refineWithPhotos = action({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }): Promise<any> => {
    // Auth check via identity (actions no tienen ctx.db pero sí ctx.auth)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { ok: false as const, error: "No autenticado" };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "ANTHROPIC_API_KEY no configurada" };
    }

    // Budget check
    const budget: any = await ctx.runMutation(internal.kbBudget.canExecute, {
      provider: "claude_opus",
      cost_usd_estimate: 0.30,
    });
    if (!budget.allowed) {
      return { ok: false as const, error: `Budget: ${budget.reason}` };
    }

    // Get vehicle + photos
    const vehInfo: any = await ctx.runQuery(internal.enrichmentQueries.getVehicleBasics, { vehiculo_id });
    if (!vehInfo?.equipment_class) {
      return { ok: false as const, error: "Vehículo no tiene equipment_class válido" };
    }
    const photos: any[] = await ctx.runQuery(internal.photoRefinementQueries.getVehiclePhotos, { vehiculo_id });
    if (photos.length === 0) {
      return { ok: false as const, error: "Vehículo no tiene fotos. Sube al menos 1 foto primero." };
    }

    // Limit a MAX_PHOTOS para no exceder context
    const selectedPhotos = photos.slice(0, MAX_PHOTOS);

    // Get current params del KB (si existen)
    const currentParams: any = await ctx.runQuery(internal.photoRefinementQueries.getCurrentParams, {
      model_year_id: vehInfo.model_year_id,
    });

    // Fetch image URLs y descargar como base64
    const imageContent: any[] = [];
    for (const photo of selectedPhotos) {
      const url: string | null = await ctx.runQuery(internal.photoRefinementQueries.getStorageUrl, { storage_id: photo.storage_id });
      if (!url) continue;
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const buf = await resp.arrayBuffer();
        const base64 = Buffer.from(buf).toString("base64");
        const mediaType = resp.headers.get("content-type") ?? "image/jpeg";
        imageContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64,
          },
        });
      } catch {
        // skip foto que falle
      }
    }

    if (imageContent.length === 0) {
      return { ok: false as const, error: "No se pudieron cargar fotos del storage" };
    }

    const client = new Anthropic({ apiKey });
    let response: any;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ] as any,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `equipment_class: ${vehInfo.equipment_class}\n` +
                      `marca: ${vehInfo.marca ?? "?"} | modelo: ${vehInfo.modelo ?? "?"} | año: ${vehInfo.anio ?? "?"}\n` +
                      `params actuales: ${JSON.stringify(currentParams ?? {})}\n\n` +
                      `Analiza las fotos y devuelve SOLO el JSON con params ajustados.`,
              },
              ...imageContent,
            ],
          },
        ],
      });
    } catch (err: any) {
      return { ok: false as const, error: err.message ?? String(err) };
    }

    // Parse JSON
    const contentBlock = response.content.find((c: any) => c.type === "text");
    let parsed: any = null;
    try {
      const raw = contentBlock?.text ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    } catch {
      return { ok: false as const, error: "Claude no devolvió JSON parseable" };
    }
    if (!parsed?.params) {
      return { ok: false as const, error: "Claude no incluyó params en respuesta" };
    }

    // Cost calc Opus 4.7: $5/$25/MTok. Cache write 1.25x.
    const usage = response.usage ?? {};
    const cost_usd =
      ((usage.input_tokens ?? 0) / 1_000_000) * 5 +
      ((usage.output_tokens ?? 0) / 1_000_000) * 25 +
      ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) * 6.25 +
      ((usage.cache_read_input_tokens ?? 0) / 1_000_000) * 0.5;

    // Record spend
    await ctx.runMutation(internal.kbBudget.recordSpend, {
      provider: "claude_opus",
      cost_usd,
    });

    // Crear template_override Tier-3 si tenemos model_year_id
    if (vehInfo.model_year_id) {
      await ctx.runMutation(internal.enrichmentMutations.upsertOverride, {
        model_year_id: vehInfo.model_year_id,
        equipment_class: vehInfo.equipment_class,
        template_name: vehInfo.equipment_class,
        param_overrides: parsed.params,
        confidence: parsed.confidence ?? 0.90,
        source: "photo_refinement",
        version_label: `Claude Opus + ${imageContent.length} fotos (conf ${((parsed.confidence ?? 0.9) * 100).toFixed(0)}%)`,
        organizacion_id: vehInfo.organizacion_id ?? undefined,
      });
    }

    return {
      ok: true as const,
      params: parsed.params,
      observations: parsed.observations ?? [],
      confidence: parsed.confidence ?? 0.90,
      cost_usd,
      photos_used: imageContent.length,
    };
  },
});
