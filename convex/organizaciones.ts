import { query, mutation, internalMutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getAuthScope, requireSuperAdmin, requireOrgAccess } from "./lib/auth";
import {
  ESCALA_LIMITS,
  buildUsageReport,
  calcMRR,
  type Escala,
  type CustomCaps,
} from "./lib/limits";
import {
  MODULO_CATALOG,
  isValidModuloCodigo,
  sumModulosUsd,
} from "./lib/modules";

type AnyCtx = QueryCtx | MutationCtx;

// Truncar valores grandes para evitar bloating del audit log.
// Devuelve un string legible cuando el valor supera el cap; preservamos el flag
// _truncated para que la UI pueda reconocerlo, pero el preview se rinde directo.
const MAX_AUDIT_VALUE_SIZE = 5_000; // ~5KB JSON
const AUDIT_PREVIEW_LEN = 500;
function truncateAuditValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  try {
    const json = JSON.stringify(value);
    if (json.length <= MAX_AUDIT_VALUE_SIZE) return value;
    return {
      _truncated: true,
      _preview: json.slice(0, AUDIT_PREVIEW_LEN) + "…",
    };
  } catch {
    return { _unserializable: true };
  }
}

const YEAR_MIN = 2020;
const YEAR_MAX = 2100;
function assertSaneEpochMs(ms: number, field: string): void {
  if (!Number.isFinite(ms)) {
    throw new Error(`Fecha inválida en ${field}`);
  }
  const year = new Date(ms).getUTCFullYear();
  if (year < YEAR_MIN || year > YEAR_MAX) {
    throw new Error(
      `Fecha en ${field} fuera de rango (año ${year}); debe estar entre ${YEAR_MIN} y ${YEAR_MAX}.`,
    );
  }
}

// Lista todas las orgs activas (solo super_admin)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin) return [];
    return await ctx.db
      .query("organizaciones")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
  },
});

// Lista orgs accesibles según el rol del user
// Super_admin → todas las activas
// Otros → solo la propia (si tienen)
export const listAccessible = query({
  args: {},
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (!scope.perfil) return [];
    if (scope.isSuperAdmin) {
      return await ctx.db
        .query("organizaciones")
        .withIndex("by_activo", (q) => q.eq("activo", true))
        .collect();
    }
    if (!scope.organizacionId) return [];
    const org = await ctx.db.get(scope.organizacionId);
    return org ? [org] : [];
  },
});

export const getById = query({
  args: { id: v.id("organizaciones") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.id);
    const org = await ctx.db.get(args.id);
    if (!org) return null;
    // Soft-deleted: solo super_admin lee orgs inactivas (auditoría/restore).
    const scope = await getAuthScope(ctx);
    if (org.activo === false && !scope.isSuperAdmin) return null;
    return org;
  },
});

export const add = mutation({
  args: {
    nombre: v.string(),
    slug: v.string(),
    descripcion: v.optional(v.string()),
    contacto_email: v.optional(v.string()),
    contacto_telefono: v.optional(v.string()),
    logo_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const existing = await ctx.db
      .query("organizaciones")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error(`Ya existe una organización con slug "${args.slug}"`);
    const newOrgId = await ctx.db.insert("organizaciones", {
      ...args,
      activo: true,
      fecha_creacion: new Date().toISOString(),
      // Default: módulo REC activo. Invariante backend exige ≥1 módulo
      // (toggleModulo línea ~422 throw si set vacío); arrancamos con uno
      // razonable que el super_admin ajusta luego desde PlataformaPanel.
      modulos_activos: DEFAULT_MODULOS,
      escala: DEFAULT_ESCALA,
    });
    await writeAuditLog(ctx, newOrgId, "create_org", undefined, null, { nombre: args.nombre, slug: args.slug });
    return newOrgId;
  },
});

