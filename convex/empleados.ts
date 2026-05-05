import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthScope, requireOrgAccess } from "./lib/auth";

// Filtra empleados por scope: super_admin/cross-org ve todos; demás solo su org.
async function scopeEmpleados(ctx: any, rows: any[]) {
  const scope = await getAuthScope(ctx);
  if (scope.isSuperAdmin || scope.isCrossOrgViewer) return rows;
  if (!scope.organizacionId) return [];
  return rows.filter((e) => !e.organizacion_id || e.organizacion_id === scope.organizacionId);
}

// List all active employees (scoped)
export const listActive = query({
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("empleados")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
    return await scopeEmpleados(ctx, rows);
  },
});

// List all employees (scoped)
export const list = query({
  handler: async (ctx) => {
    const rows = await ctx.db.query("empleados").collect();
    return await scopeEmpleados(ctx, rows);
  },
});

// Get by cedula (scoped)
export const getByCedula = query({
  args: { cedula: v.string() },
  handler: async (ctx, args) => {
    const emp = await ctx.db
      .query("empleados")
      .withIndex("by_cedula", (q) => q.eq("cedula", args.cedula))
      .first();
    if (!emp) return null;
    const scope = await getAuthScope(ctx);
    if (scope.isSuperAdmin || scope.isCrossOrgViewer) return emp;
    if (emp.organizacion_id && scope.organizacionId && emp.organizacion_id !== scope.organizacionId) return null;
    return emp;
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
    if (emp.organizacion_id && scope.organizacionId && emp.organizacion_id !== scope.organizacionId) return null;
    return emp;
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
    const scope = await getAuthScope(ctx);
    const orgId = args.organizacion_id ?? scope.organizacionId ?? undefined;
    if (orgId) await requireOrgAccess(ctx, orgId);
    const data: any = { ...args, activo: true };
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
    const emp = await ctx.db.get(args.id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (emp.organizacion_id) await requireOrgAccess(ctx, emp.organizacion_id);
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

// Deactivate employee (soft delete)
export const deactivate = mutation({
  args: { id: v.id("empleados") },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (emp.organizacion_id) await requireOrgAccess(ctx, emp.organizacion_id);
    return await ctx.db.patch(args.id, { activo: false });
  },
});

// Activate employee
export const activate = mutation({
  args: { id: v.id("empleados") },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (emp.organizacion_id) await requireOrgAccess(ctx, emp.organizacion_id);
    return await ctx.db.patch(args.id, { activo: true });
  },
});

// Remove employee (hard delete)
export const remove = mutation({
  args: { id: v.id("empleados") },
  handler: async (ctx, args) => {
    const emp = await ctx.db.get(args.id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (emp.organizacion_id) await requireOrgAccess(ctx, emp.organizacion_id);
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
