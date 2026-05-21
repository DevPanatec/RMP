// Pricing model lookup tables + helpers.
// Fuente: propuestas/RMP_FINDINGS.html + RMP_INTERNO_PRICING.html

export type Escala = "S" | "M" | "L" | "XL" | "XXL";

export interface EscalaLimits {
  camiones: number;
  proyectos: number;
  usuarios: number;
  storage_gb: number;
  gps_dias: number;
  base_usd: number;
  setup_usd: number;
}

export const ESCALA_LIMITS: Record<Escala, EscalaLimits> = {
  S:   { camiones: 5,        proyectos: 20,        usuarios: 5,        storage_gb: 2,    gps_dias: 60,       base_usd: 299,   setup_usd: 200 },
  M:   { camiones: 15,       proyectos: 75,        usuarios: 15,       storage_gb: 10,   gps_dias: 90,       base_usd: 1199,  setup_usd: 500 },
  L:   { camiones: 35,       proyectos: 250,       usuarios: 30,       storage_gb: 50,   gps_dias: 180,      base_usd: 2499,  setup_usd: 1200 },
  XL:  { camiones: 100,      proyectos: 1000,      usuarios: 100,      storage_gb: 250,  gps_dias: 365,      base_usd: 4499,  setup_usd: 2500 },
  XXL: { camiones: Infinity, proyectos: Infinity,  usuarios: Infinity, storage_gb: 1024, gps_dias: Infinity, base_usd: 8999,  setup_usd: 4500 },
};

// Overflow rates per escala — calibrated to upgrade delta (FINDINGS sec. Overflow)
// Tier 1 = first 3 extras; Tier 2 = next 5 (4-8); hard cap = +8 universal.
export interface OverflowRow {
  tier1_per_unit: number;
  tier2_per_unit: number;
  hard_cap_extras: number; // total extras allowed before forcing upgrade
}

export const OVERFLOW_CAMIONES: Record<Exclude<Escala, "XXL">, OverflowRow> = {
  S:  { tier1_per_unit: 30,  tier2_per_unit: 160, hard_cap_extras: 8 },
  M:  { tier1_per_unit: 50,  tier2_per_unit: 230, hard_cap_extras: 8 },
  L:  { tier1_per_unit: 80,  tier2_per_unit: 360, hard_cap_extras: 8 },
  XL: { tier1_per_unit: 120, tier2_per_unit: 850, hard_cap_extras: 8 },
};

// Proyectos + usuarios overflow is universal (same rate all escalas)
export const OVERFLOW_PROYECTOS: OverflowRow = { tier1_per_unit: 5,  tier2_per_unit: 20, hard_cap_extras: Infinity };
export const OVERFLOW_USUARIOS: OverflowRow = { tier1_per_unit: 15, tier2_per_unit: 50, hard_cap_extras: Infinity };

// ---------- Custom caps override ----------
// If org has custom_caps.<key> set, that wins over escala default.
export interface CustomCaps {
  camiones?: number;
  proyectos?: number;
  usuarios?: number;
  storage_gb?: number;
}

export interface EffectiveCaps {
  camiones: number;
  proyectos: number;
  usuarios: number;
  storage_gb: number;
  gps_dias: number;
}

export function getEffectiveCaps(escala: Escala, customCaps?: CustomCaps | null): EffectiveCaps {
  const base = ESCALA_LIMITS[escala];
  return {
    camiones:   customCaps?.camiones   ?? base.camiones,
    proyectos:  customCaps?.proyectos  ?? base.proyectos,
    usuarios:   customCaps?.usuarios   ?? base.usuarios,
    storage_gb: customCaps?.storage_gb ?? base.storage_gb,
    gps_dias:   base.gps_dias,
  };
}

// ---------- Overflow calc ----------
export interface OverflowCharge {
  extras: number;
  tier1_count: number;
  tier2_count: number;
  total_usd: number;
  hard_cap_reached: boolean;
}

function calcOverflowRow(extras: number, row: OverflowRow): OverflowCharge {
  if (extras <= 0) {
    return { extras: 0, tier1_count: 0, tier2_count: 0, total_usd: 0, hard_cap_reached: false };
  }
  const tier1 = Math.min(extras, 3);
  const tier2 = Math.max(extras - 3, 0);
  const total = tier1 * row.tier1_per_unit + tier2 * row.tier2_per_unit;
  return {
    extras,
    tier1_count: tier1,
    tier2_count: tier2,
    total_usd: total,
    hard_cap_reached: extras >= row.hard_cap_extras,
  };
}

