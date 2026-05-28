"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";

// Claude Sonnet 4.6 procesa texto extraído del manual y devuelve JSON estructurado
// con specs + part_catalog. Smart routing: solo invoca Claude si hay texto suficiente.
// Costo registrado en kb_audit_log via run mutation.
//
// Env var requerida: ANTHROPIC_API_KEY (set via `npx convex env set`).

const MODEL = "claude-sonnet-4-6";
const MAX_INPUT_CHARS = 40000; // ~10k tokens — chunk si más grande

const SYSTEM_PROMPT = `Eres un asistente experto en manuales OEM de vehículos comerciales pesados (camiones, barredoras, fumigadoras, cisternas, etc).
Recibirás texto extraído de un manual y debes devolver SOLO un JSON con la siguiente estructura — sin comentarios fuera del JSON:

{
  "specs": {
    "make": "string|null",
    "model": "string|null",
    "year": number|null,
    "engine": "string|null",
    "transmission": "string|null",
    "axle_config": "4x2|6x2|6x4|8x4|8x6|null",
    "cabin_style": "conventional|cab_over|null",
    "gvwr_kg": number|null,
    "wheelbase_mm": number|null
  },
  "param_overrides": {
    "wheelbase_ratio": number|null,
    "axle_config": "string|null",
    "cabin_style": "string|null"
  },
  "parts": [
    { "nombre": "string", "numero_parte_oem": "string|null", "sistema": "motor|transmision|frenos|hidraulico|electrico|neumaticos|carroceria|otros", "vida_util_km": number|null, "vida_util_horas": number|null, "vida_util_dias": number|null }
  ],
  "confidence": number  // 0-1, qué tan seguro estás de la extracción
}

Si no encuentras un dato, usa null. NO inventes. Lista hasta 30 partes más importantes.`;

export const processWithClaude = internalAction({
  args: {
    ingestion_run_id: v.id("ingestion_runs"),
    extracted_text: v.string(),
  },
  handler: async (ctx, { ingestion_run_id, extracted_text }): Promise<{ ok: boolean; confidence?: number; error?: string }> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.ingestionMutations.markRunFailed, {
        run_id: ingestion_run_id,
        error: "ANTHROPIC_API_KEY no configurada",
      });
      return { ok: false as const, error: "ANTHROPIC_API_KEY missing" };
    }

    const text = extracted_text.slice(0, MAX_INPUT_CHARS);
    const client = new Anthropic({ apiKey });

    let response: any;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ] as any,
        messages: [
          { role: "user", content: `Texto del manual:\n\n${text}\n\nDevuelve SOLO el JSON.` },
        ],
      });
    } catch (err: any) {
      await ctx.runMutation(internal.ingestionMutations.markRunFailed, {
        run_id: ingestion_run_id,
        error: err.message ?? String(err),
      });
      return { ok: false as const, error: err.message ?? String(err) };
    }

    // Parse JSON respuesta
    const contentBlock = response.content.find((c: any) => c.type === "text");
    let parsed: any = null;
    try {
      const raw = contentBlock?.text ?? "";
      // Extraer primer JSON block
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    } catch (err: any) {
      await ctx.runMutation(internal.ingestionMutations.markRunFailed, {
        run_id: ingestion_run_id,
        error: `JSON parse failed: ${err.message}`,
      });
      return { ok: false as const, error: "parse failed" };
    }

    if (!parsed) {
      await ctx.runMutation(internal.ingestionMutations.markRunFailed, {
        run_id: ingestion_run_id,
        error: "Claude no devolvió JSON parseable",
      });
      return { ok: false as const, error: "no json" };
    }

    // Cost calc (Sonnet 4.6: $3/$15 per MTok). Cache write: 125%.
    const usage = response.usage ?? {};
    const inputTokens = usage.input_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? 0;
    const cacheCreate = usage.cache_creation_input_tokens ?? 0;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cost_usd =
      (inputTokens / 1_000_000) * 3 +
      (outputTokens / 1_000_000) * 15 +
      (cacheCreate / 1_000_000) * 3.75 +
      (cacheRead / 1_000_000) * 0.3;

    await ctx.runMutation(internal.ingestionMutations.completeRun, {
      run_id: ingestion_run_id,
      extracted_structure: parsed,
      confidence: parsed.confidence ?? 0.7,
      cost_usd,
      vision_model: MODEL,
    });

    return { ok: true as const, confidence: parsed.confidence ?? 0.7 };
  },
});
