import type { AxleConfig, BaseTemplateParams, RenderedDiagram } from '../types';

export interface BusParams extends BaseTemplateParams {
  length_ratio: number;          // 0.85 - 1.0 — longitud (bus largo, urbano, mini)
  axle_config: AxleConfig;
  door_count: number;            // 1, 2 o 3 puertas
  has_articulated: boolean;      // bus articulado (acordeón)
  body_color: string;
  window_color: string;
}

export const busDefaults: BusParams = {
  view: 'top',
  color_primary: '#D8E0EC',
  color_secondary: '#90A0BC',
  length_ratio: 0.92,
  axle_config: '6x4',
  door_count: 2,
  has_articulated: false,
  body_color: '#E8ECF4',
  window_color: '#A4C4E8',
};

function rearAxlesBus(cfg: AxleConfig): { tires_per_side: number } {
  switch (cfg) {
    case '4x2': return { tires_per_side: 1 };
    case '6x2':
    case '6x4': return { tires_per_side: 2 };
    case '8x4':
    case '8x6': return { tires_per_side: 3 };
    default: return { tires_per_side: 2 };
  }
}

export function renderBus(params: Partial<BusParams> = {}): RenderedDiagram {
  const p = { ...busDefaults, ...params };
  const W = 400, H = 180;
  const rear = rearAxlesBus(p.axle_config);

  const bodyStart = W * 0.04;
  const bodyW = W * p.length_ratio - W * 0.06;
  const motorEnd = bodyStart + bodyW * 0.12;
  const cabinEnd = bodyStart + bodyW * 0.22;

  // Ventanas a lo largo del bus (lateral)
  const windowCount = Math.floor(bodyW / 28);
  const windows: string[] = [];
  for (let i = 0; i < windowCount; i++) {
    const wx = cabinEnd + 8 + i * 28;
    if (wx + 22 > bodyStart + bodyW - 10) break;
    windows.push(`<rect x="${wx}" y="40" width="22" height="20" rx="2" fill="${p.window_color}" stroke="#6688B8" stroke-width="0.8" opacity="0.85"/>`);
    windows.push(`<rect x="${wx}" y="${H - 60}" width="22" height="20" rx="2" fill="${p.window_color}" stroke="#6688B8" stroke-width="0.8" opacity="0.85"/>`);
  }

  // Puertas distribuidas en lado derecho del bus (en vista top, parte inferior)
  const doors: string[] = [];
  const doorSpacing = bodyW / (p.door_count + 1);
  for (let i = 1; i <= p.door_count; i++) {
    const dx = bodyStart + doorSpacing * i;
    doors.push(`<rect x="${dx - 6}" y="${H - 18}" width="12" height="14" rx="2" fill="#90B8E0" stroke="#5070A0" stroke-width="1.5"/>`);
    doors.push(`<text x="${dx}" y="${H - 22}" text-anchor="middle" font-size="6" fill="#5070A0" font-family="Arial,sans-serif">P${i}</text>`);
  }

  // Llantas
  const rearTireW = 18, tireGap = 4;
  const totalRearW = rear.tires_per_side * (rearTireW + tireGap) - tireGap;
  const rearStartX = bodyStart + bodyW - totalRearW - 14;
  const rearTires: string[] = [];
  for (let i = 0; i < rear.tires_per_side; i++) {
    const x = rearStartX + i * (rearTireW + tireGap);
    rearTires.push(`<rect x="${x}" y="14" width="${rearTireW}" height="32" rx="4" fill="#282828" stroke="#111" stroke-width="1.2"/>`);
    rearTires.push(`<rect x="${x}" y="${H - 46}" width="${rearTireW}" height="32" rx="4" fill="#282828" stroke="#111" stroke-width="1.2"/>`);
  }

  const articulatedJoint = p.has_articulated ? `
  <!-- Articulación -->
  <line x1="${bodyStart + bodyW * 0.5}" y1="32" x2="${bodyStart + bodyW * 0.5}" y2="148" stroke="${p.color_secondary}" stroke-width="3"/>
  <line x1="${bodyStart + bodyW * 0.5 - 4}" y1="32" x2="${bodyStart + bodyW * 0.5 - 4}" y2="148" stroke="${p.color_secondary}" stroke-width="1.5" stroke-dasharray="2,2"/>
  <line x1="${bodyStart + bodyW * 0.5 + 4}" y1="32" x2="${bodyStart + bodyW * 0.5 + 4}" y2="148" stroke="${p.color_secondary}" stroke-width="1.5" stroke-dasharray="2,2"/>
  ` : '';

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ECEEF2"/>

  <!-- Llantas delanteras -->
  <rect x="${bodyStart + 10}" y="14" width="${rearTireW}" height="32" rx="4" fill="#282828" stroke="#111" stroke-width="1.2"/>
  <rect x="${bodyStart + 10}" y="${H - 46}" width="${rearTireW}" height="32" rx="4" fill="#282828" stroke="#111" stroke-width="1.2"/>

  <!-- Llantas traseras (${rear.tires_per_side} por lado) -->
  ${rearTires.join('\n  ')}

  <!-- Cuerpo principal del bus (forma redondeada) -->
  <rect x="${bodyStart}" y="30" width="${bodyW}" height="120" rx="12" fill="${p.body_color}" stroke="${p.color_secondary}" stroke-width="2"/>

  <!-- Motor (frente del bus) -->
  <rect x="${bodyStart + 4}" y="38" width="${motorEnd - bodyStart - 4}" height="104" rx="6" fill="${p.color_primary}" stroke="${p.color_secondary}" stroke-width="1.5"/>
  <rect x="${bodyStart + 10}" y="74" width="${motorEnd - bodyStart - 16}" height="32" rx="3" fill="none" stroke="#B09058" stroke-width="1.2" stroke-dasharray="3,2"/>
  <text x="${(bodyStart + motorEnd) / 2}" y="93" text-anchor="middle" font-size="6.5" fill="#806038" font-family="Arial,sans-serif" font-weight="bold">MOTOR</text>

  <!-- Cabina del chofer -->
  <rect x="${motorEnd}" y="36" width="${cabinEnd - motorEnd}" height="108" rx="4" fill="${p.color_primary}" stroke="${p.color_secondary}" stroke-width="1.5"/>
  <rect x="${motorEnd + 4}" y="48" width="${cabinEnd - motorEnd - 8}" height="22" rx="2" fill="${p.window_color}" stroke="#6688B8" stroke-width="0.8" opacity="0.9"/>
  <circle cx="${motorEnd + 8}" cy="120" r="3" fill="#404870"/>

  <!-- Cabina de pasajeros -->
  <rect x="${cabinEnd}" y="34" width="${bodyStart + bodyW - cabinEnd - 4}" height="112" rx="4" fill="${p.body_color}" stroke="${p.color_secondary}" stroke-width="1"/>

  <!-- Ventanas pasajeros -->
  ${windows.join('\n  ')}

  <!-- Asientos (filas) -->
  ${[80, 92, 104].map(y =>
    `<line x1="${cabinEnd + 10}" y1="${y}" x2="${bodyStart + bodyW - 14}" y2="${y}" stroke="${p.color_secondary}" stroke-width="0.5" stroke-dasharray="2,3" opacity="0.6"/>`
  ).join('\n  ')}

  <!-- Puertas -->
  ${doors.join('\n  ')}

  ${articulatedJoint}

  <text x="${(cabinEnd + bodyStart + bodyW) / 2}" y="92" text-anchor="middle" font-size="9" fill="#404870" font-family="Arial,sans-serif" font-weight="bold" opacity="0.5">PASAJEROS</text>
</svg>`,
    width: W,
    height: H,
    template_name: 'bus',
    params: p,
  };
}