export function calcOverflowCamiones(escala: Escala, current: number, cap: number): OverflowCharge {
  if (escala === "XXL") {
    return { extras: 0, tier1_count: 0, tier2_count: 0, total_usd: 0, hard_cap_reached: false };
  }
  const extras = Math.max(0, current - cap);
  return calcOverflowRow(extras, OVERFLOW_CAMIONES[escala]);
}

export function calcOverflowProyectos(current: number, cap: number): OverflowCharge {
  const extras = Math.max(0, current - cap);
  return calcOverflowRow(extras, OVERFLOW_PROYECTOS);
}

export function calcOverflowUsuarios(current: number, cap: number): OverflowCharge {
  const extras = Math.max(0, current - cap);
  return calcOverflowRow(extras, OVERFLOW_USUARIOS);
}

// ---------- Usage struct ----------
export interface UsageCounts {
  camiones: number;
  proyectos: number;
  usuarios: number;
  storage_bytes: number;
}

export interface UsageReport {
  caps: EffectiveCaps;
  counts: UsageCounts;
  pct: { camiones: number; proyectos: number; usuarios: number; storage: number };
  overflow: {
    camiones: OverflowCharge;
    proyectos: OverflowCharge;
    usuarios: OverflowCharge;
    storage_gb_extras: number; // storage no charge model defined yet, expose extras only
  };
  overflow_total_usd: number;
}

const BYTES_PER_GB = 1024 ** 3;

export function buildUsageReport(escala: Escala, customCaps: CustomCaps | null | undefined, counts: UsageCounts): UsageReport {
  const caps = getEffectiveCaps(escala, customCaps);
  const overflowCam = calcOverflowCamiones(escala, counts.camiones, caps.camiones);
  const overflowProy = calcOverflowProyectos(counts.proyectos, caps.proyectos);
  const overflowUsr = calcOverflowUsuarios(counts.usuarios, caps.usuarios);

  const storage_gb_used = counts.storage_bytes / BYTES_PER_GB;
  const storage_gb_extras = Math.max(0, storage_gb_used - caps.storage_gb);

  const pct = {
    camiones:  caps.camiones === Infinity  ? 0 : (counts.camiones / caps.camiones) * 100,
    proyectos: caps.proyectos === Infinity ? 0 : (counts.proyectos / caps.proyectos) * 100,
    usuarios:  caps.usuarios === Infinity  ? 0 : (counts.usuarios / caps.usuarios) * 100,
    storage:   caps.storage_gb === Infinity ? 0 : (storage_gb_used / caps.storage_gb) * 100,
  };

  return {
    caps,
    counts,
    pct,
    overflow: {
      camiones: overflowCam,
      proyectos: overflowProy,
      usuarios: overflowUsr,
      storage_gb_extras,
    },
    overflow_total_usd: overflowCam.total_usd + overflowProy.total_usd + overflowUsr.total_usd,
  };
}

// ---------- MRR calc ----------
// MRR = base escala + modulos + overflow, minus discount %.
export function calcMRR(
  escala: Escala,
  modulosUsdSum: number,
  overflowUsd: number,
  discountPct: number = 0
): number {
  const subtotal = ESCALA_LIMITS[escala].base_usd + modulosUsdSum + overflowUsd;
  const discount = Math.min(Math.max(discountPct, 0), 15) / 100;
  return Math.round(subtotal * (1 - discount));
}

// ---------- Upgrade delta lookup (for UpgradeCompare UI) ----------
export const UPGRADE_DELTAS: Array<{ from: Escala; to: Escala; delta_usd: number; delta_camiones: number }> = [
  { from: "S",  to: "M",   delta_usd: 900,  delta_camiones: 10 },
  { from: "M",  to: "L",   delta_usd: 1300, delta_camiones: 20 },
  { from: "L",  to: "XL",  delta_usd: 2000, delta_camiones: 65 },
  { from: "XL", to: "XXL", delta_usd: 4500, delta_camiones: Infinity },
];

export function nextEscala(escala: Escala): Escala | null {
  const idx = (["S", "M", "L", "XL", "XXL"] as Escala[]).indexOf(escala);
  return idx >= 0 && idx < 4 ? (["S", "M", "L", "XL", "XXL"][idx + 1] as Escala) : null;
}