export const update = mutation({
  args: {
    id: v.id("organizaciones"),
    nombre: v.optional(v.string()),
    slug: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    contacto_email: v.optional(v.string()),
    contacto_telefono: v.optional(v.string()),
    logo_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const { id, ...updates } = args;
    if (updates.slug) {
      const existing = await ctx.db
        .query("organizaciones")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug!))
        .first();
      if (existing && existing._id !== id) {
        throw new Error(`Ya existe otra organización con slug "${updates.slug}"`);
      }
    }
    const before = await ctx.db.get(id);
    const beforeSubset: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      beforeSubset[key] = (before as any)?.[key] ?? null;
    }
    await ctx.db.patch(id, updates);
    await writeAuditLog(ctx, id, "update_org", undefined, beforeSubset, updates);
    return id;
  },
});

export const setActive = mutation({
  args: { id: v.id("organizaciones"), activo: v.boolean() },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const before = await ctx.db.get(args.id);
    await ctx.db.patch(args.id, { activo: args.activo });
    await writeAuditLog(ctx, args.id, "set_activo", "activo", before?.activo, args.activo);
    return args.id;
  },
});

// ============================================================
// Super-Admin Platform Panel — Billing/Plan management
// ============================================================

const BYTES_PER_GB = 1024 ** 3;
const DEFAULT_ESCALA: Escala = "S";
const DEFAULT_MODULOS: string[] = ["REC"];

// ---------- Helpers ----------
async function writeAuditLog(
  ctx: MutationCtx,
  orgId: Id<"organizaciones">,
  action: string,
  field: string | undefined,
  before: unknown,
  after: unknown,
  notas?: string,
): Promise<void> {
  const scope = await getAuthScope(ctx);
  await ctx.db.insert("org_audit_log", {
    organizacion_id: orgId,
    changed_by_user_id: scope.perfil?.userId ?? "system",
    changed_by_email: scope.perfil?.email,
    action,
    field,
    before_value: truncateAuditValue(before),
    after_value: truncateAuditValue(after),
    notas,
    timestamp: Date.now(),
  });
}

async function countOrgUsage(ctx: AnyCtx, orgId: Id<"organizaciones">) {
  // Camiones por org
  const camiones = await ctx.db
    .query("vehiculos")
    .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
    .collect();
  // Proyectos por org
  const proyectos = await ctx.db
    .query("proyectos")
    .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
    .collect();
  // Usuarios por org (activos)
  const usuarios = await ctx.db
    .query("perfiles_usuarios")
    .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
    .collect();
  const usuariosActivos = usuarios.filter((u) => u.activo !== false);
  return {
    camiones: camiones.length,
    proyectos: proyectos.length,
    usuarios: usuariosActivos.length,
  };
}

// ---------- getPlanConstants — fuente de verdad para el frontend ----------
// El drawer del super_admin tiene un mirror local de precios (ESCALA_BASE_USD +
// MODULOS_*); este query expone los valores backend para que el frontend pueda
// detectar drift (parity check en runtime). Único llamador esperado: PlataformaPanel.
export const getPlanConstants = query({
  args: {},
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin) return null;
    const escala_base_usd: Record<string, number> = {};
    for (const [k, v] of Object.entries(ESCALA_LIMITS)) {
      escala_base_usd[k] = v.base_usd;
    }
    const modulos = Object.values(MODULO_CATALOG).map((m) => ({
      code: m.codigo,
      name: m.nombre,
      price: m.precio_usd,
      estado: m.estado,
    }));
    return { escala_base_usd, modulos };
  },
});

