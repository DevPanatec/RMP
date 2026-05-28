import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess, requireProjectAccess, requireWriteRole, requireAdminWrite } from "./lib/auth";
import { requireModulo } from "./lib/modules";

// Filtra empleados por scope: super_admin/cross-org ve todos; demás solo su org.
async function scopeEmpleados(ctx: any, rows: any[]) {
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin || scope.isCrossOrgViewer) return rows;
  if (!scope.organizacionId) return [];
  return rows.filter((e) => e.organizacion_id === scope.organizacionId);
}

// Strip PII según role del caller. salario solo super_admin. documento solo super_admin/admin.
// enterprise/viewer/conductor ven solo campos operativos no sensibles.
function stripPII(rows: any[], scope: { isSuperAdmin: boolean; isAdmin: boolean }) {
  return rows.map((e) => {
    const base: any = {
      _id: e._id,
      _creationTime: e._creationTime,
      nombre: e.nombre,
      apellido: e.apellido,
      cargo: e.cargo,
      departamento: e.departamento,
      fecha_ingreso: e.fecha_ingreso,
      activo: e.activo,
      organizacion_id: e.organizacion_id,
      proyecto_id: e.proyecto_id,
      // ASI flags — no son PII, útiles pa' UI
      tiene_facial: e.tiene_facial ?? false,
      puede_marcar: e.puede_marcar ?? true,
    };
    if (scope.isSuperAdmin || scope.isAdmin) {
      base.cedula = e.cedula;
      base.telefono = e.telefono;
      base.fecha_nacimiento = e.fecha_nacimiento;
      base.direccion = e.direccion;
      // Solo admins ven si el empleado tiene PIN configurado
      base.tiene_pin = !!e.pin_hash;
    }
    // Salario visible a super_admin Y admin de la org (necesario pa' módulo RRHH).
    // Enterprise/viewer/conductor NO ven monto.
    if (scope.isSuperAdmin || scope.isAdmin) {
      base.salario = e.salario;
    }
    return base;
  });
}

// List all active employees (scoped + PII-stripped)
export const listActive = query({
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("empleados")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
    const scoped = await scopeEmpleados(ctx, rows);
    const scope = await getAuthScope(ctx);
    return stripPII(scoped, scope);
  },
});

// List all employees (scoped + PII-stripped)
export const list = query({
  handler: async (ctx) => {
    const rows = await ctx.db.query("empleados").collect();
    const scoped = await scopeEmpleados(ctx, rows);
    const scope = await getAuthScope(ctx);
    return stripPII(scoped, scope);
  },
});

// Get by cedula (scoped + PII stripped)
export const getByCedula = query({
  args: { cedula: v.string() },
  handler: async (ctx, args) => {
    const emp = await ctx.db
      .query("empleados")
      .withIndex("by_cedula", (q) => q.eq("cedula", args.cedula))
      .first();
    if (!emp) return null;
    const scope = await getAuthScope(ctx);
    if (!scope.isSuperAdmin && !scope.isCrossOrgViewer) {
      if (!scope.organizacionId) return null;
      if (emp.organizacion_id !== scope.organizacionId) return null;
    }
    return stripPII([emp], scope)[0];
  },
});

// Get by ID (scoped)
export const getById = query({
  args: { id: v.id("empleados") },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.id);
    if (!emp) return null;
    const scope = await getAuthScope(ctx);
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return emp;
    if (!scope.organizacionId) return null;
    if (emp.organizacion_id !== scope.organizacionId) return null;
    return stripPII([emp], scope)[0];
  },
});

