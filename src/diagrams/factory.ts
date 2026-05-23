import { renderBarredora, barredoraDefaults } from './templates/barredora';
import { renderBus, busDefaults } from './templates/bus';
import { renderCamionCarga, camionCargaDefaults } from './templates/camion_carga';
import { renderCisterna, cisternaDefaults } from './templates/cisterna';
import { renderCompactador, compactadorDefaults } from './templates/compactador';
import { renderFumigadora, fumigadoraDefaults } from './templates/fumigadora';
import { renderPickup, pickupDefaults } from './templates/pickup';
import type { EquipmentClass, RenderedDiagram } from './types';

// Factory: selecciona el template apropiado segun equipment_class y aplica
// los param_overrides del KB. Los 7 equipment_class del schema RMP estan
// cubiertos por templates TS paramétricos (Plan v6 Fase B completa).

export function renderDiagram(
  equipment_class: EquipmentClass | string,
  param_overrides: any = {},
): RenderedDiagram | null {
  switch (equipment_class) {
    case 'compactador':
      return renderCompactador(param_overrides);
    case 'barredora':
      return renderBarredora(param_overrides);
    case 'fumigadora':
      return renderFumigadora(param_overrides);
    case 'cisterna':
      return renderCisterna(param_overrides);
    case 'pickup':
      return renderPickup(param_overrides);
    case 'bus':
      return renderBus(param_overrides);
    case 'camion_carga':
      return renderCamionCarga(param_overrides);
    default:
      return null;
  }
}

// Defaults expuestos por equipment_class para validacion + UI
export const templateDefaults = {
  compactador: compactadorDefaults,
  barredora: barredoraDefaults,
  fumigadora: fumigadoraDefaults,
  cisterna: cisternaDefaults,
  pickup: pickupDefaults,
  bus: busDefaults,
  camion_carga: camionCargaDefaults,
};

// Lista de templates TS implementados (los 7 — cobertura 100% del schema).
export const implementedTemplates: EquipmentClass[] = [
  'compactador',
  'barredora',
  'fumigadora',
  'cisterna',
  'pickup',
  'bus',
  'camion_carga',
];
