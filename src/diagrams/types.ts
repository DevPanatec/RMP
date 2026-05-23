// Tipos compartidos para el Motor de Diagramas v2 (Plan v6)
// Templates SVG paramétricos generados por código, sin ilustrador.

export type EquipmentClass =
  | 'barredora'
  | 'compactador'
  | 'fumigadora'
  | 'cisterna'
  | 'pickup'
  | 'bus'
  | 'camion_carga';

export type AxleConfig = '4x2' | '6x4' | '6x2' | '8x4' | '8x6';
export type CabinStyle = 'conventional' | 'cab_over';
export type DiagramView = 'top' | 'side';

export interface BaseTemplateParams {
  view: DiagramView;
  color_primary: string;     // hex color principal de la cabina/cuerpo
  color_secondary: string;   // hex secundario
}

export interface RenderedDiagram {
  svg: string;               // SVG string completo
  width: number;
  height: number;
  template_name: EquipmentClass;
  params: any;
}

export interface ParamValidationResult {
  valid: boolean;
  errors?: string[];
}
