-- ============================================
-- MÓDULO DE PROGRAMACIÓN - SCHEMA
-- ============================================

-- Agregar columnas faltantes a asignaciones_rutas
ALTER TABLE asignaciones_rutas 
ADD COLUMN IF NOT EXISTS dias_semana JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ayudantes JSONB DEFAULT '[]'::jsonb;

-- Comentarios en columnas
COMMENT ON COLUMN asignaciones_rutas.dias_semana IS 'Días de la semana en que se ejecuta la asignación';
COMMENT ON COLUMN asignaciones_rutas.ayudantes IS 'Lista de ayudantes asignados a la ruta';

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_asignaciones_rutas_dias_semana ON asignaciones_rutas USING GIN(dias_semana);
CREATE INDEX IF NOT EXISTS idx_asignaciones_rutas_ayudantes ON asignaciones_rutas USING GIN(ayudantes);
