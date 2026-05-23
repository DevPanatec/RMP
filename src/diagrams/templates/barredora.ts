import type { BaseTemplateParams, RenderedDiagram } from '../types';

export interface BarredoraParams extends BaseTemplateParams {
  tank_size_ratio: number;      // 0.30 - 0.45 — tamaño del depósito de agua
  side_brushes: boolean;         // si tiene cepillos laterales
  main_brush_width_ratio: number; // 0.06 - 0.10
  body_color: string;
  tank_color: string;
  brush_color: string;
}

export const barredoraDefaults: BarredoraParams = {
  view: 'top',
  color_primary: '#CDD6EC',
  color_secondary: '#A0AECC',
  tank_size_ratio: 0.38,
  side_brushes: true,
  main_brush_width_ratio: 0.07,
  body_color: '#E0E4EE',
  tank_color: '#BAD0EC',
  brush_color: '#D0ECC8',
};

export function renderBarredora(params: Partial<BarredoraParams> = {}): RenderedDiagram {
  const p = { ...barredoraDefaults, ...params };
  const W = 400, H = 180;

  const cabinX = W * 0.10;
  const cabinW = W * 0.25;
  const tankStart = cabinX + cabinW + W * 0.015;
  const tankW = W * p.tank_size_ratio;
  const sideBrushX = tankStart + tankW + W * 0.005;
  const mainBrushStart = W * (1 - p.main_brush_width_ratio - 0.03);
  const mainBrushW = W * p.main_brush_width_ratio;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ECEEF2"/>

  <!-- Llantas delanteras -->
  <rect x="8" y="20" width="28" height="48" rx="7" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="13" y="26" width="18" height="36" rx="4" fill="#3C3C3C"/>
  <rect x="8" y="112" width="28" height="48" rx="7" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="13" y="118" width="18" height="36" rx="4" fill="#3C3C3C"/>

  <!-- Llantas traseras (dual axle) -->
  <rect x="${mainBrushStart - 56}" y="14" width="22" height="38" rx="5" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="${mainBrushStart - 30}" y="14" width="22" height="38" rx="5" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="${mainBrushStart - 56}" y="${H - 52}" width="22" height="38" rx="5" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="${mainBrushStart - 30}" y="${H - 52}" width="22" height="38" rx="5" fill="#282828" stroke="#111" stroke-width="1.5"/>

  <!-- Cuerpo principal -->
  <rect x="36" y="26" width="${W - 36 - W * 0.07}" height="128" rx="10" fill="${p.body_color}" stroke="${p.color_secondary}" stroke-width="2"/>

  <!-- Zona 2: Cabina / Motor -->
  <rect x="${cabinX}" y="30" width="${cabinW}" height="120" rx="8" fill="${p.color_primary}" stroke="#8898BE" stroke-width="1.5"/>
  <rect x="${cabinX + 11}" y="43" width="${cabinW - 24}" height="33" rx="5" fill="#A4C4E8" stroke="#6688B8" stroke-width="1.2" opacity="0.9"/>
  <line x1="${cabinX + cabinW}" y1="30" x2="${cabinX + cabinW}" y2="150" stroke="#8898BE" stroke-width="1.5"/>
  <rect x="${cabinX + 7}" y="88" width="${cabinW - 14}" height="26" rx="3" fill="none" stroke="#B09058" stroke-width="1.2" stroke-dasharray="3,2"/>
  <text x="${cabinX + cabinW / 2}" y="104" text-anchor="middle" font-size="8" fill="#806038" font-family="Arial,sans-serif" font-weight="bold">MOTOR</text>

  <!-- Zona 3: Depósito de agua -->
  <rect x="${tankStart}" y="34" width="${tankW}" height="112" rx="5" fill="#D8E2EE" stroke="#96A6BE" stroke-width="1.2"/>
  <ellipse cx="${tankStart + tankW / 2}" cy="90" rx="${tankW * 0.36}" ry="37" fill="${p.tank_color}" stroke="#6080BC" stroke-width="1.5"/>
  <text x="${tankStart + tankW / 2}" y="86" text-anchor="middle" font-size="8" fill="#204880" font-family="Arial,sans-serif" font-weight="bold">DEPOSITO</text>
  <text x="${tankStart + tankW / 2}" y="97" text-anchor="middle" font-size="7.5" fill="#204880" font-family="Arial,sans-serif">DE AGUA</text>

  ${p.side_brushes ? `
  <!-- Zona 4: Cepillos laterales -->
  <circle cx="${sideBrushX + 18}" cy="50" r="22" fill="${p.brush_color}" stroke="#60A050" stroke-width="1.5"/>
  <circle cx="${sideBrushX + 18}" cy="50" r="14" fill="#BCE8B4" stroke="#60A050" stroke-width="1" stroke-dasharray="3,2"/>
  <circle cx="${sideBrushX + 18}" cy="50" r="4" fill="#60A050"/>
  <text x="${sideBrushX + 18}" y="48" text-anchor="middle" font-size="6.5" fill="#285020" font-family="Arial,sans-serif" font-weight="bold">CEP</text>
  <text x="${sideBrushX + 18}" y="57" text-anchor="middle" font-size="6.5" fill="#285020" font-family="Arial,sans-serif">LAT</text>
  <circle cx="${sideBrushX + 18}" cy="130" r="22" fill="${p.brush_color}" stroke="#60A050" stroke-width="1.5"/>
  <circle cx="${sideBrushX + 18}" cy="130" r="14" fill="#BCE8B4" stroke="#60A050" stroke-width="1" stroke-dasharray="3,2"/>
  <circle cx="${sideBrushX + 18}" cy="130" r="4" fill="#60A050"/>
  <text x="${sideBrushX + 18}" y="128" text-anchor="middle" font-size="6.5" fill="#285020" font-family="Arial,sans-serif" font-weight="bold">CEP</text>
  <text x="${sideBrushX + 18}" y="137" text-anchor="middle" font-size="6.5" fill="#285020" font-family="Arial,sans-serif">LAT</text>
  ` : ''}

  <!-- Zona 5: Cepillo principal -->
  <rect x="${mainBrushStart}" y="30" width="${mainBrushW}" height="120" rx="5" fill="#C0E8B8" stroke="#50A040" stroke-width="1.5"/>
  ${[44, 54, 64, 74, 84, 94, 104, 114, 124].map(y =>
    `<line x1="${mainBrushStart + 4}" y1="${y}" x2="${mainBrushStart + mainBrushW - 4}" y2="${y}" stroke="#50A040" stroke-width="1" opacity="0.7"/>`
  ).join('\n  ')}
  <text x="${mainBrushStart + mainBrushW / 2}" y="100" text-anchor="middle" font-size="6.5" fill="#1E5018" font-family="Arial,sans-serif" font-weight="bold" transform="rotate(-90 ${mainBrushStart + mainBrushW / 2} 90)">C.PRINCIPAL</text>
</svg>`,
    width: W,
    height: H,
    template_name: 'barredora',
    params: p,
  };
}
