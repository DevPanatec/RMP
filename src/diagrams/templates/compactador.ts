import type { AxleConfig, BaseTemplateParams, CabinStyle, RenderedDiagram } from '../types';

export interface CompactadorParams extends BaseTemplateParams {
  wheelbase_ratio: number;      // 0.4 - 0.7 (corto a largo)
  axle_config: AxleConfig;
  cabin_style: CabinStyle;
  compactor_size_ratio: number; // 0.10 - 0.20 — ancho del compactador
  body_color: string;           // color del cuerpo principal
  compactor_color: string;      // color del compactador trasero
}

export const compactadorDefaults: CompactadorParams = {
  view: 'top',
  color_primary: '#CDD6EC',
  color_secondary: '#A0AECC',
  wheelbase_ratio: 0.55,
  axle_config: '6x4',
  cabin_style: 'conventional',
  compactor_size_ratio: 0.13,
  body_color: '#E0E4EE',
  compactor_color: '#ECD8C0',
};

// Devuelve el numero de llantas traseras por lado segun config.
function rearAxles(cfg: AxleConfig): { axles: number; tires_per_side: number } {
  switch (cfg) {
    case '4x2': return { axles: 1, tires_per_side: 1 };
    case '6x2':
    case '6x4': return { axles: 2, tires_per_side: 2 };
    case '8x4':
    case '8x6': return { axles: 3, tires_per_side: 3 };
    default: return { axles: 2, tires_per_side: 2 };
  }
}

export function renderCompactador(params: Partial<CompactadorParams> = {}): RenderedDiagram {
  const p = { ...compactadorDefaults, ...params };
  const W = 400, H = 180;
  const rear = rearAxles(p.axle_config);
  const cabinWidthPct = p.cabin_style === 'cab_over' ? 0.18 : 0.24;
  const wheelbaseStart = 0.10 + cabinWidthPct;
  const wheelbaseEnd = wheelbaseStart + p.wheelbase_ratio * 0.45;
  const compactorStart = 1 - p.compactor_size_ratio;

  // Coords absolutas
  const cabinX = W * 0.10;
  const cabinW = W * cabinWidthPct;
  const transStart = W * wheelbaseStart;
  const transEnd = W * (wheelbaseEnd - 0.05);
  const hidStart = transEnd;
  const hidEnd = W * compactorStart;
  const compStart = W * compactorStart;
  const compW = W - compStart - W * 0.03;

  // Llantas traseras: espaciadas en la zona compactador
  const rearTireW = 20;
  const rearTireGap = 4;
  const totalRearTires = rear.tires_per_side * (rearTireW + rearTireGap) - rearTireGap;
  const rearStartX = compStart - totalRearTires - 4;
  const rearTires: string[] = [];
  for (let i = 0; i < rear.tires_per_side; i++) {
    const x = rearStartX + i * (rearTireW + rearTireGap);
    // Arriba
    rearTires.push(`<rect x="${x}" y="13" width="${rearTireW}" height="37" rx="4" fill="#282828" stroke="#111" stroke-width="1.5"/>`);
    // Abajo
    rearTires.push(`<rect x="${x}" y="${H - 50}" width="${rearTireW}" height="37" rx="4" fill="#282828" stroke="#111" stroke-width="1.5"/>`);
  }

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ECEEF2"/>

  <!-- Llantas delanteras -->
  <rect x="8" y="20" width="28" height="48" rx="7" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="13" y="26" width="18" height="36" rx="4" fill="#3C3C3C"/>
  <rect x="8" y="112" width="28" height="48" rx="7" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="13" y="118" width="18" height="36" rx="4" fill="#3C3C3C"/>

  <!-- Llantas traseras (${rear.tires_per_side} por lado) -->
  ${rearTires.join('\n  ')}

  <!-- Cuerpo principal -->
  <rect x="36" y="28" width="${W - 36 - W * 0.06}" height="124" rx="10" fill="${p.body_color}" stroke="${p.color_secondary}" stroke-width="2"/>

  <!-- Zona 2: Cabina / Motor -->
  <rect x="${cabinX}" y="32" width="${cabinW}" height="116" rx="8" fill="${p.color_primary}" stroke="#8898BE" stroke-width="1.5"/>
  <rect x="${cabinX + 10}" y="44" width="${cabinW - 20}" height="32" rx="4" fill="#A4C4E8" stroke="#6688B8" stroke-width="1.2" opacity="0.9"/>
  <line x1="${cabinX + cabinW}" y1="32" x2="${cabinX + cabinW}" y2="148" stroke="#8898BE" stroke-width="1.5"/>
  <rect x="${cabinX + 6}" y="88" width="${cabinW - 12}" height="24" rx="3" fill="none" stroke="#B09058" stroke-width="1.2" stroke-dasharray="3,2"/>
  <text x="${cabinX + cabinW / 2}" y="103" text-anchor="middle" font-size="8" fill="#806038" font-family="Arial,sans-serif" font-weight="bold">MOTOR</text>

  <!-- Zona 3: Transmision -->
  <rect x="${transStart}" y="36" width="${transEnd - transStart}" height="108" rx="4" fill="#D4DCF0" stroke="#8896BC" stroke-width="1.2"/>
  <text x="${(transStart + transEnd) / 2}" y="88" text-anchor="middle" font-size="7.5" fill="#3848A0" font-family="Arial,sans-serif" font-weight="bold">TRANS-</text>
  <text x="${(transStart + transEnd) / 2}" y="99" text-anchor="middle" font-size="7.5" fill="#3848A0" font-family="Arial,sans-serif" font-weight="bold">MISION</text>

  <!-- Zona 4: Hidraulico -->
  <rect x="${hidStart}" y="32" width="${hidEnd - hidStart}" height="116" rx="4" fill="#D8DDF0" stroke="#8898C8" stroke-width="1.2"/>
  <text x="${(hidStart + hidEnd) / 2}" y="85" text-anchor="middle" font-size="7.5" fill="#2840A0" font-family="Arial,sans-serif" font-weight="bold">HID-</text>
  <text x="${(hidStart + hidEnd) / 2}" y="96" text-anchor="middle" font-size="7.5" fill="#2840A0" font-family="Arial,sans-serif" font-weight="bold">RAULICO</text>

  <!-- Zona 5: Compactador -->
  <rect x="${compStart}" y="32" width="${compW}" height="116" rx="6" fill="${p.compactor_color}" stroke="#B08860" stroke-width="1.5"/>
  <rect x="${compStart + 6}" y="44" width="${compW - 12}" height="92" rx="4" fill="#E4C8A8" stroke="#B08860" stroke-width="1"/>
  ${[55, 67, 79, 91, 103, 115, 127].map(y =>
    `<line x1="${compStart + 12}" y1="${y}" x2="${compStart + compW - 12}" y2="${y}" stroke="#A07848" stroke-width="1.5"/>`
  ).join('\n  ')}
  <text x="${compStart + compW / 2}" y="90" text-anchor="middle" font-size="6.5" fill="#704830" font-family="Arial,sans-serif" font-weight="bold" transform="rotate(-90 ${compStart + compW / 2} 90)">COMPACTADOR</text>
</svg>`,
    width: W,
    height: H,
    template_name: 'compactador',
    params: p,
  };
}
