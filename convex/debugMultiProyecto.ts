import { query } from "./_generated/server";
import { getAuthScope } from "./lib/auth";

// Diagnóstico para entender por qué el enterprise no ve un vehículo en el mapa.
// Llamar desde la consola del browser estando logueado como enterprise:
//   await window.convex.query("debugMultiProyecto:enterpriseDoctor", {})
export const enterpriseDoctor = query({
  args: {},
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    const out: any = {
      sesion: {
        autenticado: !!scope.perfil,
        tipo: scope.perfil?.tipo_usuario,
        perfil_id: scope.perfil?._id,
        perfil_proyecto_id: scope.perfil?.proyecto_id,
        nombre: scope.perfil?.nombre_completo,
      },
      proyecto_del_perfil: null as any,
      route_progress_en_progreso: [] as any[],
      coincidencia: {
        algun_proyecto_id_de_progress_coincide: false,
        candidatos_match: [] as any[],
      },
    };

    if (scope.perfil?.proyecto_id) {
      const p = await ctx.db.get(scope.perfil.proyecto_id);
      out.proyecto_del_perfil = p
        ? { _id: p._id, nombre: p.nombre, activo: p.activo }
        : "NO EXISTE EL PROYECTO REFERENCIADO POR EL PERFIL";
    }

    const allLive = await ctx.db
      .query("route_progress")
      .withIndex("by_estado", (q) => q.eq("estado", "en_progreso"))
      .collect();

    for (const rp of allLive) {
      const a = rp.asignacion_id ? await ctx.db.get(rp.asignacion_id) : null;
      const r = rp.ruta_id ? await ctx.db.get(rp.ruta_id) : null;
      const v = await ctx.db.get(rp.vehiculo_id);
      const proyectoEffective =
        rp.proyecto_id ?? a?.proyecto_id ?? r?.proyecto_id ?? null;
      const matchea = scope.perfil?.proyecto_id
        ? proyectoEffective === scope.perfil.proyecto_id
        : false;
      const item = {
        route_progress_id: rp._id,
        conductor_nombre: rp.conductor_nombre,
        vehiculo_id: rp.vehiculo_id,
        vehiculo_placa: v?.placa,
        ruta_id: rp.ruta_id,
        ruta_nombre: r?.nombre,
        ruta_proyecto_id: r?.proyecto_id,
        asignacion_id: rp.asignacion_id,
        asignacion_proyecto_id: a?.proyecto_id,
        route_progress_proyecto_id: rp.proyecto_id,
        proyecto_efectivo: proyectoEffective,
        matchea_con_perfil: matchea,
      };
      out.route_progress_en_progreso.push(item);
      if (matchea) {
        out.coincidencia.algun_proyecto_id_de_progress_coincide = true;
        out.coincidencia.candidatos_match.push(item);
      }
    }

    return out;
  },
});
