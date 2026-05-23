import type { BaseTemplateParams, RenderedDiagram } from '../types';

export interface FumigadoraParams extends BaseTemplateParams {
  tank_size_ratio: number;       // 0.32 - 0.45 — ancho del tanque fumigante
  nozzle_count: number;          // 3 - 7 boquillas de aspersión
  has_compressor: boolean;
  body_color: string;
  tank_color: string;
}

export const fumigadoraDefaults: FumigadoraParams = {
  view: 'top',
  color_primary: '#CDD6EC',
  color_secondary: '#A0AECC',
  tank_size_ratio: 0.40,
  nozzle_count: 5,
  has_compressor: true,
  body_color: '#E0E4EE',
  tank_color: '#D0ECCF',
};

export function renderFumigadora(params: Partial<FumigadoraParams> = {}): RenderedDiagram {
  const p = { ...fumigadoraDefaults, ...params };
  const W = 400, H = 180;

  const cabinX = W * 0.10;
  const cabinW = W * 0.23;
  const tankCenter = (cabinX + cabinW) + (W * p.tank_size_ratio / 2) + W * 0.005;
  const tankRx = W * p.tank_size_ratio / 2;
  const compressorX = tankCenter + tankRx + 6;
  const compressorW = p.has_compressor ? 40 : 0;
  const nozzleX = compressorX + compressorW + 6;
  const nozzleW = W - nozzleX - W * 0.03;

  // Posiciones de boquillas distribuidas verticalmente
  const nozzleYs: number[] = [];
  const nozzleStep = (H - 60) / (p.nozzle_count - 1);
  for (let i = 0; i < p.nozzle_count; i++) {
    nozzleYs.push(30 + i * nozzleStep);
  }

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ECEEF2"/>

  <!-- Llantas delanteras -->
  <rect x="8" y="20" width="28" height="48" rx="7" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="13" y="26" width="18" height="36" rx="4" fill="#3C3C3C"/>
  <rect x="8" y="112" width="28" height="48" rx="7" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="13" y="118" width="18" height="36" rx="4" fill="#3C3C3C"/>

  <!-- Llantas traseras dual -->
  <rect x="${compressorX - 56}" y="14" width="22" height="38" rx="5" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="${compressorX - 30}" y="14" width="22" height="38" rx="5" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="${compressorX - 56}" y="${H - 52}" width="22" height="38" rx="5" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="${compressorX - 30}" y="${H - 52}" width="22" height="38" rx="5" fill="#282828" stroke="#111" stroke-width="1.5"/>

  <!-- Cuerpo principal -->
  <rect x="36" y="26" width="${W - 36 - W * 0.06}" height="128" rx="10" fill="${p.body_color}" stroke="${p.color_secondary}" stroke-width="2"/>

  <!-- Zona 2: Cabina / Motor -->
  <rect x="${cabinX}" y="30" width="${cabinW}" height="120" rx="8" fill="${p.color_primary}" stroke="#8898BE" stroke-width="1.5"/>
  <rect x="${cabinX + 10}" y="43" width="${cabinW - 20}" height="32" rx="4" fill="#A4C4E8" stroke="#6688B8" stroke-width="1.2" opacity="0.9"/>
  <line x1="${cabinX + cabinW}" y1="30" x2="${cabinX + cabinW}" y2="150" stroke="#8898BE" stroke-width="1.5"/>
  <rect x="${cabinX + 6}" y="87" width="${cabinW - 12}" height="24" rx="3" fill="none" stroke="#B09058" stroke-width="1.2" stroke-dasharray="3,2"/>
  <text x="${cabinX + cabinW / 2}" y="102" text-anchor="middle" font-size="8" fill="#806038" font-family="Arial,sans-serif" font-weight="bold">MOTOR</text>

  <!-- Zona 3: Tanque fumigante -->
  <ellipse cx="${tankCenter}" cy="90" rx="${tankRx}" ry="48" fill="${p.tank_color}" stroke="#5A9852" stroke-width="2"/>
  <ellipse cx="${tankCenter}" cy="90" rx="${tankRx * 0.83}" ry="37" fill="#C0E4BC" stroke="#5A9852" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="${tankCenter}" y="86" text-anchor="middle" font-size="8.5" fill="#1E5818" font-family="Arial,sans-serif" font-weight="bold">TANQUE</text>
  <text x="${tankCenter}" y="97" text-anchor="middle" font-size="7.5" fill="#1E5818" font-family="Arial,sans-serif">FUMIGANTE</text>

  ${p.has_compressor ? `
  <!-- Zona 4: Bomba / Compresor -->
  <rect x="${compressorX}" y="40" width="${compressorW}" height="100" rx="5" fill="#EAD8F8" stroke="#9068C8" stroke-width="1.5"/>
  <rect x="${compressorX + 6}" y="50" width="${compressorW - 12}" height="22" rx="3" fill="#DCC0F0" stroke="#9068C8" stroke-width="1.2"/>
  <rect x="${compressorX + 6}" y="80" width="${compressorW - 12}" height="22" rx="3" fill="#DCC0F0" stroke="#9068C8" stroke-width="1.2"/>
  <circle cx="${compressorX + compressorW / 2}" cy="61" r="5" fill="#9068C8" opacity="0.6"/>
  <circle cx="${compressorX + compressorW / 2}" cy="91" r="5" fill="#9068C8" opacity="0.6"/>
  <text x="${compressorX + compressorW / 2}" y="116" text-anchor="middle" font-size="7" fill="#501890" font-family="Arial,sans-serif" font-weight="bold" transform="rotate(-90 ${compressorX + compressorW / 2} 116)">BOMBA</text>
  ` : ''}

  <!-- Zona 5: Boquillas / Aspersion -->
  <rect x="${nozzleX}" y="28" width="${nozzleW}" height="124" rx="5" fill="#D0E8F8" stroke="#6090C8" stroke-width="1.5"/>
  ${nozzleYs.map(y => `
  <circle cx="${nozzleX + nozzleW / 2}" cy="${y}" r="7" fill="#90C0F0" stroke="#5080B0" stroke-width="1.2"/>
  <line x1="${nozzleX + nozzleW / 2 + 7}" y1="${y}" x2="${nozzleX + nozzleW}" y2="${y}" stroke="#5080B0" stroke-width="1" stroke-dasharray="2,2"/>
  `).join('')}
</svg>`,
    width: W,
    height: H,
    template_name: 'fumigadora',
    params: p,
  };
}
