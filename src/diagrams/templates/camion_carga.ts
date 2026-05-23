import type { AxleConfig, BaseTemplateParams, CabinStyle, RenderedDiagram } from '../types';

export type CargoBodyType = 'flatbed' | 'box' | 'dump' | 'stake' | 'tanker';

export interface CamionCargaParams extends BaseTemplateParams {
  cabin_style: CabinStyle;
  axle_config: AxleConfig;
  cargo_body_type: CargoBodyType;
  cargo_size_ratio: number;      // 0.45 - 0.65
  has_pto: boolean;               // power take-off (toma de fuerza)
  body_color: string;
  cargo_color: string;
}

export const camionCargaDefaults: CamionCargaParams = {
  view: 'top',
  color_primary: '#D4DCEC',
  color_secondary: '#90A0C0',
  cabin_style: 'conventional',
  axle_config: '6x4',
  cargo_body_type: 'box',
  cargo_size_ratio: 0.55,
  has_pto: false,
  body_color: '#E8ECF4',
  cargo_color: '#D8E2F0',
};

function rearAxlesCargo(cfg: AxleConfig): { tires_per_side: number } {
  switch (cfg) {
    case '4x2': return { tires_per_side: 1 };
    case '6x2':
    case '6x4': return { tires_per_side: 2 };
    case '8x4':
    case '8x6': return { tires_per_side: 3 };
    default: return { tires_per_side: 2 };
  }
}

