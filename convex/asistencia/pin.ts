// Asistencia — PIN management (set, change, verify).
// Módulo: ASI

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { getAuthScope, requireOrgAccess, requireAdminWrite } from "../lib/auth";
import { requireModulo } from "../lib/modules";

const BCRYPT_COST = 8; // 8 = ~50ms en hardware típico. Suficiente pa' PIN de 4 dígitos.
const PIN_LENGTH = 4;

// Admin asigna PIN inicial al empleado.
export const setPin = mutation({
  args: {
    empleado_id: v.id("empleados"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    validatePin(args.pin);
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización");
    await requireOrgAccess(ctx, emp.organizacion_id);
    const hash = bcrypt.hashSync(args.pin, BCRYPT_COST);
    await ctx.db.patch(args.empleado_id, {
      pin_hash: hash,
      pin_actualizado: Date.now(),
      pin_intentos_fallidos: 0,
      pin_bloqueado_hasta: undefined,
    });
    return true;
  },
});

// Empleado cambia su propio PIN (requiere PIN actual + nuevo).
// NO se expone en Fase 1 al kiosko (no hay UI de cambio aún) — pa' uso futuro.
export const changePin = mutation({
  args: {
    empleado_id: v.id("empleados"),
    pin_actual: v.string(),
    pin_nuevo: v.string(),
  },
  handler: async (ctx, args) => {
    // Permite admin OR empleado validando con PIN actual
    const scope = await getAuthScope(ctx);
    const isAdmin = scope.isSuperAdmin || scope.isAdmin;
    await requireModulo(ctx, "ASI");
    validatePin(args.pin_nuevo);
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización");
    await requireOrgAccess(ctx, emp.organizacion_id);
    if (!isAdmin) {
      if (!emp.pin_hash) throw new Error("Sin PIN configurado");
      const ok = bcrypt.compareSync(args.pin_actual, emp.pin_hash);
      if (!ok) throw new Error("PIN actual incorrecto");
    }
    const hash = bcrypt.hashSync(args.pin_nuevo, BCRYPT_COST);
    await ctx.db.patch(args.empleado_id, {
      pin_hash: hash,
      pin_actualizado: Date.now(),
      pin_intentos_fallidos: 0,
      pin_bloqueado_hasta: undefined,
    });
    return true;
  },
});

export const clearLockout = mutation({
  args: { empleado_id: v.id("empleados") },
  handler: async (ctx, args) => {
    await requireAdminWrite(ctx);
    await requireModulo(ctx, "ASI");
    const emp = await ctx.db.get(args.empleado_id);
    if (!emp) throw new Error("Empleado no encontrado");
    if (!emp.organizacion_id) throw new Error("Empleado sin organización");
    await requireOrgAccess(ctx, emp.organizacion_id);
    await ctx.db.patch(args.empleado_id, {
      pin_intentos_fallidos: 0,
      pin_bloqueado_hasta: undefined,
    });
    return true;
  },
});

// ─── Helpers ────────────────────────────────────────────────────────

function validatePin(pin: string) {
  if (typeof pin !== "string") throw new Error("PIN debe ser string");
  if (pin.length !== PIN_LENGTH) throw new Error(`PIN debe tener ${PIN_LENGTH} dígitos`);
  if (!/^\d+$/.test(pin)) throw new Error("PIN debe ser solo dígitos");
}
