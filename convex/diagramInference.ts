import { query } from "./_generated/server";
import { v } from "convex/values";

// Defaults por equipment_class (mismos que src/diagrams/templates/*.ts pero replicados
// en backend para no depender de frontend).
const TEMPLATE_DEFAULTS: Record<string, any> = {
  compactador: {
    view: "top",
    wheelbase_ratio: 0.55,
    axle_config: "6x4",
    cabin_style: "conventional",
    compactor_size_ratio: 0.13,
  },
  barredora: {
    view: "top",
    tank_size_ratio: 0.38,
    side_brushes: true,
    main_brush_width_ratio: 0.07,
  },
  fumigadora: {
    view: "top",
    tank_size_ratio: 0.4,
    nozzle_count: 5,
    has_compressor: true,
  },
  cisterna: {
    view: "top",
    tank_size_ratio: 0.52,
    axle_config: "8x4",
    has_pump_system: true,
  },
  pickup: {
    view: "top",
    has_4x4: false,
    has_double_cab: true,
    bed_size_ratio: 0.38,
    has_toolbox: false,
  },
  bus: {
    view: "top",
    length_ratio: 0.92,
    axle_config: "6x4",
    door_count: 2,
    has_articulated: false,
  },
  camion_carga: {
    view: "top",
    cabin_style: "conventional",
    axle_config: "6x4",
    cargo_body_type: "box",
    cargo_size_ratio: 0.55,
    has_pto: false,
  },
};

// Heuristicas por keywords en modelo/marca
function applyHeuristics(equipmentClass: string, marca?: string, modelo?: string, anio?: number): any {
  const adjustments: any = {};
  const modeloLow = (modelo ?? "").toLowerCase();
  const marcaLow = (marca ?? "").toLowerCase();

  // Heuristica: keywords axle
  if (modeloLow.includes("4x2") || modeloLow.includes("single axle")) {
    adjustments.axle_config = "4x2";
  } else if (modeloLow.includes("8x4") || modeloLow.includes("tridem")) {
    adjustments.axle_config = "8x4";
  } else if (modeloLow.includes("6x4") || modeloLow.includes("tandem")) {
    adjustments.axle_config = "6x4";
  }

  // Heuristica: cab over (común en Isuzu, Hino)
  if (marcaLow === "isuzu" || marcaLow === "hino" || marcaLow === "fuso" || modeloLow.includes("cab over")) {
    if (equipmentClass === "compactador" || equipmentClass === "camion_carga") {
      adjustments.cabin_style = "cab_over";
    }
  }

  // Heuristica: año reciente → más probable cab doble en pickups
  if (equipmentClass === "pickup" && anio && anio >= 2015) {
    adjustments.has_double_cab = true;
  }

  // Heuristica: keywords body_type para camion_carga
  if (equipmentClass === "camion_carga") {
    if (modeloLow.includes("dump") || modeloLow.includes("volquete") || modeloLow.includes("tipper")) {
      adjustments.cargo_body_type = "dump";
    } else if (modeloLow.includes("tank") || modeloLow.includes("cisterna")) {
      adjustments.cargo_body_type = "tanker";
    } else if (modeloLow.includes("flat") || modeloLow.includes("plat")) {
      adjustments.cargo_body_type = "flatbed";
    } else if (modeloLow.includes("stake")) {
      adjustments.cargo_body_type = "stake";
    }
  }

  // Heuristica: bus articulado
  if (equipmentClass === "bus" && (modeloLow.includes("articulated") || modeloLow.includes("articulado"))) {
    adjustments.has_articulated = true;
    adjustments.length_ratio = 1.0;
  }

  return adjustments;
}

// Computa params best-effort para un vehiculo dado.
// Returns { params, confidence, source_chain }.
// confidence: 0.3 = solo defaults; 0.5 = + heurísticas; 0.7+ = + KB partial.
export const inferBestEffortParams = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }) => {
    const veh = await ctx.db.get(vehiculo_id);
    if (!veh) return null;

    // Resolver equipment_class
    const equipMap: Record<string, string> = {
      barredora: "barredora",
      compactador: "compactador",
      camion_carga: "camion_carga",
      bus: "bus",
      pickup: "pickup",
      cisterna: "cisterna",
      fumigadora: "fumigadora",
    };
    const equipClass = veh.tipo_vehiculo ? equipMap[veh.tipo_vehiculo] : null;
    if (!equipClass || !TEMPLATE_DEFAULTS[equipClass]) {
      return null;
    }

    const sourceChain: string[] = [];
    let params = { ...TEMPLATE_DEFAULTS[equipClass] };
    sourceChain.push("equipment_class_defaults");
    let confidence = 0.3;

    // Heurísticas por keywords
    const heuristics = applyHeuristics(equipClass, veh.marca, veh.modelo, veh.anio);
    if (Object.keys(heuristics).length > 0) {
      params = { ...params, ...heuristics };
      sourceChain.push("keyword_heuristics");
      confidence = 0.5;
    }

    // Buscar modelo similar en KB (mismo make + nombre parcial match)
    if (veh.marca && veh.modelo) {
      const slug = veh.marca.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const make = await ctx.db
        .query("makes")
        .withIndex("by_slug", q => q.eq("slug", slug))
        .first();
      if (make) {
        const models = await ctx.db
          .query("models")
          .withIndex("by_make", q => q.eq("make_id", make._id))
          .collect();
        const exactMatch = models.find(m =>
          m.nombre.toLowerCase().trim() === veh.modelo!.toLowerCase().trim()
        );
        let targetModel = exactMatch;
        // Si no hay exact, buscar contains-match (Granite vs Granite GU713)
        if (!exactMatch) {
          const partial = models.find(m =>
            m.nombre.toLowerCase().includes(veh.modelo!.toLowerCase().split(" ")[0]) ||
            veh.modelo!.toLowerCase().includes(m.nombre.toLowerCase())
          );
          if (partial) {
            targetModel = partial;
            sourceChain.push("partial_model_match");
          }
        }

        if (targetModel) {
          // Buscar model_year exacto o el más cercano
          const years = await ctx.db
            .query("model_years")
            .withIndex("by_model", q => q.eq("model_id", targetModel!._id))
            .collect();
          let targetYear = veh.anio ? years.find(y => y.year === veh.anio) : null;
          if (!targetYear && years.length > 0 && veh.anio) {
            // Año más cercano
            years.sort((a, b) => Math.abs(a.year - veh.anio!) - Math.abs(b.year - veh.anio!));
            targetYear = years[0];
            sourceChain.push("nearest_year_match");
          } else if (!targetYear && years.length > 0) {
            targetYear = years[0];
            sourceChain.push("any_year_fallback");
          }

          if (targetYear?.param_svg_overrides) {
            params = { ...params, ...targetYear.param_svg_overrides };
            sourceChain.push("kb_model_year_params");
            confidence = 0.75;
          }

          // Si encontramos override existente → tomar el de mayor confidence
          if (targetYear) {
            const overrides = await ctx.db
              .query("template_overrides")
              .withIndex("by_model_year", q => q.eq("model_year_id", targetYear!._id))
              .collect();
            if (overrides.length > 0) {
              overrides.sort((a, b) => b.confidence - a.confidence);
              const best = overrides[0];
              params = { ...params, ...best.param_overrides };
              sourceChain.push(`override_${best.source}`);
              confidence = Math.max(confidence, best.confidence);
            }
          }
        }
      }
    }

    return {
      equipment_class: equipClass,
      params,
      confidence,
      source_chain: sourceChain,
    };
  },
});