// ---------- listWithStats — main panel feed ----------
export const listWithStats = query({
  args: {},
  handler: async (ctx) => {
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin) return [];
    const orgs = await ctx.db.query("organizaciones").collect();

    const results = [] as any[];
    for (const org of orgs) {
      const counts = await countOrgUsage(ctx, org._id);
      const escala: Escala = (org.escala as Escala) ?? DEFAULT_ESCALA;
      const modulos = org.modulos_activos ?? DEFAULT_MODULOS;
      const usage = buildUsageReport(escala, org.custom_caps as CustomCaps, {
        camiones: counts.camiones,
        proyectos: counts.proyectos,
        usuarios: counts.usuarios,
        storage_bytes: org.storage_bytes_used ?? 0,
      });
      const modulosUsd = sumModulosUsd(modulos);
      const mrr = calcMRR(escala, modulosUsd, usage.overflow_total_usd, org.discount_pct ?? 0);

      results.push({
        _id: org._id,
        nombre: org.nombre,
        slug: org.slug,
        logo_url: org.logo_url,
        activo: org.activo,
        fecha_creacion: org.fecha_creacion,
        escala,
        modulos_activos: modulos,
        custom_caps: org.custom_caps ?? null,
        discount_pct: org.discount_pct ?? 0,
        setup_status: org.setup_status ?? "pendiente",
        fecha_inicio_plan: org.fecha_inicio_plan ?? null,
        fecha_renovacion_plan: org.fecha_renovacion_plan ?? null,
        storage_bytes_used: org.storage_bytes_used ?? 0,
        storage_last_recompute: org.storage_last_recompute ?? null,
        // Usage
        usage,
        mrr_usd: mrr,
        modulos_usd: modulosUsd,
        base_usd: ESCALA_LIMITS[escala].base_usd,
      });
    }
    return results;
  },
});

// ---------- getOrgStats — single org detail ----------
export const getOrgStats = query({
  args: { id: v.id("organizaciones") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const org = await ctx.db.get(args.id);
    if (!org) return null;
    const counts = await countOrgUsage(ctx, args.id);
    const escala: Escala = (org.escala as Escala) ?? DEFAULT_ESCALA;
    const modulos = org.modulos_activos ?? DEFAULT_MODULOS;
    const usage = buildUsageReport(escala, org.custom_caps as CustomCaps, {
      camiones: counts.camiones,
      proyectos: counts.proyectos,
      usuarios: counts.usuarios,
      storage_bytes: org.storage_bytes_used ?? 0,
    });
    const modulosUsd = sumModulosUsd(modulos);
    const mrr = calcMRR(escala, modulosUsd, usage.overflow_total_usd, org.discount_pct ?? 0);

    const auditLog = await ctx.db
      .query("org_audit_log")
      .withIndex("by_org_timestamp", (q) => q.eq("organizacion_id", args.id))
      .order("desc")
      .take(50);

    return {
      org,
      usage,
      counts,
      mrr_usd: mrr,
      modulos_usd: modulosUsd,
      base_usd: ESCALA_LIMITS[escala].base_usd,
      escala_effective: escala,
      modulos_effective: modulos,
      audit_log: auditLog,
    };
  },
});

// ---------- setEscala ----------
export const setEscala = mutation({
  args: {
    id: v.id("organizaciones"),
    escala: v.union(
      v.literal("S"),
      v.literal("M"),
      v.literal("L"),
      v.literal("XL"),
      v.literal("XXL"),
    ),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const org = await ctx.db.get(args.id);
    if (!org) throw new Error("Organización no encontrada");
    const before = org.escala ?? null;

    // Warning si downgrade deja la org en overflow.
    // No bloqueamos — registramos en audit log con notas explícitas o auto-flag.
    let effectiveNotas = args.notas;
    const escalaOrder: Escala[] = ["S", "M", "L", "XL", "XXL"];
    const beforeIdx = before ? escalaOrder.indexOf(before as Escala) : -1;
    const afterIdx = escalaOrder.indexOf(args.escala);
    if (beforeIdx >= 0 && afterIdx >= 0 && afterIdx < beforeIdx) {
      const counts = await countOrgUsage(ctx, args.id);
      const usage = buildUsageReport(args.escala, org.custom_caps as CustomCaps, {
        camiones: counts.camiones,
        proyectos: counts.proyectos,
        usuarios: counts.usuarios,
        storage_bytes: org.storage_bytes_used ?? 0,
      });
      if (usage.overflow_total_usd > 0 && (!args.notas || args.notas.trim().length === 0)) {
        effectiveNotas =
          `[AUTO] Downgrade ${before}→${args.escala} dejó la org en overflow ($${usage.overflow_total_usd}/mes); ` +
          `super_admin no proporcionó justificación al ejecutar el cambio.`;
      }
    }

    await ctx.db.patch(args.id, { escala: args.escala });
    await writeAuditLog(ctx, args.id, "set_escala", "escala", before, args.escala, effectiveNotas);
    return args.id;
  },
});