// Add employee (scoped: hereda org del perfil del caller)
export const add = mutation({
  args: {
    nombre: v.string(),
    apellido: v.string(),
    cedula: v.string(),
    telefono: v.optional(v.string()),
    fecha_nacimiento: v.optional(v.string()),
    direccion: v.optional(v.string()),
    cargo: v.optional(v.string()),
    salario: v.optional(v.number()),
    departamento: v.optional(v.string()),
    fecha_ingreso: v.optional(v.string()),
    organizacion_id: v.optional(v.id("organizaciones")),
    proyecto_id: v.optional(v.id("proyectos")),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "PER");
    const scope = await getAuthScope(ctx);
    let orgId: any = args.organizacion_id ?? scope.organizacionId ?? undefined;
    if (!orgId && args.proyecto_id) {
      const p = await ctx.db.get(args.proyecto_id);
      orgId = p?.organizacion_id ?? undefined;
    }
    if (!orgId && !scope.isSuperAdmin) {
      throw new Error("No se puede crear empleado sin organización");
    }
    if (orgId) await requireOrgAccess(ctx, orgId);
    if (args.proyecto_id) await requireProjectAccess(ctx, args.proyecto_id);

    // Cedula uniqueness scope a la org. Si super_admin sin orgId explícito, no enforce
    // (puede crear mismo empleado en otra org — caso multi-tenant).
    const cedulaTrim = args.cedula?.trim();
    if (cedulaTrim && orgId) {
      const existing = await ctx.db
        .query("empleados")
        .withIndex("by_cedula", (q) => q.eq("cedula", cedulaTrim))
        .first();
      if (existing && existing.organizacion_id === orgId) {
        throw new Error(`Cédula ${cedulaTrim} ya registrada en esta organización`);
      }
    }

    const data: any = { ...args, cedula: cedulaTrim, activo: true };
    if (orgId) data.organizacion_id = orgId;
    return await ctx.db.insert("empleados", data);
  },
});

// Update employee (require org access)
export const update = mutation({
  args: {
    id: v.id("empleados"),
    nombre: v.optional(v.string()),
    apellido: v.optional(v.string()),
    telefono: v.optional(v.string()),
    direccion: v.optional(v.string()),
    cargo: v.optional(v.string()),
    salario: v.optional(v.number()),
    departamento: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "PER");
    const emp = await ctx.db.get(args.id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización — requiere migración");
    await requireOrgAccess(ctx, emp.organizacion_id);
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

// Deactivate employee (soft delete)
export const deactivate = mutation({
  args: { id: v.id("empleados") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "PER");
    const emp = await ctx.db.get(args.id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización — requiere migración");
    await requireOrgAccess(ctx, emp.organizacion_id);
    return await ctx.db.patch(args.id, { activo: false });
  },
});

// Activate employee
export const activate = mutation({
  args: { id: v.id("empleados") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "PER");
    const emp = await ctx.db.get(args.id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización — requiere migración");
    await requireOrgAccess(ctx, emp.organizacion_id);
    return await ctx.db.patch(args.id, { activo: true });
  },
});

// Remove employee (hard delete)
export const remove = mutation({
  args: { id: v.id("empleados") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "PER");
    const emp = await ctx.db.get(args.id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización — requiere migración");
    await requireOrgAccess(ctx, emp.organizacion_id);
    return await ctx.db.delete(args.id);
  },
});

// Get stats (scoped per org)
export const getStats = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("empleados").collect();
    const empleados = await scopeEmpleados(ctx, all);
    const activos = empleados.filter((e) => e.activo).length;

    return {
      total: empleados.length,
      activos,
      inactivos: empleados.length - activos,
    };
  },
});

// One-shot: backfill organizacion_id en empleados huérfanos (pre-multi-tenant).
// Resuelve org del empleado en orden:
//   1) proyecto_id.organizacion_id (si tiene proyecto)
//   2) default_org_id (argumento explícito de super_admin)
//   3) sola org del sistema (si hay 1 sola)
// Si nada matchea → skipped.
//
// Auth: solo super_admin (puede tocar empleados de cualquier org).
export const _migrationBackfillOrganizacionId = mutation({
  args: { default_org_id: v.optional(v.id("organizaciones")) },
  handler: async (ctx, args) => {
    const { requireSuperAdmin } = await import("./lib/auth");
    await requireSuperAdmin(ctx);

    const orgs = await ctx.db.query("organizaciones").collect();
    const defaultOrgId = args.default_org_id ?? (orgs.length === 1 ? orgs[0]._id : null);

    const empleados = await ctx.db.query("empleados").collect();
    let fixed = 0;
    let skipped = 0;
    for (const e of empleados) {
      if (e.organizacion_id != null) continue;
      let orgId = null;
      if (e.proyecto_id) {
        const p = await ctx.db.get(e.proyecto_id);
        orgId = p?.organizacion_id ?? null;
      }
      if (!orgId) orgId = defaultOrgId;
      if (!orgId) {
        skipped++;
        continue;
      }
      await ctx.db.patch(e._id, { organizacion_id: orgId });
      fixed++;
    }
    return { fixed, skipped, total: empleados.length };
  },
});

