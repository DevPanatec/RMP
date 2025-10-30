import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all active employees
export const listActive = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("empleados")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
  },
});

// List all employees
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("empleados").collect();
  },
});

// Get by cedula
export const getByCedula = query({
  args: { cedula: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("empleados")
      .withIndex("by_cedula", (q) => q.eq("cedula", args.cedula))
      .first();
  },
});

// Get by ID
export const getById = query({
  args: { id: v.id("empleados") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Add employee
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("empleados", {
      ...args,
      activo: true,
    });
  },
});

// Update employee
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
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

// Deactivate employee (soft delete)
export const deactivate = mutation({
  args: { id: v.id("empleados") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { activo: false });
  },
});

// Activate employee
export const activate = mutation({
  args: { id: v.id("empleados") },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { activo: true });
  },
});

// Get stats
export const getStats = query({
  handler: async (ctx) => {
    const empleados = await ctx.db.query("empleados").collect();
    const activos = empleados.filter(e => e.activo).length;

    return {
      total: empleados.length,
      activos,
      inactivos: empleados.length - activos,
    };
  },
});