// ---------- toggleModulo ----------
export const toggleModulo = mutation({
  args: {
    id: v.id("organizaciones"),
    codigo: v.string(),
    activar: v.boolean(),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    if (!isValidModuloCodigo(args.codigo)) {
      throw new Error(`Código de módulo inválido: ${args.codigo}`);
    }
    const org = await ctx.db.get(args.id);
    if (!org) throw new Error("Organización no encontrada");
    const spec = MODULO_CATALOG[args.codigo];
    const discount = org.discount_pct ?? 0;

    // Activar módulo roadmap requiere notas + descuento ≥30% (anti-overcommit comercial).
    // Setup waived → permitido sin descuento (caso pilot/contrato especial).
    if (args.activar && spec.estado === "roadmap") {
      if (!args.notas || args.notas.trim().length === 0) {
        throw new Error(
          `Módulo "${spec.nombre}" está en roadmap (no construido). ` +
          `Activá solo con contrato firmado + descuento 30%. Agregá notas con el motivo.`,
        );
      }
      const setupWaived = org.setup_status === "waived";
      if (discount < 30 && !setupWaived) {
        throw new Error(
          `Módulo "${spec.nombre}" (roadmap) requiere descuento ≥30% o setup_status="waived". ` +
          `Org tiene descuento ${discount}% y setup="${org.setup_status ?? "pendiente"}".`,
        );
      }
    }

    const before = org.modulos_activos ?? [];
    const set = new Set(before);
    if (args.activar) set.add(args.codigo);
    else set.delete(args.codigo);

    // PER ya no es módulo comprable (bundled con ops). Solo PER-full/RRHH son exclusivos.
    if (args.activar && args.codigo === "RRHH") { set.delete("PER-full"); }
    if (args.activar && args.codigo === "PER-full") { set.delete("RRHH"); }

    // Una org puede quedar con cero módulos: en ese caso solo conserva GPS +
    // mapa de vehículos (base, no gated). Útil para clientes que solo quieren
    // tracking sin operaciones. Frontend honra el estado vacío literal.

    const after = Array.from(set);
    await ctx.db.patch(args.id, { modulos_activos: after });
    await writeAuditLog(
      ctx,
      args.id,
      "toggle_modulo",
      `modulos_activos:${args.codigo}`,
      before,
      after,
      args.notas,
    );
    return args.id;
  },
});

// ---------- setCustomCap ----------
export const setCustomCap = mutation({
  args: {
    id: v.id("organizaciones"),
    key: v.union(
      v.literal("camiones"),
      v.literal("proyectos"),
      v.literal("usuarios"),
      v.literal("storage_gb"),
    ),
    value: v.optional(v.number()), // undefined = clear override
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const org = await ctx.db.get(args.id);
    if (!org) throw new Error("Organización no encontrada");
    const before = org.custom_caps ?? {};
    const next: any = { ...before };
    let effectiveNotas = args.notas;

    if (args.value === undefined || args.value === null) {
      delete next[args.key];
    } else {
      if (!Number.isFinite(args.value)) throw new Error("Cap debe ser un número");
      if (args.value < 0) throw new Error("Cap no puede ser negativo");
      // Upper sanity check para evitar valores absurdos.
      const MAX_CAPS = {
        camiones: 10_000,
        proyectos: 100_000,
        usuarios: 10_000,
        storage_gb: 10_240, // 10 TB
      };
      const max = MAX_CAPS[args.key];
      if (args.value > max) {
        throw new Error(`Cap ${args.key} excede el máximo permitido (${max.toLocaleString()})`);
      }

      // Warning si el nuevo cap queda por debajo del uso actual (lock en overflow).
      const counts = await countOrgUsage(ctx, args.id);
      const currentForKey =
        args.key === "camiones"
          ? counts.camiones
          : args.key === "proyectos"
            ? counts.proyectos
            : args.key === "usuarios"
              ? counts.usuarios
              : Math.floor((org.storage_bytes_used ?? 0) / BYTES_PER_GB);
      if (args.value < currentForKey) {
        const warn =
          `[AUTO] Cap ${args.key}=${args.value} queda por debajo del uso actual (${currentForKey}); ` +
          `la org permanecerá en overflow hasta liberar recursos o subir el cap.`;
        effectiveNotas = args.notas
          ? `${args.notas} | ${warn}`
          : warn;
      }
      next[args.key] = args.value;
    }
    await ctx.db.patch(args.id, { custom_caps: next });
    await writeAuditLog(
      ctx,
      args.id,
      "set_custom_cap",
      `custom_caps.${args.key}`,
      (before as any)[args.key] ?? null,
      args.value ?? null,
      effectiveNotas,
    );
    return args.id;
  },
});

