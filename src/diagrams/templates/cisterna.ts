import type { AxleConfig, BaseTemplateParams, RenderedDiagram } from '../types';

export interface CisternaParams extends BaseTemplateParams {
  tank_size_ratio: number;       // 0.45 - 0.60 — proporción del tanque
  axle_config: AxleConfig;
  has_pump_system: boolean;
  body_color: string;
  tank_color: string;
}

export const cisternaDefaults: CisternaParams = {
  view: 'top',
  color_primary: '#CDD6EC',
  color_secondary: '#A0AECC',
  tank_size_ratio: 0.52,
  axle_config: '8x4',
  has_pump_system: true,
  body_color: '#E0E4EE',
  tank_color: '#B8D4F8',
};

function rearAxles(cfg: AxleConfig): { tires_per_side: number } {
  switch (cfg) {
    case '4x2': return { tires_per_side: 1 };
    case '6x2':
    case '6x4': return { tires_per_side: 2 };
    case '8x4':
    case '8x6': return { tires_per_side: 4 };
    default: return { tires_per_side: 4 };
  }
}

export function renderCisterna(params: Partial<CisternaParams> = {}): RenderedDiagram {
  const p = { ...cisternaDefaults, ...params };
  const W = 400, H = 180;
  const rear = rearAxles(p.axle_config);

  const cabinX = W * 0.10;
  const cabinW = W * 0.19;
  const tankStart = cabinX + cabinW + W * 0.005;
  const tankW = W * p.tank_size_ratio;
  const pumpStart = tankStart + tankW + W * 0.005;
  const pumpW = p.has_pump_system ? W * 0.13 : 0;

  // Llantas traseras
  const tireW = 20, tireGap = 4;
  const totalRearTiresW = rear.tires_per_side * (tireW + tireGap) - tireGap;
  const rearStartX = tankStart + tankW - totalRearTiresW - 10;
  const rearTires: string[] = [];
  for (let i = 0; i < rear.tires_per_side; i++) {
    const x = rearStartX + i * (tireW + tireGap);
    rearTires.push(`<rect x="${x}" y="12" width="${tireW}" height="36" rx="4" fill="#282828" stroke="#111" stroke-width="1.5"/>`);
    rearTires.push(`<rect x="${x}" y="${H - 48}" width="${tireW}" height="36" rx="4" fill="#282828" stroke="#111" stroke-width="1.5"/>`);
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
  <rect x="36" y="26" width="${W - 36 - W * 0.06}" height="128" rx="10" fill="${p.body_color}" stroke="${p.color_secondary}" stroke-width="2"/>

  <!-- Zona 2: Cabina / Motor -->
  <rect x="${cabinX}" y="30" width="${cabinW}" height="120" rx="8" fill="${p.color_primary}" stroke="#8898BE" stroke-width="1.5"/>
  <rect x="${cabinX + 8}" y="44" width="${cabinW - 16}" height="28" rx="4" fill="#A4C4E8" stroke="#6688B8" stroke-width="1.2" opacity="0.9"/>
  <line x1="${cabinX + cabinW}" y1="30" x2="${cabinX + cabinW}" y2="150" stroke="#8898BE" stroke-width="1.5"/>
  <rect x="${cabinX + 4}" y="86" width="${cabinW - 8}" height="22" rx="3" fill="none" stroke="#B09058" stroke-width="1.2" stroke-dasharray="3,2"/>
  <text x="${cabinX + cabinW / 2}" y="100" text-anchor="middle" font-size="8" fill="#806038" font-family="Arial,sans-serif" font-weight="bold">MOTOR</text>

  <!-- Zona 3: Tanque / Cisterna (oval cilindrico) -->
  <rect x="${tankStart}" y="32" width="${tankW}" height="116" rx="58" fill="${p.tank_color}" stroke="#5070C8" stroke-width="2"/>
  <rect x="${tankStart + 12}" y="44" width="${tankW - 24}" height="92" rx="44" fill="#A8C8F4" stroke="#5070C8" stroke-width="1" stroke-dasharray="6,4"/>
  <text x="${tankStart + tankW / 2}" y="87" text-anchor="middle" font-size="9" fill="#182880" font-family="Arial,sans-serif" font-weight="bold">TANQUE</text>
  <text x="${tankStart + tankW / 2}" y="99" text-anchor="middle" font-size="8" fill="#182880" font-family="Arial,sans-serif">CISTERNA</text>
  <!-- Separadores internos del tanque -->
  <line x1="${tankStart + tankW * 0.25}" y1="44" x2="${tankStart + tankW * 0.25}" y2="136" stroke="#5070C8" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.4"/>
  <line x1="${tankStart + tankW * 0.50}" y1="34" x2="${tankStart + tankW * 0.50}" y2="146" stroke="#5070C8" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.4"/>
  <line x1="${tankStart + tankW * 0.75}" y1="44" x2="${tankStart + tankW * 0.75}" y2="136" stroke="#5070C8" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.4"/>

  ${p.has_pump_system ? `
  <!-- Zona 4: Sistema de bombeo -->
  <rect x="${pumpStart}" y="36" width="${pumpW}" height="108" rx="6" fill="#D8ECF8" stroke="#6898C8" stroke-width="1.5"/>
  <rect x="${pumpStart + 6}" y="46" width="${pumpW - 12}" height="26" rx="4" fill="#B8D4F0" stroke="#5080B8" stroke-width="1.5"/>
  <rect x="${pumpStart + 6}" y="80" width="${pumpW - 12}" height="18" rx="3" fill="#B8D4F0" stroke="#5080B8" stroke-width="1.2"/>
  <rect x="${pumpStart + 6}" y="106" width="${pumpW - 12}" height="18" rx="3" fill="#B8D4F0" stroke="#5080B8" stroke-width="1"/>
  <circle cx="${pumpStart + pumpW / 2}" cy="59" r="6" fill="#90C0EC" stroke="#4070B0" stroke-width="1.2"/>
  <circle cx="${pumpStart + pumpW / 2}" cy="89" r="4" fill="#90C0EC" stroke="#4070B0" stroke-width="1"/>
  <circle cx="${pumpStart + pumpW / 2}" cy="115" r="4" fill="#90C0EC" stroke="#4070B0" stroke-width="1"/>
  <text x="${pumpStart + pumpW / 2}" y="100" text-anchor="middle" font-size="6.5" fill="#183878" font-family="Arial,sans-serif" font-weight="bold" transform="rotate(-90 ${pumpStart + pumpW / 2} 100)">BOMBEO</text>
  ` : ''}
</svg>`,
    width: W,
    height: H,
    template_name: 'cisterna',
    params: p,
  };
}
