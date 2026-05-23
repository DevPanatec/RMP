import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope } from "./lib/auth";

// Maps tipo_vehiculo → equipment_class
function getEquipmentClass(tipoVehiculo?: string): string | null {
  const map: Record<string, string> = {
    barredora: "barredora",
    compactador: "compactador",
    camion_carga: "compactador",
    bus: "compactador",
    pickup: "compactador",
    cisterna: "cisterna",
    fumigadora: "fumigadora",
  };
  return tipoVehiculo ? (map[tipoVehiculo] ?? null) : null;
}

type ZoneDef = {
  nombre: string;
  system_key: string;
  tipo_patterns: string[];
  polygon_points: string;
  display_order: number;
};

type TemplateDef = {
  equipment_class: string;
  label: string;
  render_path: string;
  image_width: number;
  image_height: number;
  zones: ZoneDef[];
};

// Factory defaults — sirven sin necesitar seed en BD
const GENERIC_TEMPLATES: TemplateDef[] = [
  {
    equipment_class: "barredora",
    label: "Barredora Vial",
    render_path: "/renders/barredora.svg",
    image_width: 400,
    image_height: 180,
    zones: [
      {
        nombre: "Tren de Rodaje",
        system_key: "tren_rodaje",
        tipo_patterns: ["llanta", "rueda", "neumatico", "rin", "cubierta", "amortiguador"],
        polygon_points: "0% 10%, 10% 10%, 10% 90%, 0% 90%",
        display_order: 1,
      },
      {
        nombre: "Motor",
        system_key: "motor",
        tipo_patterns: ["motor", "bateria", "alternador", "arranque", "correa", "filtro_aceite", "filtro_aire", "bujia", "radiador", "termostato", "bomba_agua_motor"],
        polygon_points: "10% 17%, 36% 17%, 36% 83%, 10% 83%",
        display_order: 2,
      },
      {
        nombre: "Depósito de Agua",
        system_key: "deposito",
        tipo_patterns: ["deposito", "tanque_agua", "agua", "liquido_limpiador", "bomba_agua", "filtro_agua"],
        polygon_points: "36% 19%, 74% 19%, 74% 81%, 36% 81%",
        display_order: 3,
      },
      {
        nombre: "Cepillos Laterales",
        system_key: "cepillos_laterales",
        tipo_patterns: ["cepillo_lateral", "escoba_lateral", "cepillo_lat", "brush_lateral", "cepillo_izq", "cepillo_der"],
        polygon_points: "74% 10%, 84% 10%, 84% 90%, 74% 90%",
        display_order: 4,
      },
      {
        nombre: "Cepillo Principal",
        system_key: "cepillo_principal",
        tipo_patterns: ["cepillo_principal", "cepillo_trasero", "escoba_principal", "brush_principal", "cepillo"],
        polygon_points: "84% 17%, 97% 17%, 97% 83%, 84% 83%",
        display_order: 5,
      },
    ],
  },
  {
    equipment_class: "compactador",
    label: "Camión Compactador",
    render_path: "/renders/compactador.svg",
    image_width: 400,
    image_height: 180,
    zones: [
      {
        nombre: "Tren de Rodaje",
        system_key: "tren_rodaje",
        tipo_patterns: ["llanta", "rueda", "neumatico", "rin", "cubierta", "amortiguador"],
        polygon_points: "0% 10%, 10% 10%, 10% 90%, 0% 90%",
        display_order: 1,
      },
      {
        nombre: "Motor",
        system_key: "motor",
        tipo_patterns: ["motor", "bateria", "alternador", "arranque", "correa", "filtro_aceite", "filtro_aire", "radiador", "termostato"],
        polygon_points: "10% 17%, 35% 17%, 35% 83%, 10% 83%",
        display_order: 2,
      },
      {
        nombre: "Transmisión",
        system_key: "transmision",
        tipo_patterns: ["transmision", "caja_cambios", "clutch", "embrague", "diferencial", "cardan", "junta_homoinetica"],
        polygon_points: "35% 20%, 58% 20%, 58% 80%, 35% 80%",
        display_order: 3,
      },
      {
        nombre: "Sistema Hidráulico",
        system_key: "hidraulico",
        tipo_patterns: ["hidraulico", "cilindro", "bomba_hidraulica", "manguera_hidraulica", "aceite_hidraulico", "valvula_hidraulica"],
        polygon_points: "58% 17%, 79% 17%, 79% 83%, 58% 83%",
        display_order: 4,
      },
      {
        nombre: "Compactador",
        system_key: "compactador",
        tipo_patterns: ["compactador", "placa_compactadora", "packer", "tornillo_sin_fin", "cuchilla_compactadora"],
        polygon_points: "79% 11%, 97% 11%, 97% 89%, 79% 89%",
        display_order: 5,
      },
    ],
  },
  {
    equipment_class: "fumigadora",
    label: "Equipo Fumigadora",
    render_path: "/renders/fumigadora.svg",
    image_width: 400,
    image_height: 180,
    zones: [
      {
        nombre: "Tren de Rodaje",
        system_key: "tren_rodaje",
        tipo_patterns: ["llanta", "rueda", "neumatico", "rin", "cubierta", "amortiguador"],
        polygon_points: "0% 10%, 10% 10%, 10% 90%, 0% 90%",
        display_order: 1,
      },
      {
        nombre: "Motor",
        system_key: "motor",
        tipo_patterns: ["motor", "bateria", "alternador", "arranque", "correa", "filtro_aceite", "filtro_aire", "radiador"],
        polygon_points: "10% 17%, 34% 17%, 34% 83%, 10% 83%",
        display_order: 2,
      },
      {
        nombre: "Tanque Fumigante",
        system_key: "tanque",
        tipo_patterns: ["tanque", "deposito_producto", "agitador", "producto_fumigante", "tanque_fumigante", "cisterna_quimica"],
        polygon_points: "34% 14%, 74% 14%, 74% 86%, 34% 86%",
        display_order: 3,
      },
      {
        nombre: "Bomba / Compresor",
        system_key: "bomba",
        tipo_patterns: ["bomba", "compresor", "bomba_fumigacion", "valvula_principal", "bomba_centrifuga", "motor_bomba"],
        polygon_points: "74% 22%, 84% 22%, 84% 78%, 74% 78%",
        display_order: 4,
      },
      {
        nombre: "Sistema de Aspersión",
        system_key: "boquillas",
        tipo_patterns: ["boquilla", "aspersor", "spray", "nebulizador", "barra_aspersion", "filtro_boquilla", "pico", "nozzle"],
        polygon_points: "84% 11%, 97% 11%, 97% 89%, 84% 89%",
        display_order: 5,
      },
    ],
  },
  {
    equipment_class: "cisterna",
    label: "Camión Cisterna",
    render_path: "/renders/cisterna.svg",
    image_width: 400,
    image_height: 180,
    zones: [
      {
        nombre: "Tren de Rodaje",
        system_key: "tren_rodaje",
        tipo_patterns: ["llanta", "rueda", "neumatico", "rin", "cubierta", "amortiguador"],
        polygon_points: "0% 10%, 10% 10%, 10% 90%, 0% 90%",
        display_order: 1,
      },
      {
        nombre: "Motor",
        system_key: "motor",
        tipo_patterns: ["motor", "bateria", "alternador", "arranque", "correa", "filtro_aceite", "filtro_aire", "radiador"],
        polygon_points: "10% 17%, 30% 17%, 30% 83%, 10% 83%",
        display_order: 2,
      },
      {
        nombre: "Tanque / Cisterna",
        system_key: "tanque",
        tipo_patterns: ["tanque", "cisterna", "deposito", "boca_llenado", "valvula_cisterna", "tapa_cisterna", "aislamiento"],
        polygon_points: "30% 14%, 80% 14%, 80% 86%, 30% 86%",
        display_order: 3,
      },
      {
        nombre: "Sistema de Bombeo",
        system_key: "sistema_bombeo",
        tipo_patterns: ["bomba", "valvula", "manguera", "compresor", "contador", "medidor_flujo", "conector", "acoplamiento"],
        polygon_points: "80% 20%, 97% 20%, 97% 80%, 80% 80%",
        display_order: 4,
      },
    ],
  },
];