// ---------- setDiscount ----------
export const setDiscount = mutation({
  args: {
    id: v.id("organizaciones"),
    pct: v.number(),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    if (!Number.isFinite(args.pct) || !Number.isInteger(args.pct)) {
      throw new Error("discount_pct debe ser entero");
    }
    if (args.pct < 0 || args.pct > 15) {
      throw new Error("discount_pct debe estar entre 0 y 15");
    }
    const org = await ctx.db.get(args.id);
    if (!org) throw new Error("Organización no encontrada");
    const before = org.discount_pct ?? 0;
    await ctx.db.patch(args.id, { discount_pct: args.pct });
    await writeAuditLog(ctx, args.id, "set_discount", "discount_pct", before, args.pct, args.notas);
    return args.id;
  },
});

// ---------- setSetupStatus ----------
export const setSetupStatus = mutation({
  args: {
    id: v.id("organizaciones"),
    status: v.union(
      v.literal("pendiente"),
      v.literal("pagado"),
      v.literal("waived"),
    ),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const org = await ctx.db.get(args.id);
    if (!org) throw new Error("Organización no encontrada");
    const before = org.setup_status ?? "pendiente";
    await ctx.db.patch(args.id, { setup_status: args.status });
    await writeAuditLog(
      ctx,
      args.id,
      "set_setup_status",
      "setup_status",
      before,
      args.status,
      args.notas,
    );
    return args.id;
  },
});

