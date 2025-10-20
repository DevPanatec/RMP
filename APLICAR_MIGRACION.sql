-- ============================================
-- MIGRACIÓN: Crear tabla resumen_rutas_completadas
-- ============================================
--
-- INSTRUCCIONES:
-- 1. Ve a https://supabase.com/dashboard
-- 2. Selecciona tu proyecto RMP
-- 3. Ve a SQL Editor (ícono de </> en el menú lateral)
-- 4. Copia y pega TODO este contenido
-- 5. Click en "Run" o presiona Ctrl+Enter
--
-- ============================================

-- Crear tabla para almacenar resúmenes de rutas completadas
CREATE TABLE IF NOT EXISTS resumen_rutas_completadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ruta_id INTEGER REFERENCES rutas(id) ON DELETE SET NULL,
  asignacion_id INTEGER REFERENCES asignaciones_rutas(id) ON DELETE SET NULL,
  conductor_nombre TEXT NOT NULL,
  conductor_id INTEGER,
  vehiculo_placa TEXT,
  vehiculo_id INTEGER,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_completacion TIMESTAMP WITH TIME ZONE NOT NULL,
  tiempo_total_segundos INTEGER NOT NULL,
  paradas_completadas JSONB NOT NULL DEFAULT '[]'::jsonb,
  reportes_riesgo_ids JSONB DEFAULT '[]'::jsonb,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios en las columnas
COMMENT ON TABLE resumen_rutas_completadas IS 'Almacena resúmenes detallados de rutas completadas por conductores';
COMMENT ON COLUMN resumen_rutas_completadas.ruta_id IS 'Referencia a la ruta base';
COMMENT ON COLUMN resumen_rutas_completadas.asignacion_id IS 'Referencia a la asignación específica';
COMMENT ON COLUMN resumen_rutas_completadas.conductor_nombre IS 'Nombre del conductor que completó la ruta';
COMMENT ON COLUMN resumen_rutas_completadas.fecha_inicio IS 'Fecha y hora de inicio de la ruta';
COMMENT ON COLUMN resumen_rutas_completadas.fecha_completacion IS 'Fecha y hora de completación total';
COMMENT ON COLUMN resumen_rutas_completadas.tiempo_total_segundos IS 'Tiempo total en ruta en segundos';
COMMENT ON COLUMN resumen_rutas_completadas.paradas_completadas IS 'Array JSONB con detalle de cada parada completada';
COMMENT ON COLUMN resumen_rutas_completadas.reportes_riesgo_ids IS 'Array de IDs de reportes de riesgo asociados a esta ruta';
COMMENT ON COLUMN resumen_rutas_completadas.observaciones IS 'Observaciones finales del conductor';

-- Índices para mejorar performance de búsquedas
CREATE INDEX IF NOT EXISTS idx_resumen_rutas_ruta_id ON resumen_rutas_completadas(ruta_id);
CREATE INDEX IF NOT EXISTS idx_resumen_rutas_conductor ON resumen_rutas_completadas(conductor_nombre);
CREATE INDEX IF NOT EXISTS idx_resumen_rutas_fecha_completacion ON resumen_rutas_completadas(fecha_completacion DESC);
CREATE INDEX IF NOT EXISTS idx_resumen_rutas_vehiculo ON resumen_rutas_completadas(vehiculo_placa);
CREATE INDEX IF NOT EXISTS idx_resumen_rutas_created_at ON resumen_rutas_completadas(created_at DESC);

-- Índices GIN para búsquedas en JSONB
CREATE INDEX IF NOT EXISTS idx_resumen_rutas_paradas ON resumen_rutas_completadas USING GIN(paradas_completadas);
CREATE INDEX IF NOT EXISTS idx_resumen_rutas_reportes ON resumen_rutas_completadas USING GIN(reportes_riesgo_ids);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_resumen_rutas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resumen_rutas_updated_at
  BEFORE UPDATE ON resumen_rutas_completadas
  FOR EACH ROW
  EXECUTE FUNCTION update_resumen_rutas_updated_at();

-- Row Level Security (RLS)
ALTER TABLE resumen_rutas_completadas ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir lectura a todos los usuarios autenticados
CREATE POLICY "Permitir lectura de resúmenes a usuarios autenticados"
  ON resumen_rutas_completadas
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Permitir inserción a todos los usuarios autenticados
CREATE POLICY "Permitir inserción de resúmenes a usuarios autenticados"
  ON resumen_rutas_completadas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON resumen_rutas_completadas TO authenticated;

-- Mensaje de confirmación
SELECT 'Migración aplicada exitosamente!' as resultado;