// ─── Queries ──────────────────────────────────────────────

export const resolveForVehicle = query({
  args: { vehiculo_id: v.id("vehiculos") },
  handler: async (ctx, { vehiculo_id }) => {
    const vehicle = await ctx.db.get(vehiculo_id);
    if (!vehicle) return null;

    const equipClass = getEquipmentClass(vehicle.tipo_vehiculo);

    // Plan v6 — Nivel 1.0: Buscar param_svg_overrides en KB (model_years)
    // Si existe → devolver params para que cliente use code template TS
    let kbParams: any = null;
    if (vehicle.marca && vehicle.modelo) {
      const make = await ctx.db
        .query("makes")
        .withIndex("by_slug", q => q.eq("slug", vehicle.marca!.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")))
        .first();
      if (make) {
        const candidateModels = await ctx.db
          .query("models")
          .withIndex("by_make", q => q.eq("make_id", make._id))
          .collect();
        const matchModel = candidateModels.find(m =>
          m.nombre.toLowerCase().trim() === vehicle.modelo!.toLowerCase().trim()
        );
        if (matchModel && vehicle.anio) {
          const my = await ctx.db
            .query("model_years")
            .withIndex("by_model_year", q => q.eq("model_id", matchModel._id).eq("year", vehicle.anio!))
            .first();
          if (my?.param_svg_overrides) {
            kbParams = my.param_svg_overrides;
          }
          // Plan v6 — Nivel 1.1: template_overrides cacheado (refinamiento Claude)
          if (!kbParams) {
            const override = await ctx.db
              .query("template_overrides")
              .withIndex("by_model_year", q => q.eq("model_year_id", my!._id))
              .first();
            if (override) kbParams = override.param_overrides;
          }
        }
      }
    }

    // Level 1: Plantilla verificada específica del modelo (SVG legacy)
    if (vehicle.marca && vehicle.modelo) {
      const modelTpl = await ctx.db
        .query("diagram_templates")
        .withIndex("by_make_model", q =>
          q.eq("make", vehicle.marca!).eq("model_name", vehicle.modelo!),
        )
        .filter(q =>
          q.and(
            q.eq(q.field("validated"), true),
            q.eq(q.field("is_generic"), false),
          ),
        )
        .first();
      if (modelTpl) {
        const zones = await ctx.db
          .query("diagram_zones")
          .withIndex("by_template", q => q.eq("template_id", modelTpl._id))
          .collect();
        return {
          template: modelTpl,
          zones,
          fallback_level: 1 as const,
          equipment_class: equipClass,
          code_template_params: kbParams,
        };
      }
    }

    // Level 2: Render genérico de clase desde BD
    if (equipClass) {
      const classTpl = await ctx.db
        .query("diagram_templates")
        .withIndex("by_class_view", q =>
          q.eq("equipment_class", equipClass).eq("view_type", "top"),
        )
        .filter(q => q.eq(q.field("is_generic"), true))
        .first();
      if (classTpl) {
        const zones = await ctx.db
          .query("diagram_zones")
          .withIndex("by_template", q => q.eq("template_id", classTpl._id))
          .collect();
        return {
          template: classTpl,
          zones,
          fallback_level: 2 as const,
          equipment_class: equipClass,
          code_template_params: kbParams,
        };
      }

      // Level 2b: Constantes hardcoded (no requiere seed en BD)
      const hardcoded = GENERIC_TEMPLATES.find(t => t.equipment_class === equipClass);
      if (hardcoded) {
        return {
          template: {
            render_path: hardcoded.render_path,
            label: hardcoded.label,
            equipment_class: hardcoded.equipment_class,
            image_width: hardcoded.image_width,
            image_height: hardcoded.image_height,
            is_generic: true,
          },
          zones: hardcoded.zones.map((z, i) => ({
            ...z,
            _id: `hardcoded-${hardcoded.equipment_class}-${i}`,
          })),
          fallback_level: 2 as const,
          equipment_class: equipClass,
          code_template_params: kbParams,
        };
      }
    }

    // Level 3: Sin diagrama — solo lista de componentes
    return {
      template: null,
      zones: [],
      fallback_level: 3 as const,
      equipment_class: equipClass,
      code_template_params: null,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────

// Admin: persiste los templates genéricos en BD (los hace editables vía mapeador futuro)
export const seedGenericTemplates = mutation({
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isAdmin && !scope.isSuperAdmin) {
      throw new Error("Acceso denegado: requiere admin o super_admin");
    }
    let seeded = 0;
    for (const tpl of GENERIC_TEMPLATES) {
      const existing = await ctx.db
        .query("diagram_templates")
        .withIndex("by_class_view", q =>
          q.eq("equipment_class", tpl.equipment_class).eq("view_type", "top"),
        )
        .filter(q => q.eq(q.field("is_generic"), true))
        .first();
      if (existing) continue;
      const tplId = await ctx.db.insert("diagram_templates", {
        equipment_class: tpl.equipment_class,
        view_type: "top",
        render_path: tpl.render_path,
        image_width: tpl.image_width,
        image_height: tpl.image_height,
        label: tpl.label,
        is_generic: true,
        validated: true,
      });
      for (const zone of tpl.zones) {
        await ctx.db.insert("diagram_zones", {
          template_id: tplId,
          nombre: zone.nombre,
          system_key: zone.system_key,
          tipo_patterns: zone.tipo_patterns,
          polygon_points: zone.polygon_points,
          display_order: zone.display_order,
        });
      }
      seeded++;
    }
    return { seeded };
  },
});
