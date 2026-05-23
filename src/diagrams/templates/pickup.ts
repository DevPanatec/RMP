import type { BaseTemplateParams, RenderedDiagram } from '../types';

export interface PickupParams extends BaseTemplateParams {
  has_4x4: boolean;
  has_double_cab: boolean;       // doble cabina vs simple
  bed_size_ratio: number;         // 0.30 - 0.45 — cama de carga
  has_toolbox: boolean;
  body_color: string;
}

export const pickupDefaults: PickupParams = {
  view: 'top',
  color_primary: '#D4DCEC',
  color_secondary: '#90A0C0',
  has_4x4: false,
  has_double_cab: true,
  bed_size_ratio: 0.38,
  has_toolbox: false,
  body_color: '#E8ECF4',
};

export function renderPickup(params: Partial<PickupParams> = {}): RenderedDiagram {
  const p = { ...pickupDefaults, ...params };
  const W = 400, H = 180;

  const cabinX = W * 0.18;
  const cabinW = p.has_double_cab ? W * 0.30 : W * 0.22;
  const bedStart = cabinX + cabinW + W * 0.01;
  const bedW = W * p.bed_size_ratio;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ECEEF2"/>

  <!-- Llantas delanteras -->
  <rect x="${cabinX - 18}" y="28" width="26" height="40" rx="6" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="${cabinX - 13}" y="34" width="16" height="28" rx="3" fill="#3C3C3C"/>
  <rect x="${cabinX - 18}" y="${H - 68}" width="26" height="40" rx="6" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="${cabinX - 13}" y="${H - 62}" width="16" height="28" rx="3" fill="#3C3C3C"/>

  <!-- Llantas traseras -->
  <rect x="${bedStart + bedW - 30}" y="28" width="26" height="40" rx="6" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="${bedStart + bedW - 25}" y="34" width="16" height="28" rx="3" fill="#3C3C3C"/>
  <rect x="${bedStart + bedW - 30}" y="${H - 68}" width="26" height="40" rx="6" fill="#282828" stroke="#111" stroke-width="1.5"/>
  <rect x="${bedStart + bedW - 25}" y="${H - 62}" width="16" height="28" rx="3" fill="#3C3C3C"/>

  ${p.has_4x4 ? `<text x="50" y="100" font-size="9" font-weight="bold" fill="#604030" font-family="Arial,sans-serif">4x4</text>` : ''}

  <!-- Capó / Motor (frontal) -->
  <rect x="${cabinX - 50}" y="50" width="50" height="80" rx="8" fill="${p.color_primary}" stroke="${p.color_secondary}" stroke-width="1.5"/>
  <rect x="${cabinX - 44}" y="62" width="38" height="56" rx="4" fill="none" stroke="#B09058" stroke-width="1.2" stroke-dasharray="3,2"/>
  <text x="${cabinX - 25}" y="93" text-anchor="middle" font-size="7" fill="#806038" font-family="Arial,sans-serif" font-weight="bold">MOTOR</text>

  <!-- Cabina -->
  <rect x="${cabinX}" y="36" width="${cabinW}" height="108" rx="10" fill="${p.color_primary}" stroke="${p.color_secondary}" stroke-width="1.5"/>
  <rect x="${cabinX + 10}" y="48" width="${cabinW - 20}" height="40" rx="4" fill="#A4C4E8" stroke="#6688B8" stroke-width="1.2" opacity="0.9"/>
  ${p.has_double_cab ? `<line x1="${cabinX + cabinW / 2}" y1="36" x2="${cabinX + cabinW / 2}" y2="144" stroke="${p.color_secondary}" stroke-width="1" stroke-dasharray="4,2" opacity="0.5"/>` : ''}
  <text x="${cabinX + cabinW / 2}" y="115" text-anchor="middle" font-size="8" fill="#404870" font-family="Arial,sans-serif" font-weight="bold">${p.has_double_cab ? 'CABINA DOBLE' : 'CABINA'}</text>

  <!-- Cama de carga -->
  <rect x="${bedStart}" y="32" width="${bedW}" height="116" rx="6" fill="${p.body_color}" stroke="${p.color_secondary}" stroke-width="2"/>
  <rect x="${bedStart + 8}" y="42" width="${bedW - 16}" height="96" rx="3" fill="none" stroke="${p.color_secondary}" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="${bedStart + bedW / 2}" y="90" text-anchor="middle" font-size="9" fill="#404870" font-family="Arial,sans-serif" font-weight="bold">CAMA DE CARGA</text>

  ${p.has_toolbox ? `
  <!-- Caja herramientas -->
  <rect x="${bedStart + 6}" y="44" width="${bedW - 12}" height="24" rx="2" fill="#C0C8DC" stroke="#80889C" stroke-width="1.2"/>
  <text x="${bedStart + bedW / 2}" y="60" text-anchor="middle" font-size="6.5" fill="#404870" font-family="Arial,sans-serif" font-weight="bold">TOOLBOX</text>
  ` : ''}
</svg>`,
    width: W,
    height: H,
    template_name: 'pickup',
    params: p,
  };
}
