"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import * as crypto from "crypto";

// Internet Archive — biblioteca pública de manuales en dominio público.
// Cobertura: manuales militares US Army, manuales históricos automotive,
// catálogos OEM viejos (Mack 1960s-90s, Ford trucks, etc).
//
// Docs: https://archive.org/developers/
// Search API: https://archive.org/advancedsearch.php
// Item metadata: https://archive.org/metadata/{identifier}
// Files: https://archive.org/download/{identifier}/{filename}
//
// Sin auth required para search + read. License mixto — verificar `rights` field
// por item. CC-BY/PD aceptable, otros requieren skip.

const SEARCH_URL = "https://archive.org/advancedsearch.php";
const METADATA_URL = "https://archive.org/metadata";

interface ArchiveSearchHit {
  identifier: string;
  title?: string;
  creator?: string | string[];
  publicdate?: string;
  mediatype?: string;
  rights?: string;
  collection?: string | string[];
}

interface ArchiveSearchResponse {
  response: {
    numFound: number;
    docs: ArchiveSearchHit[];
  };
}

// Search por make + keywords. Retorna identifiers para fetch detallado.
export const search = internalAction({
  args: {
    query: v.string(),
    rows: v.optional(v.number()),
  },
  handler: async (_ctx, { query, rows }): Promise<any> => {
    const params = new URLSearchParams({
      q: `${query} AND mediatype:texts AND (rights:"public domain" OR rights:cc OR licenseurl:*creativecommons*)`,
      fl: "identifier,title,creator,publicdate,mediatype,rights,collection",
      rows: String(rows ?? 20),
      output: "json",
      sort: "downloads desc",
    });

    const url = `${SEARCH_URL}?${params.toString()}`;
    try {
      const resp = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "RMP-CMMS/1.0" },
      });
      if (!resp.ok) return { ok: false as const, error: `HTTP ${resp.status}` };
      const data = await resp.json() as ArchiveSearchResponse;
      return {
        ok: true as const,
        total: data.response.numFound,
        results: data.response.docs ?? [],
      };
    } catch (err: any) {
      return { ok: false as const, error: err.message ?? String(err) };
    }
  },
});

// Fetch item metadata (lista files + URLs descargables)
export const getItemMetadata = internalAction({
  args: { identifier: v.string() },
  handler: async (_ctx, { identifier }): Promise<any> => {
    const url = `${METADATA_URL}/${encodeURIComponent(identifier)}`;
    try {
      const resp = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "RMP-CMMS/1.0" },
      });
      if (!resp.ok) return { ok: false as const, error: `HTTP ${resp.status}` };
      const data: any = await resp.json();
      const pdfFiles = (data.files ?? [])
        .filter((f: any) => f.name?.toLowerCase().endsWith(".pdf"))
        .map((f: any) => ({
          name: f.name,
          size: parseInt(f.size ?? "0", 10),
          download_url: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`,
        }));
      return {
        ok: true as const,
        identifier,
        metadata: data.metadata ?? {},
        pdf_files: pdfFiles,
      };
    } catch (err: any) {
      return { ok: false as const, error: err.message ?? String(err) };
    }
  },
});

// Sync: para una make del KB, busca en Internet Archive y registra hits como kb_sources.
// Filtra a items con license public_domain o CC. Skip restricted.
export const syncMakeFromArchive = internalAction({
  args: { make_id: v.id("makes") },
  handler: async (ctx, { make_id }): Promise<any> => {
    const make: any = await ctx.runQuery(internal.makes.getInternal, { id: make_id });
    if (!make) return { ok: false as const, error: "make no existe" };

    // Query: marca + service manual / parts catalog
    const queries = [
      `"${make.nombre}" service manual`,
      `"${make.nombre}" parts catalog`,
      `"${make.nombre}" operator manual`,
    ];

    let totalRegistered = 0;
    for (const q of queries) {
      const result: any = await ctx.runAction(internal.integrations.internetArchive.search, {
        query: q,
        rows: 10,
      });
      if (!result.ok) continue;

      for (const hit of result.results) {
        // Filtrar license aceptable
        const rights = (hit.rights ?? "").toLowerCase();
        const acceptable =
          rights.includes("public domain") ||
          rights.includes("cc") ||
          rights.includes("creative commons") ||
          rights === "";
        if (!acceptable) continue;

        // Skip items que no son manuales (mediatype check ya en query, doble check aquí)
        if (hit.mediatype && hit.mediatype !== "texts") continue;

        const url = `https://archive.org/details/${hit.identifier}`;
        const hash = crypto.createHash("sha256").update(hit.identifier).digest("hex");

        await ctx.runMutation(internal.kbSources.recordInternal, {
          make_id,
          source_url: url,
          source_type: "internet_archive",
          content_hash: hash,
          parsed_data: {
            identifier: hit.identifier,
            title: hit.title,
            creator: hit.creator,
            publicdate: hit.publicdate,
            rights: hit.rights,
            query_matched: q,
          },
          confidence: 0.6, // baja porque títulos son ambiguos
          license: "public_domain",
          attribution: `Internet Archive · ${hit.identifier} · ${hit.creator ?? "unknown creator"}`,
        });
        totalRegistered++;
      }
    }
    return { ok: true as const, registered: totalRegistered, make: make.nombre };
  },
});
