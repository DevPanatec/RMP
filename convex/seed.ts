import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSuperAdmin } from "./lib/auth";

// Guardrail global para todas las seed mutations:
// 1. Solo super_admin puede ejecutar.
// 2. Requiere ALLOW_SEED=1 en env (defensa en profundidad).
async function assertSeedAllowed(ctx: any) {
  if (process.env.ALLOW_SEED !== "1") {
    throw new Error("Seed deshabilitado. Setear ALLOW_SEED=1 en Convex env vars.");
  }
  await requireSuperAdmin(ctx);
}

// Helper para crear un ID de usuario temporal
// Nota: Estos usuarios NO tendrán credenciales de auth reales
// Solo son perfiles en la base de datos para demostración
export const seedTestUsers = mutation({
  handler: async (ctx) => {
    await assertSeedAllowed(ctx);
    const users = [
      {
        email: "admin@rmp.com",
        tipo_usuario: "admin" as const,
        nombre_completo: "Administrador Test",
        telefono: "809-555-0001",
        documento: "001-0000001-0",
      },
      {
        email: "enterprise@rmp.com",
        tipo_usuario: "enterprise" as const,
        nombre_completo: "Empresa Test",
        telefono: "809-555-0002",
        documento: "001-0000002-0",
      },
      {
        email: "conductor@rmp.com",
        tipo_usuario: "conductor" as const,
        nombre_completo: "Conductor Test",
        telefono: "809-555-0003",
        documento: "001-0000003-0",
      },
    ];

    const results = [];

    for (const user of users) {
      try {
        // Verificar si ya existe un perfil con este email
        const existingProfile = await ctx.db
          .query("perfiles_usuarios")
          .withIndex("by_email", (q) => q.eq("email", user.email))
          .first();

        if (existingProfile) {
          results.push({
            email: user.email,
            status: "skipped",
            message: "Usuario ya existe",
          });
          continue;
        }

        // Crear un userId temporal
        // IMPORTANTE: Este usuario NO podrá hacer login sin crear la cuenta de auth
        const userId = `temp_${user.email.split("@")[0]}_${Date.now()}`;

        // Crear perfil de usuario
        const perfilId = await ctx.db.insert("perfiles_usuarios", {
          userId: userId,
          tipo_usuario: user.tipo_usuario,
          nombre_completo: user.nombre_completo,
          email: user.email,
          telefono: user.telefono,
          documento: user.documento,
          activo: true,
        });

        results.push({
          email: user.email,
          tipo: user.tipo_usuario,
          status: "profile_created",
          message: "Perfil creado - Necesita registrarse con esta cuenta",
          perfilId: perfilId,
        });
      } catch (err) {
        results.push({
          email: user.email,
          status: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return {
      results,
      warning: "Estos perfiles NO tienen credenciales de auth. Usa http://localhost:8000/?seed para crear usuarios completos con auth.",
    };
  },
});

// Seed: 15 ubicaciones de limpieza (tabla salas)
// 5 mercados + Mi Pueblito + 8 oficinas/edificios + Planta de tratamiento
export const seedCleaningLocations = mutation({
  handler: async (ctx) => {
    await assertSeedAllowed(ctx);
    const salas = [
      { nombre: "Mercado de Alcalde Díaz", descripcion: "Mercado principal de Alcalde Díaz", latitud: 9.1380, longitud: -79.4820, activo: true },
      { nombre: "Mercado del Marisco", descripcion: "Mercado de pescados y mariscos frente al mar", latitud: 8.9580, longitud: -79.5341, activo: true },
      { nombre: "Mercado de Pacora", descripcion: "Mercado público de Pacora", latitud: 9.0768, longitud: -79.2905, activo: true },
      { nombre: "Mercado San Felipe Neri", descripcion: "Mercado histórico en el Casco Antiguo", latitud: 8.9535, longitud: -79.5332, activo: true },
      { nombre: "Mercado de Pueblo Nuevo", descripcion: "Mercado popular de Pueblo Nuevo", latitud: 8.9950, longitud: -79.5250, activo: true },
      { nombre: "Complejo Turístico Mi Pueblito", descripcion: "Complejo turístico y cultural Mi Pueblito", latitud: 8.9650, longitud: -79.5520, activo: true },
      { nombre: "Palacio Municipal", descripcion: "Palacio Municipal de la ciudad de Panamá", latitud: 8.9515, longitud: -79.5345, activo: true },
      { nombre: "Casa Góngora", descripcion: "Edificio histórico del Casco Antiguo", latitud: 8.9525, longitud: -79.5338, activo: true },
      { nombre: "Casa de la Municipalidad", descripcion: "Casa de la Municipalidad en el Casco Antiguo", latitud: 8.9520, longitud: -79.5340, activo: true },
      { nombre: "Edificio Hatillo", descripcion: "Edificio administrativo Hatillo", latitud: 8.9680, longitud: -79.5370, activo: true },
      { nombre: "Almacén Central", descripcion: "Almacén Central de suministros", latitud: 8.9700, longitud: -79.5400, activo: true },
      { nombre: "Centro de Recaudación Magna Corp.", descripcion: "Centro de Recaudación Magna Corp.", latitud: 8.9830, longitud: -79.5190, activo: true },
      { nombre: "Oficinas del Parque Summit", descripcion: "Oficinas administrativas del Parque Summit", latitud: 9.0600, longitud: -79.6300, activo: true },
      { nombre: "Taller", descripcion: "Taller de mantenimiento de equipos", latitud: 8.9750, longitud: -79.5280, activo: true },
      { nombre: "Planta de tratamiento (Mercado San Felipe Neri)", descripcion: "Planta de tratamiento en el Mercado San Felipe Neri", latitud: 8.9540, longitud: -79.5330, activo: true },
    ];

    const results = [];
    for (const sala of salas) {
      // Verificar si ya existe por nombre
      const existing = await ctx.db
        .query("salas")
        .filter((q) => q.eq(q.field("nombre"), sala.nombre))
        .first();

      if (existing) {
        results.push({ nombre: sala.nombre, status: "skipped" });
        continue;
      }

      const id = await ctx.db.insert("salas", sala);
      results.push({ nombre: sala.nombre, status: "created", id });
    }

    return { table: "salas", total: salas.length, results };
  },
});

// Seed: 6 ubicaciones de fumigación/recolección (tabla lugares)
// 5 mercados + Mi Pueblito
export const seedFumigationLocations = mutation({
  handler: async (ctx) => {
    await assertSeedAllowed(ctx);
    const lugares = [
      { nombre: "Mercado de Alcalde Díaz", descripcion: "Mercado principal de Alcalde Díaz", latitud: 9.1380, longitud: -79.4820, activo: true },
      { nombre: "Mercado del Marisco", descripcion: "Mercado de pescados y mariscos frente al mar", latitud: 8.9580, longitud: -79.5341, activo: true },
      { nombre: "Mercado de Pacora", descripcion: "Mercado público de Pacora", latitud: 9.0768, longitud: -79.2905, activo: true },
      { nombre: "Mercado San Felipe Neri", descripcion: "Mercado histórico en el Casco Antiguo", latitud: 8.9535, longitud: -79.5332, activo: true },
      { nombre: "Mercado de Pueblo Nuevo", descripcion: "Mercado popular de Pueblo Nuevo", latitud: 8.9950, longitud: -79.5250, activo: true },
      { nombre: "Complejo Turístico Mi Pueblito", descripcion: "Complejo turístico y cultural Mi Pueblito", latitud: 8.9650, longitud: -79.5520, activo: true },
    ];

    const results = [];
    for (const lugar of lugares) {
      // Verificar si ya existe por nombre
      const existing = await ctx.db
        .query("lugares")
        .filter((q) => q.eq(q.field("nombre"), lugar.nombre))
        .first();

      if (existing) {
        results.push({ nombre: lugar.nombre, status: "skipped" });
        continue;
      }

      const id = await ctx.db.insert("lugares", lugar);
      results.push({ nombre: lugar.nombre, status: "created", id });
    }

    return { table: "lugares", total: lugares.length, results };
  },
});

// Helper: desactivar una sala por ID
export const deactivateSala = mutation({
  args: { id: v.id("salas") },
  handler: async (ctx, args) => {
    await assertSeedAllowed(ctx);
    return await ctx.db.patch(args.id, { activo: false });
  },
});

// Seed: Tareas y reportes de mantenimiento para la Planta de tratamiento
export const seedMaintenanceData = mutation({
  handler: async (ctx) => {
    await assertSeedAllowed(ctx);
    // Verificar si ya hay tareas para no duplicar
    const existingTasks = await ctx.db.query("maintenance_tasks").collect();
    if (existingTasks.length >= 6) {
      return { status: "skipped", message: `Ya existen ${existingTasks.length} tareas de mantenimiento` };
    }

    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const daysAgo = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d;
    };
    const daysFromNow = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d;
    };

    // Buscar vehículo existente (opcional)
    const vehiculo = await ctx.db.query("vehiculos").first();
    const vehiculoId = vehiculo?._id;
    const vehiculoPlaca = vehiculo?.placa || "N/A";

    const tasks = [
      {
        titulo: "Succión de Pozo de Bombas - Planta San Felipe Neri",
        descripcion: "Succión total del pozo de bombas, limpieza de paredes internas y canasta, extracción de grasa y sedimentos",
        tipo: "preventivo" as const,
        prioridad: "media" as const,
        fecha_programada: formatDate(daysAgo(14)),
        mecanico: "Equipo Planta de Tratamiento",
        costo: 165,
        estado: "completada",
        fecha_completada: formatDate(daysAgo(14)),
        observaciones: "Succión Total del Pozo de Bombas, Limpieza de Paredes Internas y Canasta, Extracción de Grasa y Sedimentos, Limpieza de Trampa de Grasa, Inspección de Bombas y Flotadores",
      },
      {
        titulo: "Limpieza de Trampa de Grasa - Planta San Felipe Neri",
        descripcion: "Limpieza y mantenimiento de trampa de grasa del sistema de tratamiento",
        tipo: "preventivo" as const,
        prioridad: "media" as const,
        fecha_programada: formatDate(daysAgo(7)),
        mecanico: "Equipo Planta de Tratamiento",
        costo: 120,
        estado: "completada",
        fecha_completada: formatDate(daysAgo(7)),
        observaciones: "Limpieza de trampa de grasa, desinfección general del sistema, verificación de niveles",
      },
      {
        titulo: "Inspección de Bombas y Flotadores",
        descripcion: "Inspección mensual de bombas sumergibles y flotadores del sistema de bombeo",
        tipo: "inspección" as const,
        prioridad: "alta" as const,
        fecha_programada: formatDate(daysAgo(3)),
        mecanico: "Técnico Especializado",
        costo: 85,
        estado: "completada",
        fecha_completada: formatDate(daysAgo(3)),
        observaciones: "Bombas en buen estado, flotadores calibrados, presión de bombeo dentro de parámetros normales",
      },
      {
        titulo: "Cambio de Filtros del Sistema de Tratamiento",
        descripcion: "Reemplazo de filtros de arena y carbón activado del sistema de purificación",
        tipo: "correctivo" as const,
        prioridad: "alta" as const,
        fecha_programada: formatDate(daysAgo(1)),
        mecanico: "Equipo Planta de Tratamiento",
        costo: 350,
        estado: "en_progreso",
        observaciones: "Filtros de arena reemplazados, pendiente filtro de carbón activado",
      },
      {
        titulo: "Mantenimiento Preventivo Mensual - Compactador CMP-001",
        descripcion: "Cambio de aceite, revisión de frenos, inspección del sistema hidráulico del compactador",
        tipo: "preventivo" as const,
        prioridad: "media" as const,
        fecha_programada: formatDate(daysFromNow(3)),
        mecanico: "Taller Central",
        costo: 280,
        estado: "pendiente",
      },
      {
        titulo: "Revisión de Sistema Eléctrico - Cisterna CIS-001",
        descripcion: "Diagnóstico y reparación del sistema eléctrico de la cisterna de limpieza",
        tipo: "correctivo" as const,
        prioridad: "urgente" as const,
        fecha_programada: formatDate(daysFromNow(1)),
        mecanico: "Electricista Automotriz",
        costo: 200,
        estado: "pendiente",
      },
    ];

    const createdTasks = [];
    const createdReports = [];

    for (const task of tasks) {
      const { estado, fecha_completada, observaciones, ...taskData } = task;
      const taskId = await ctx.db.insert("maintenance_tasks", {
        ...taskData,
        vehiculo_id: vehiculoId,
        estado,
      });
      createdTasks.push({ titulo: task.titulo, id: taskId, estado });

      // Si está completada, crear reporte automático
      if (estado === "completada" && fecha_completada) {
        const reportId = await ctx.db.insert("maintenance_reports", {
          task_id: taskId,
          vehiculo_id: vehiculoId,
          vehiculo_placa: vehiculoPlaca,
          titulo: task.titulo,
          descripcion: task.descripcion,
          tipo: task.tipo,
          prioridad: task.prioridad,
          fecha_programada: task.fecha_programada,
          fecha_completada,
          costo: task.costo,
          mecanico: task.mecanico,
          fotos_antes_ids: [],
          fotos_durante_ids: [],
          fotos_despues_ids: [],
          observaciones: observaciones || "",
          usuario_completo: "Admin",
          fecha_reporte: fecha_completada,
        });
        createdReports.push({ titulo: task.titulo, id: reportId });
      }
    }

    return {
      tasks: createdTasks,
      reports: createdReports,
      message: `Creadas ${createdTasks.length} tareas y ${createdReports.length} reportes de mantenimiento`,
    };
  },
});

// Mutation para eliminar todos los usuarios de prueba
export const clearTestUsers = mutation({
  handler: async (ctx) => {
    await assertSeedAllowed(ctx);
    const testEmails = [
      "admin@rmp.com",
      "enterprise@rmp.com",
      "conductor@rmp.com",
    ];

    const results = [];

    for (const email of testEmails) {
      const profile = await ctx.db
        .query("perfiles_usuarios")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (profile) {
        await ctx.db.delete(profile._id);
        results.push({ email, status: "deleted" });
      } else {
        results.push({ email, status: "not_found" });
      }
    }

    return results;
  },
});
