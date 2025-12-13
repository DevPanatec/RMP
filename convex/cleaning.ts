import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ========== SALAS ==========
export const listSalas = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("salas")
      .withIndex("by_activo", (q) => q.eq("activo", true))
      .collect();
  },
});

export const addSala = mutation({
  args: {
    nombre: v.string(),
    descripcion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("salas", {
      ...args,
      activo: true,
    });
  },
});

// ========== AREAS ==========
export const listAreas = query({
  handler: async (ctx) => {
    return await ctx.db.query("areas").collect();
  },
});

export const getAreasBySala = query({
  args: { sala_id: v.id("salas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("areas")
      .withIndex("by_sala", (q) => q.eq("sala_id", args.sala_id))
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

export const addArea = mutation({
  args: {
    sala_id: v.id("salas"),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("areas", {
      ...args,
      activo: true,
    });
  },
});

// ========== CLEANING ASSIGNMENTS ==========
export const listAssignments = query({
  handler: async (ctx) => {
    return await ctx.db.query("cleaning_assignments").collect();
  },
});

export const getAssignmentsByFecha = query({
  args: { fecha: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cleaning_assignments")
      .withIndex("by_fecha", (q) => q.eq("fecha", args.fecha))
      .collect();
  },
});

export const getAssignmentsByEstado = query({
  args: { estado: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cleaning_assignments")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
  },
});

export const addAssignment = mutation({
  args: {
    sala_id: v.id("salas"),
    area_id: v.id("areas"),
    fecha: v.string(),
    hora: v.string(),
    notas: v.optional(v.string()),
    created_by: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cleaning_assignments", {
      ...args,
      estado: "pendiente",
    });
  },
});

export const updateAssignment = mutation({
  args: {
    id: v.id("cleaning_assignments"),
    estado: v.optional(v.string()),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const deleteAssignment = mutation({
  args: { id: v.id("cleaning_assignments") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.id);
  },
});

// ========== CLEANING PHOTOS ==========
export const getPhotosByAssignment = query({
  args: { assignment_id: v.id("cleaning_assignments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cleaning_photos")
      .withIndex("by_assignment", (q) => q.eq("assignment_id", args.assignment_id))
      .collect();
  },
});

export const addPhoto = mutation({
  args: {
    assignment_id: v.id("cleaning_assignments"),
    etapa: v.string(),
    storage_id: v.id("_storage"),
    file_name: v.string(),
    file_size: v.optional(v.number()),
    mime_type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cleaning_photos", args);
  },
});