// ---------- setPlanFechas ----------
export const setPlanFechas = mutation({
  args: {
    id: v.id("organizaciones"),
    fecha_inicio_plan: v.optional(v.number()),
    fecha_renovacion_plan: v.optional(v.number()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const org = await ctx.db.get(args.id);
    if (!org) throw new Error("Organización no encontrada");

    if (args.fecha_inicio_plan !== undefined) {
      assertSaneEpochMs(args.fecha_inicio_plan, "fecha_inicio_plan");
    }
    if (args.fecha_renovacion_plan !== undefined) {
      assertSaneEpochMs(args.fecha_renovacion_plan, "fecha_renovacion_plan");
    }
    // Cross-field: renovación debe ser posterior a inicio (si ambas presentes).
    const nextInicio = args.fecha_inicio_plan ?? org.fecha_inicio_plan ?? null;
    const nextRenov = args.fecha_renovacion_plan ?? org.fecha_renovacion_plan ?? null;
    if (nextInicio !== null && nextRenov !== null && nextRenov <= nextInicio) {
      throw new Error(
        "fecha_renovacion_plan debe ser posterior a fecha_inicio_plan",
      );
    }

    const before = {
      fecha_inicio_plan: org.fecha_inicio_plan ?? null,
      fecha_renovacion_plan: org.fecha_renovacion_plan ?? null,
    };
    const patch: any = {};
    if (args.fecha_inicio_plan !== undefined) patch.fecha_inicio_plan = args.fecha_inicio_plan;
    if (args.fecha_renovacion_plan !== undefined) patch.fecha_renovacion_plan = args.fecha_renovacion_plan;
    await ctx.db.patch(args.id, patch);
    await writeAuditLog(ctx, args.id, "set_plan_fechas", undefined, before, patch, args.notas);
    return args.id;
  },
});

// ---------- recomputeStorage ----------
// Re-suma todos los file_size de las 3 tablas de fotos para esta org.
// Útil para detectar/corregir drift del counter delta.
// Paginated: limita lookup a MAX_PHOTOS_PER_TABLE para evitar timeout.
// Si org tiene >5000 fotos en una tabla, el resultado será parcial — re-correr o
// usar migrations/seed_plan_fields.backfillStorageCounters con batchSize mayor.
const MAX_PHOTOS_PER_TABLE = 5000;
const MAX_PARENTS_PER_QUERY = 2000;

// Photo-counting helper compartido entre la mutation pública y el cron diario.
async function computeOrgStorageBytes(
  ctx: MutationCtx,
  orgId: Id<"organizaciones">,
): Promise<{
  total: number;
  partial: boolean;
  counts: { cleaning: number; fumi: number; mto: number };
}> {
  let total = 0;
  let partial = false;
  let cleaning = 0;
  let fumi = 0;
  let mto = 0;

  const cleaningAssignments = await ctx.db
    .query("cleaning_assignments")
    .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
    .take(MAX_PARENTS_PER_QUERY);
  if (cleaningAssignments.length >= MAX_PARENTS_PER_QUERY) partial = true;
  for (const a of cleaningAssignments) {
    if (cleaning >= MAX_PHOTOS_PER_TABLE) { partial = true; break; }
    const photos = await ctx.db
      .query("cleaning_photos")
      .withIndex("by_assignment", (q) => q.eq("assignment_id", a._id))
      .take(MAX_PHOTOS_PER_TABLE - cleaning);
    for (const p of photos) {
      total += p.file_size ?? 0;
      cleaning++;
    }
  }

  const fumiAssignments = await ctx.db
    .query("fumigation_assignments")
    .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
    .take(MAX_PARENTS_PER_QUERY);
  if (fumiAssignments.length >= MAX_PARENTS_PER_QUERY) partial = true;
  for (const a of fumiAssignments) {
    if (fumi >= MAX_PHOTOS_PER_TABLE) { partial = true; break; }
    const photos = await ctx.db
      .query("fumigation_photos")
      .withIndex("by_assignment", (q) => q.eq("assignment_id", a._id))
      .take(MAX_PHOTOS_PER_TABLE - fumi);
    for (const p of photos) {
      total += p.file_size ?? 0;
      fumi++;
    }
  }

  const vehiculos = await ctx.db
    .query("vehiculos")
    .withIndex("by_organizacion", (q) => q.eq("organizacion_id", orgId))
    .take(MAX_PARENTS_PER_QUERY);
  if (vehiculos.length >= MAX_PARENTS_PER_QUERY) partial = true;
  outerMto: for (const veh of vehiculos) {
    const tasks = await ctx.db
      .query("maintenance_tasks")
      .withIndex("by_vehiculo", (q) => q.eq("vehiculo_id", veh._id))
      .take(MAX_PARENTS_PER_QUERY);
    for (const t of tasks) {
      if (mto >= MAX_PHOTOS_PER_TABLE) { partial = true; break outerMto; }
      const photos = await ctx.db
        .query("maintenance_photos")
        .withIndex("by_task", (q) => q.eq("task_id", t._id))
        .take(MAX_PHOTOS_PER_TABLE - mto);
      for (const p of photos) {
        total += p.file_size ?? 0;
        mto++;
      }
    }
  }

  return { total, partial, counts: { cleaning, fumi, mto } };
}

export const recomputeStorage = mutation({
  args: { id: v.id("organizaciones") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const org = await ctx.db.get(args.id);
    if (!org) throw new Error("Organización no encontrada");

    const { total, partial, counts } = await computeOrgStorageBytes(ctx, args.id);
    const before = org.storage_bytes_used ?? 0;
    const now = Date.now();

    // Si el conteo es parcial (algún límite de paginación se golpeó), NO sobreescribimos
    // storage_bytes_used — sería un falso negativo que envenena el audit log y rompe
    // el contador delta. Sí registramos un audit entry con el flag partial=true para
    // que el operador sepa que tiene que re-correr con batchSize mayor.
    if (partial) {
      await writeAuditLog(
        ctx,
        args.id,
        "recompute_storage_partial",
        "storage_bytes_used",
        before,
        { partial: true, partial_total: total, ...counts },
        "[AUTO] Recompute parcial — límite de paginación alcanzado; storage_bytes_used NO actualizado.",
      );
      return {
        before,
        after: null as number | null,
        drift: 0,
        timestamp: now,
        partial: true,
        photo_counts: counts,
      };
    }

    await ctx.db.patch(args.id, {
      storage_bytes_used: total,
      storage_last_recompute: now,
    });
    await writeAuditLog(
      ctx,
      args.id,
      "recompute_storage",
      "storage_bytes_used",
      before,
      { total, partial: false, ...counts },
    );
    return {
      before,
      after: total,
      drift: total - before,
      timestamp: now,
      partial: false,
      photo_counts: counts,
    };
  },
});

// ---------- recomputeStorageDaily (internal cron) ----------
// Cron diario que selecciona las orgs con `storage_last_recompute` más viejo y
// re-suma su storage. Para evitar timeout del mutation runtime (~8s), procesa
// hasta CHUNK orgs por ejecución y se re-agenda a sí mismo si quedan más
// pendientes. Resultados parciales NO se persisten (igual que la versión pública).
const RECOMPUTE_CHUNK = 5;
const RECOMPUTE_STALE_MS = 6 * 60 * 60 * 1000; // 6h — solo recomputa si pasó tiempo
export const recomputeStorageDaily = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db
      .query("organizaciones")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
    const now = Date.now();
    // Ordenar por staleness: orgs sin recompute primero, luego las más viejas.
    const candidates = orgs
      .map((o) => ({ id: o._id, last: o.storage_last_recompute ?? 0 }))
      .filter((c) => now - c.last > RECOMPUTE_STALE_MS)
      .sort((a, b) => a.last - b.last)
      .slice(0, RECOMPUTE_CHUNK);

    let processed = 0;
    let partials = 0;
    for (const { id } of candidates) {
      const org = await ctx.db.get(id);
      if (!org) continue;
      const { total, partial } = await computeOrgStorageBytes(ctx, id);
      if (partial) {
        partials++;
        continue; // No persistir parciales — el operador re-corre manualmente.
      }
      await ctx.db.patch(id, {
        storage_bytes_used: total,
        storage_last_recompute: now,
      });
    }
    processed = candidates.length;

    // Si quedan orgs stale más allá del chunk, re-agendar para procesar otra tanda
    // dentro de 60s (suma de chunks hasta vaciar la cola).
    const remaining = orgs.filter(
      (o) => now - (o.storage_last_recompute ?? 0) > RECOMPUTE_STALE_MS,
    ).length - processed;
    if (remaining > 0) {
      await ctx.scheduler.runAfter(60 * 1000, internal.organizaciones.recomputeStorageDaily, {});
    }

    return { processed, partials, remaining };
  },
});

// ---------- Helper export: increment/decrement counter from other modules ----------
// Used by cleaning.ts, fumigaciones.ts, maintenance.ts photo mutations.
export async function incrementOrgStorage(
  ctx: MutationCtx,
  orgId: Id<"organizaciones"> | null | undefined,
  deltaBytes: number,
): Promise<void> {
  if (!orgId || !deltaBytes) return;
  const org = await ctx.db.get(orgId);
  if (!org) return;
  const current = (org.storage_bytes_used as number | undefined) ?? 0;
  const next = Math.max(0, current + deltaBytes);
  await ctx.db.patch(orgId, { storage_bytes_used: next });
}