export function renderCamionCarga(params: Partial<CamionCargaParams> = {}): RenderedDiagram {
  const p = { ...camionCargaDefaults, ...params };
  const W = 400, H = 180;
  const rear = rearAxlesCargo(p.axle_config);

  const cabinWidthPct = p.cabin_style === 'cab_over' ? 0.16 : 0.22;
  const cabinX = W * 0.10;
  const cabinW = W * cabinWidthPct;
  const cargoStart = cabinX + cabinW + W * 0.01;
  const cargoW = W * p.cargo_size_ratio;

  // Llantas traseras
  const tireW = 20, tireGap = 4;
  const totalRearW = rear.tires_per_side * (tireW + tireGap) - tireGap;
  const rearStartX = cargoStart + cargoW - totalRearW - 12;
  const rearTires: string[] = [];
  for (let i = 0; i < rear.tires_per_side; i++) {
    const x = rearStartX + i * (tireW + tireGap);
    rearTires.push(`<rect x="${x}" y="13" width="${tireW}" height="37" rx="4" fill="#282828" stroke="#111" stroke-width="1.5"/>`);
    rearTires.push(`<rect x="${x}" y="${H - 50}" width="${tireW}" height="37" rx="4" fill="#282828" stroke="#111" stroke-width="1.5"/>`);
  }

  // Cuerpo de carga según tipo
  let cargoSvg = '';
  switch (p.cargo_body_type) {
    case 'flatbed':
      cargoSvg = `
  <rect x="${cargoStart}" y="60" width="${cargoW}" height="60" rx="3" fill="${p.cargo_color}" stroke="${p.color_secondary}" stroke-width="2"/>
  <rect x="${cargoStart + 4}" y="64" width="${cargoW - 8}" height="52" rx="2" fill="none" stroke="${p.color_secondary}" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="${cargoStart + cargoW / 2}" y="93" text-anchor="middle" font-size="8" fill="#404870" font-family="Arial,sans-serif" font-weight="bold">PLATAFORMA</text>`;
      break;
    case 'dump':
      cargoSvg = `
  <rect x="${cargoStart}" y="34" width="${cargoW}" height="112" rx="4" fill="#E8D8C0" stroke="#A07840" stroke-width="2"/>
  <line x1="${cargoStart}" y1="44" x2="${cargoStart + cargoW}" y2="44" stroke="#A07840" stroke-width="1"/>
  <line x1="${cargoStart}" y1="${H - 44}" x2="${cargoStart + cargoW}" y2="${H - 44}" stroke="#A07840" stroke-width="1"/>
  <text x="${cargoStart + cargoW / 2}" y="92" text-anchor="middle" font-size="9" fill="#603810" font-family="Arial,sans-serif" font-weight="bold">VOLQUETE</text>
  <!-- Indicador hidráulico atrás -->
  <rect x="${cargoStart + cargoW - 14}" y="80" width="10" height="20" rx="2" fill="#C09850" stroke="#A07840" stroke-width="1"/>`;
      break;
    case 'stake':
      cargoSvg = `
  <rect x="${cargoStart}" y="40" width="${cargoW}" height="100" rx="3" fill="${p.cargo_color}" stroke="${p.color_secondary}" stroke-width="2"/>
  ${[44, 56, 68, 80, 92, 104, 116, 128].map(y =>
    `<line x1="${cargoStart + 4}" y1="${y}" x2="${cargoStart + cargoW - 4}" y2="${y}" stroke="${p.color_secondary}" stroke-width="0.6" opacity="0.6"/>`
  ).join('\n  ')}
  <text x="${cargoStart + cargoW / 2}" y="92" text-anchor="middle" font-size="8" fill="#404870" font-family="Arial,sans-serif" font-weight="bold">ESTACAS</text>`;
      break;
    case 'tanker':
      cargoSvg = `
  <ellipse cx="${cargoStart + cargoW / 2}" cy="90" rx="${cargoW / 2 - 4}" ry="55" fill="#C8D8E8" stroke="#506888" stroke-width="2"/>
  <ellipse cx="${cargoStart + cargoW / 2}" cy="90" rx="${cargoW / 2 - 14}" ry="45" fill="none" stroke="#506888" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.6"/>
  <text x="${cargoStart + cargoW / 2}" y="93" text-anchor="middle" font-size="8" fill="#203040" font-family="Arial,sans-serif" font-weight="bold">TANQUE</text>`;
      break;
    case 'box':
    default:
      cargoSvg = `
  <rect x="${cargoStart}" y="34" width="${cargoW}" height="112" rx="4" fill="${p.cargo_color}" stroke="${p.color_secondary}" stroke-width="2"/>
  <rect x="${cargoStart + 6}" y="42" width="${cargoW - 12}" height="96" rx="3" fill="none" stroke="${p.color_secondary}" stroke-width="0.8" stroke-dasharray="4,3"/>
  <line x1="${cargoStart + cargoW * 0.5}" y1="34" x2="${cargoStart + cargoW * 0.5}" y2="146" stroke="${p.color_secondary}" stroke-width="0.8" stroke-dasharray="3,2" opacity="0.5"/>
  <text x="${cargoStart + cargoW / 2}" y="92" text-anchor="middle" font-size="9" fill="#404870" font-family="Arial,sans-serif" font-weight="bold">CARGA</text>
  <!-- Puertas traseras -->
  <line x1="${cargoStart + cargoW - 4}" y1="50" x2="${cargoStart + cargoW - 4}" y2="130" stroke="${p.color_secondary}" stroke-width="2"/>
  <rect x="${cargoStart + cargoW - 8}" y="76" width="6" height="28" rx="1" fill="#90A0BC" stroke="#506880" stroke-width="0.8"/>`;
      break;
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
  <line x1="${cabinX + cabinW}" y1="30" x2="${cabinX + cabinW}" y2="150" stroke="${p.color_secondary}" stroke-width="1.5"/>
  <rect x="${cabinX + 4}" y="86" width="${cabinW - 8}" height="22" rx="3" fill="none" stroke="#B09058" stroke-width="1.2" stroke-dasharray="3,2"/>
  <text x="${cabinX + cabinW / 2}" y="100" text-anchor="middle" font-size="7" fill="#806038" font-family="Arial,sans-serif" font-weight="bold">MOTOR</text>

  ${p.has_pto ? `
  <!-- PTO (toma de fuerza) -->
  <rect x="${cabinX + cabinW - 4}" y="76" width="6" height="28" rx="1" fill="#806038" stroke="#604018" stroke-width="0.8"/>
  ` : ''}

  ${cargoSvg}
</svg>`,
    width: W,
    height: H,
    template_name: 'camion_carga',
    params: p,
  };
}
